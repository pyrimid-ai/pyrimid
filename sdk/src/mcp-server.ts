/**
 * Pyrimid MCP Server — All products as callable paid tools
 *
 * The canonical storefront for the Pyrimid network. Every product from
 * every vendor is exposed as an MCP tool that agents can discover and call.
 * Payment happens inline via x402.
 *
 * Three modes:
 *   1. Official server  (default affiliate → treasury)
 *   2. Custom affiliate (your affiliate ID → your wallet)
 *   3. Specialized recommender (curated vertical subset)
 *
 * PROPRIETARY — @pyrimid/sdk
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { PyrimidProduct, McpServerConfig } from './types.js';
import { calculateSplit } from './middleware.js';

export function createPyrimidMcpServer(config: McpServerConfig = {}) {
  const {
    affiliateId = 'af_treasury',
    catalogUrl = 'https://pyrimid.ai/api/v1/catalog',
    serverName = 'pyrimid-catalog',
    refreshIntervalMs = 5 * 60 * 1000,
  } = config;

  const server = new McpServer({
    name: serverName,
    version: '0.1.0',
  });

  let cachedProducts: PyrimidProduct[] = [];
  let lastFetch = 0;

  async function refreshCatalog() {
    if (Date.now() - lastFetch < refreshIntervalMs && cachedProducts.length > 0) {
      return cachedProducts;
    }
    try {
      const allProducts: PyrimidProduct[] = [];
      let offset = 0;
      const limit = 100;

      while (true) {
        const sep = catalogUrl.includes('?') ? '&' : '?';
        const url = `${catalogUrl}${sep}limit=${limit}&offset=${offset}`;
        const res = await fetch(url);
        const data = await res.json();
        allProducts.push(...data.products);
        if (allProducts.length >= data.total || data.products.length < limit) break;
        offset += limit;
      }

      cachedProducts = allProducts;
      lastFetch = Date.now();
    } catch (e) {
      console.error('[pyrimid] Catalog refresh failed:', e);
    }
    return cachedProducts;
  }

  // ═══════════════════════════════════════════════════════════
  //                     DISCOVERY TOOLS
  // ═══════════════════════════════════════════════════════════

  server.tool(
    'pyrimid_browse',
    'Search the Pyrimid product catalog. Returns products matching your query, sorted by relevance and trust (ERC-8004 verified vendors first). Use this to find APIs, data feeds, trading signals, AI tools, and any digital service available on the network.',
    {
      query: z.string().describe('What you need, e.g. "btc trading signals" or "image generation"'),
      max_results: z.number().optional().default(5).describe('Maximum results to return'),
      max_price_usd: z.number().optional().default(10).describe('Max price per call in USD'),
      verified_only: z.boolean().optional().default(false).describe('Only ERC-8004 verified vendors'),
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
          content: [{ type: 'text' as const, text: `No products found matching "${query}". Try broader terms or increase max_price_usd.` }],
        };
      }

      const formatted = results.map((r, i) => {
        const p = r.product;
        const verified = p.vendor_erc8004 ? ' [ERC-8004 VERIFIED]' : '';
        return [
          `${i + 1}. ${p.vendor_name} — ${p.product_id}${verified}`,
          `   ${p.description}`,
          `   Price: ${p.price_display} | Commission: ${p.affiliate_bps / 100}% | Volume: ${p.monthly_volume}/mo`,
          `   → Use pyrimid_buy with vendor_id="${p.vendor_id}" product_id="${p.product_id}"`,
        ].join('\n');
      }).join('\n\n');

      return { content: [{ type: 'text' as const, text: `Found ${results.length} products:\n\n${formatted}` }] };
    }
  );

  server.tool(
    'pyrimid_categories',
    'List all product categories available on the Pyrimid network with product counts.',
    {},
    async () => {
      const products = await refreshCatalog();
      const cats: Record<string, { count: number; verified: number }> = {};
      for (const p of products) {
        if (!cats[p.category]) cats[p.category] = { count: 0, verified: 0 };
        cats[p.category].count++;
        if (p.vendor_erc8004) cats[p.category].verified++;
      }

      const formatted = Object.entries(cats)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([cat, info]) => `• ${cat}: ${info.count} products (${info.verified} verified)`)
        .join('\n');

      return {
        content: [{
          type: 'text' as const,
          text: `Pyrimid Catalog — ${products.length} products across ${Object.keys(cats).length} categories:\n\n${formatted}\n\nUse pyrimid_browse to search.`,
        }],
      };
    }
  );

  // ═══════════════════════════════════════════════════════════
  //                     PURCHASE TOOLS
  // ═══════════════════════════════════════════════════════════

  server.tool(
    'pyrimid_buy',
    'Purchase a product from the Pyrimid network. Pays via x402 (USDC on Base) and returns the product data.',
    {
      vendor_id: z.string().describe('Vendor ID from browse results'),
      product_id: z.string().describe('Product ID from browse results'),
      max_price_usd: z.number().optional().describe('Maximum price you are willing to pay in USD (slippage protection). Defaults to product listed price.'),
    },
    async ({ vendor_id, product_id, max_price_usd }) => {
      const products = await refreshCatalog();
      const product = products.find(p => p.vendor_id === vendor_id && p.product_id === product_id);

      if (!product) {
        return { content: [{ type: 'text' as const, text: `Product not found: ${vendor_id}/${product_id}. Use pyrimid_browse first.` }] };
      }

      try {
        const response = await fetch(product.endpoint, {
          method: product.method,
          headers: { 'X-Affiliate-ID': affiliateId },
        });

        if (response.status === 402) {
          const paymentRequired = response.headers.get('X-PAYMENT-REQUIRED');
          const maxPrice = max_price_usd
            ? (max_price_usd * 1_000_000).toString()
            : product.price_usdc.toString();
          return {
            content: [{
              type: 'text' as const,
              text: `Payment required: ${product.price_display} USDC on Base.\nMax price: $${(Number(maxPrice) / 1_000_000).toFixed(2)}\nPayment details: ${paymentRequired}\nThe x402 client will handle payment automatically on retry. Pass maxPrice=${maxPrice} to routePayment for slippage protection.`,
            }],
          };
        }

        if (!response.ok) {
          return { content: [{ type: 'text' as const, text: `Purchase failed: HTTP ${response.status}` }] };
        }

        const data = await response.json();
        return {
          content: [{
            type: 'text' as const,
            text: `Purchase successful — ${product.vendor_name} / ${product.product_id}\nPaid: ${product.price_display}\n\nData:\n${JSON.stringify(data, null, 2)}`,
          }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Purchase error: ${error instanceof Error ? error.message : 'Unknown'}` }],
        };
      }
    }
  );

  server.tool(
    'pyrimid_preview',
    'Preview the payment split for a product without buying. Shows protocol, affiliate, and vendor shares.',
    {
      vendor_id: z.string().describe('Vendor ID'),
      product_id: z.string().describe('Product ID'),
    },
    async ({ vendor_id, product_id }) => {
      const products = await refreshCatalog();
      const product = products.find(p => p.vendor_id === vendor_id && p.product_id === product_id);

      if (!product) {
        return { content: [{ type: 'text' as const, text: `Product not found: ${vendor_id}/${product_id}` }] };
      }

      const split = calculateSplit(product.price_usdc, product.affiliate_bps);

      return {
        content: [{
          type: 'text' as const,
          text: [
            `Payment split for ${product.vendor_name} / ${product.product_id}:`,
            `  Total:     $${(split.total_usdc / 1_000_000).toFixed(4)}`,
            `  Protocol:  $${(split.protocol_fee / 1_000_000).toFixed(4)} (1%)`,
            `  Affiliate: $${(split.affiliate_commission / 1_000_000).toFixed(4)} (${split.affiliate_bps / 100}%)`,
            `  Vendor:    $${(split.vendor_share / 1_000_000).toFixed(4)} (${((split.vendor_share / split.total_usdc) * 100).toFixed(1)}%)`,
          ].join('\n'),
        }],
      };
    }
  );

  // ═══════════════════════════════════════════════════════════
  //                   AFFILIATE TOOLS
  // ═══════════════════════════════════════════════════════════

  server.tool(
    'pyrimid_register_affiliate',
    'Register as a Pyrimid affiliate agent. Free, permissionless. Returns your affiliate ID.',
    {
      wallet_address: z.string().describe('Your Base wallet address for USDC commissions'),
      referrer_id: z.string().optional().describe('Affiliate who referred you (earns $5 bonus on your first sale)'),
    },
    async ({ wallet_address, referrer_id }) => {
      return {
        content: [{
          type: 'text' as const,
          text: [
            `Register as a Pyrimid affiliate on Base:`,
            ``,
            `  Contract: 0x34e22fc20D457095e2814CdFfad1e42980EEC389`,
            `  Function: ${referrer_id ? `registerAffiliateWithReferral("${referrer_id}")` : 'registerAffiliate()'}`,
            `  From: ${wallet_address}`,
            `  Cost: Free (gas only, ~$0.01 on Base)`,
            ``,
            `After registration, use your affiliate ID with @pyrimid/sdk to start earning.`,
          ].join('\n'),
        }],
      };
    }
  );

  return server;
}
