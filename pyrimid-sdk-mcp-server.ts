/**
 * Pyrimid MCP Server — All products as callable paid tools
 * 
 * This is the canonical storefront for the Pyrimid network.
 * Every product from every vendor is exposed as an MCP tool that agents
 * can discover and call. Payment happens inline via x402.
 * 
 * Agents using Claude, Cursor, Windsurf, or any AI SDK-powered app
 * can connect to this server and instantly access the entire catalog.
 * 
 * Three modes:
 * 1. Official server (default affiliate → treasury)
 * 2. Custom affiliate server (your affiliate ID → your wallet)
 * 3. Embedded in agent frameworks (developer's affiliate ID)
 * 
 * PROPRIETARY — @pyrimid/sdk
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

interface PyrimidMcpConfig {
  affiliateId?: string;       // Default: treasury. Set to your ID to earn.
  catalogUrl?: string;
  serverName?: string;
  refreshIntervalMs?: number;
}

interface CatalogProduct {
  vendor_id: string;
  vendor_name: string;
  vendor_erc8004: boolean;
  product_id: string;
  description: string;
  category: string;
  tags: string[];
  price_usdc: number;
  price_display: string;
  affiliate_bps: number;
  endpoint: string;
  method: string;
  output_schema: object;
  monthly_volume: number;
}

export function createPyrimidMcpServer(config: PyrimidMcpConfig = {}) {
  const {
    affiliateId = 'af_treasury',
    catalogUrl = 'https://api.pyrimid.ai/v1/catalog',
    serverName = 'pyrimid-catalog',
    refreshIntervalMs = 5 * 60 * 1000,
  } = config;

  const server = new McpServer({
    name: serverName,
    version: '0.1.0',
  });

  let cachedProducts: CatalogProduct[] = [];
  let lastFetch = 0;

  async function refreshCatalog() {
    if (Date.now() - lastFetch < refreshIntervalMs && cachedProducts.length > 0) {
      return cachedProducts;
    }
    try {
      const res = await fetch(catalogUrl);
      const data = await res.json();
      cachedProducts = data.products;
      lastFetch = Date.now();
    } catch (e) {
      console.error('Catalog refresh failed:', e);
    }
    return cachedProducts;
  }

  // ═══════════════════════════════════════════════════════════
  //                     DISCOVERY TOOLS
  // ═══════════════════════════════════════════════════════════

  /**
   * Browse the catalog — agents use this to find products by need
   */
  server.tool(
    'pyrimid_browse',
    'Search the Pyrimid product catalog. Returns products matching your query, sorted by relevance and trust (ERC-8004 verified vendors first). Use this to find APIs, data feeds, trading signals, AI tools, and any digital service available on the network.',
    {
      query: z.string().describe('What you need, e.g. "btc trading signals" or "image generation" or "stock price data"'),
      max_results: z.number().optional().default(5).describe('Maximum results to return'),
      max_price_usd: z.number().optional().default(10).describe('Maximum price per call in USD'),
      verified_only: z.boolean().optional().default(false).describe('Only show ERC-8004 verified vendors'),
    },
    async ({ query, max_results, max_price_usd, verified_only }) => {
      const products = await refreshCatalog();
      const keywords = query.toLowerCase().split(/\s+/);
      const maxPriceAtomic = max_price_usd * 1_000_000;

      const results = products
        .filter(p => p.price_usdc <= maxPriceAtomic)
        .filter(p => !verified_only || p.vendor_erc8004)
        .map(p => {
          const searchable = `${p.description} ${p.tags.join(' ')} ${p.category} ${p.vendor_name}`.toLowerCase();
          let score = 0;
          for (const kw of keywords) {
            if (searchable.includes(kw)) score += 10;
          }
          if (p.vendor_erc8004) score += 5;
          score += Math.min(p.monthly_volume / 1000, 5);
          return { product: p, score };
        })
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, max_results);

      if (results.length === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: `No products found matching "${query}". Try broader terms or increase max_price_usd.`
          }]
        };
      }

      const formatted = results.map((r, i) => {
        const p = r.product;
        const verified = p.vendor_erc8004 ? ' [ERC-8004 VERIFIED]' : '';
        return [
          `${i + 1}. ${p.vendor_name} — ${p.product_id}${verified}`,
          `   ${p.description}`,
          `   Price: ${p.price_display} | Commission: ${p.affiliate_bps / 100}% | Volume: ${p.monthly_volume}/mo`,
          `   → Use pyrimid_buy with vendor_id="${p.vendor_id}" product_id="${p.product_id}" to purchase`,
        ].join('\n');
      }).join('\n\n');

      return {
        content: [{
          type: 'text' as const,
          text: `Found ${results.length} products:\n\n${formatted}`
        }]
      };
    }
  );

  /**
   * List categories — agents use this to explore what's available
   */
  server.tool(
    'pyrimid_categories',
    'List all product categories available on the Pyrimid network with product counts.',
    {},
    async () => {
      const products = await refreshCatalog();
      const categories: Record<string, { count: number; verified: number; minPrice: string; maxPrice: string }> = {};

      for (const p of products) {
        if (!categories[p.category]) {
          categories[p.category] = { count: 0, verified: 0, minPrice: p.price_display, maxPrice: p.price_display };
        }
        categories[p.category].count++;
        if (p.vendor_erc8004) categories[p.category].verified++;
      }

      const formatted = Object.entries(categories)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([cat, info]) => `• ${cat}: ${info.count} products (${info.verified} verified)`)
        .join('\n');

      return {
        content: [{
          type: 'text' as const,
          text: `Pyrimid Catalog — ${products.length} products across ${Object.keys(categories).length} categories:\n\n${formatted}\n\nUse pyrimid_browse with a query to find specific products.`
        }]
      };
    }
  );

  // ═══════════════════════════════════════════════════════════
  //                     PURCHASE TOOLS
  // ═══════════════════════════════════════════════════════════

  /**
   * Buy a product — executes x402 payment and returns the product data
   */
  server.tool(
    'pyrimid_buy',
    'Purchase a product from the Pyrimid network. Pays via x402 (USDC on Base) and returns the product data. Use pyrimid_browse first to find the vendor_id and product_id.',
    {
      vendor_id: z.string().describe('Vendor ID from browse results'),
      product_id: z.string().describe('Product ID from browse results'),
    },
    async ({ vendor_id, product_id }) => {
      const products = await refreshCatalog();
      const product = products.find(
        p => p.vendor_id === vendor_id && p.product_id === product_id
      );

      if (!product) {
        return {
          content: [{
            type: 'text' as const,
            text: `Product not found: ${vendor_id}/${product_id}. Use pyrimid_browse to find available products.`
          }]
        };
      }

      try {
        // Execute x402 payment with affiliate attribution
        const response = await fetch(product.endpoint, {
          method: product.method,
          headers: {
            'X-Affiliate-ID': affiliateId,
            // x402 payment headers handled by the transport layer
          }
        });

        if (response.status === 402) {
          // Return payment requirements for the client to fulfill
          const paymentRequired = response.headers.get('X-PAYMENT-REQUIRED');
          return {
            content: [{
              type: 'text' as const,
              text: `Payment required: ${product.price_display} USDC on Base.\nPayment details: ${paymentRequired}\nThe x402 client will handle payment automatically on retry.`
            }]
          };
        }

        if (!response.ok) {
          return {
            content: [{
              type: 'text' as const,
              text: `Purchase failed: HTTP ${response.status}`
            }]
          };
        }

        const data = await response.json();
        return {
          content: [{
            type: 'text' as const,
            text: `Purchase successful — ${product.vendor_name} / ${product.product_id}\nPaid: ${product.price_display}\n\nData:\n${JSON.stringify(data, null, 2)}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Purchase error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  /**
   * Preview a purchase — shows the payment split without buying
   */
  server.tool(
    'pyrimid_preview',
    'Preview the payment split for a product purchase without buying. Shows how much goes to the vendor, affiliate, and protocol.',
    {
      vendor_id: z.string().describe('Vendor ID'),
      product_id: z.string().describe('Product ID'),
    },
    async ({ vendor_id, product_id }) => {
      const products = await refreshCatalog();
      const product = products.find(
        p => p.vendor_id === vendor_id && p.product_id === product_id
      );

      if (!product) {
        return {
          content: [{
            type: 'text' as const,
            text: `Product not found: ${vendor_id}/${product_id}`
          }]
        };
      }

      const total = product.price_usdc;
      const platformFee = Math.floor(total / 100);
      const remaining = total - platformFee;
      const affiliateCut = Math.floor((remaining * product.affiliate_bps) / 10000);
      const vendorCut = remaining - affiliateCut;

      return {
        content: [{
          type: 'text' as const,
          text: [
            `Payment split for ${product.vendor_name} / ${product.product_id}:`,
            `  Total:     $${(total / 1_000_000).toFixed(4)}`,
            `  Protocol:  $${(platformFee / 1_000_000).toFixed(4)} (1%)`,
            `  Affiliate: $${(affiliateCut / 1_000_000).toFixed(4)} (${product.affiliate_bps / 100}%)`,
            `  Vendor:    $${(vendorCut / 1_000_000).toFixed(4)} (${((vendorCut / total) * 100).toFixed(1)}%)`,
          ].join('\n')
        }]
      };
    }
  );

  // ═══════════════════════════════════════════════════════════
  //                   AFFILIATE TOOLS
  // ═══════════════════════════════════════════════════════════

  /**
   * Register as an affiliate — for agents that want to earn
   */
  server.tool(
    'pyrimid_register_affiliate',
    'Register as a Pyrimid affiliate agent. Free, permissionless. Earn commissions by helping other agents discover products. Returns your affiliate ID.',
    {
      wallet_address: z.string().describe('Your Base wallet address for receiving USDC commissions'),
      referrer_id: z.string().optional().describe('Affiliate ID of who referred you (optional, earns them a $5 bonus on your first sale)'),
    },
    async ({ wallet_address, referrer_id }) => {
      // This would call the PyrimidRegistry contract
      return {
        content: [{
          type: 'text' as const,
          text: `To register as an affiliate, call PyrimidRegistry.registerAffiliate() on Base:\n\nContract: 0x...\nFunction: ${referrer_id ? `registerAffiliateWithReferral("${referrer_id}")` : 'registerAffiliate()'}\nFrom: ${wallet_address}\nCost: Free (gas only, ~$0.01 on Base)\n\nAfter registration, use your affiliate ID with the @pyrimid/sdk to start earning commissions on product sales.`
        }]
      };
    }
  );

  return server;
}

// ═══════════════════════════════════════════════════════════
//              QUICK START: THREE DEPLOYMENT MODES
// ═══════════════════════════════════════════════════════════

/**
 * Mode 1: Official Pyrimid server (treasury affiliate)
 * 
 *   const server = createPyrimidMcpServer();
 * 
 * Mode 2: Custom affiliate server (your earnings)
 * 
 *   const server = createPyrimidMcpServer({
 *     affiliateId: 'af_your_id',
 *     serverName: 'my-pyrimid-recommender',
 *   });
 * 
 * Mode 3: Specialized recommender (curated subset)
 * 
 *   const server = createPyrimidMcpServer({
 *     affiliateId: 'af_your_id',
 *     serverName: 'trading-signals-recommender',
 *   });
 *   // Then add custom tools that filter/curate the catalog
 */
