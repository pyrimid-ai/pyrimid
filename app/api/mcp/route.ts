/**
 * MCP Server API — JSON-RPC 2.0 endpoint for Pyrimid tools
 *
 * Implements the 5 MCP tools as a lightweight JSON-RPC handler without
 * requiring @modelcontextprotocol/sdk as a dependency.
 *
 * POST: JSON-RPC 2.0 requests (tools/list, tools/call)
 * GET:  Server info + tool definitions
 */

import { type NextRequest, NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════════════
//                    TYPES
// ═══════════════════════════════════════════════════════════

interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
  id: number | string;
}

interface Product {
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
  monthly_buyers: number;
  network: string;
  asset: string;
}

// ═══════════════════════════════════════════════════════════
//                    CATALOG CACHE
// ═══════════════════════════════════════════════════════════

const CATALOG_URL = process.env.NEXT_PUBLIC_BASE_URL
  ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/catalog`
  : 'https://pyrimid.ai/api/v1/catalog';

let cachedProducts: Product[] = [];
let lastFetch = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function getCatalog(): Promise<Product[]> {
  if (Date.now() - lastFetch < CACHE_TTL && cachedProducts.length > 0) {
    return cachedProducts;
  }
  try {
    const res = await fetch(`${CATALOG_URL}?limit=10000`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return cachedProducts;
    const data = await res.json();
    cachedProducts = data.products || [];
    lastFetch = Date.now();
  } catch {
    // Return stale cache on error
  }
  return cachedProducts;
}

// ═══════════════════════════════════════════════════════════
//                    TOOL DEFINITIONS
// ═══════════════════════════════════════════════════════════

const TOOLS = [
  {
    name: 'pyrimid_browse',
    description: 'Search the Pyrimid product catalog. Returns products matching your query, sorted by relevance and trust (ERC-8004 verified vendors first).',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'What you need, e.g. "btc trading signals" or "image generation"' },
        max_results: { type: 'number', description: 'Maximum results to return (default 5)' },
        max_price_usd: { type: 'number', description: 'Max price per call in USD (default 10)' },
        verified_only: { type: 'boolean', description: 'Only ERC-8004 verified vendors' },
      },
      required: ['query'],
    },
  },
  {
    name: 'pyrimid_buy',
    description: 'Purchase a product from the Pyrimid network. Pays via x402 (USDC on Base) and returns the product data.',
    inputSchema: {
      type: 'object',
      properties: {
        vendor_id: { type: 'string', description: 'Vendor ID from browse results' },
        product_id: { type: 'string', description: 'Product ID from browse results' },
      },
      required: ['vendor_id', 'product_id'],
    },
  },
  {
    name: 'pyrimid_preview',
    description: 'Preview the payment split for a product without buying. Shows protocol, affiliate, and vendor shares.',
    inputSchema: {
      type: 'object',
      properties: {
        vendor_id: { type: 'string', description: 'Vendor ID' },
        product_id: { type: 'string', description: 'Product ID' },
      },
      required: ['vendor_id', 'product_id'],
    },
  },
  {
    name: 'pyrimid_categories',
    description: 'List all product categories available on the Pyrimid network with product counts.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'pyrimid_register_affiliate',
    description: 'Get instructions to register as a Pyrimid affiliate agent. Free, permissionless.',
    inputSchema: {
      type: 'object',
      properties: {
        wallet_address: { type: 'string', description: 'Your Base wallet address for USDC commissions' },
        referrer_id: { type: 'string', description: 'Affiliate who referred you' },
      },
      required: ['wallet_address'],
    },
  },
];

// ═══════════════════════════════════════════════════════════
//                    TOOL HANDLERS
// ═══════════════════════════════════════════════════════════

function calculateSplit(priceUsdc: number, affiliateBps: number) {
  const protocolFee = Math.floor(priceUsdc / 100);
  const remaining = priceUsdc - protocolFee;
  const affiliateCommission = Math.floor((remaining * affiliateBps) / 10_000);
  const vendorShare = remaining - affiliateCommission;
  return { total_usdc: priceUsdc, protocol_fee: protocolFee, affiliate_commission: affiliateCommission, vendor_share: vendorShare, affiliate_bps: affiliateBps };
}

async function handleToolCall(name: string, args: Record<string, unknown>): Promise<{ content: { type: string; text: string }[] }> {
  switch (name) {
    case 'pyrimid_browse': {
      const query = String(args.query || '');
      const maxResults = Number(args.max_results) || 5;
      const maxPriceUsd = Number(args.max_price_usd) || 10;
      const verifiedOnly = Boolean(args.verified_only);
      const maxPriceAtomic = maxPriceUsd * 1_000_000;

      const products = await getCatalog();
      const keywords = query.toLowerCase().split(/\s+/);

      const results = products
        .filter(p => p.price_usdc <= maxPriceAtomic)
        .filter(p => !verifiedOnly || p.vendor_erc8004)
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
        .slice(0, maxResults);

      if (results.length === 0) {
        return { content: [{ type: 'text', text: `No products found matching "${query}". Try broader terms or increase max_price_usd.` }] };
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

      return { content: [{ type: 'text', text: `Found ${results.length} products:\n\n${formatted}` }] };
    }

    case 'pyrimid_buy': {
      const vendorId = String(args.vendor_id || '');
      const productId = String(args.product_id || '');
      const products = await getCatalog();
      const product = products.find(p => p.vendor_id === vendorId && p.product_id === productId);

      if (!product) {
        return { content: [{ type: 'text', text: `Product not found: ${vendorId}/${productId}. Use pyrimid_browse first.` }] };
      }

      try {
        const response = await fetch(product.endpoint, {
          method: product.method,
          headers: { 'X-Affiliate-ID': 'af_treasury' },
        });

        if (response.status === 402) {
          const paymentRequired = response.headers.get('X-PAYMENT-REQUIRED');
          return {
            content: [{ type: 'text', text: `Payment required: ${product.price_display} USDC on Base.\nPayment details: ${paymentRequired}\nThe x402 client will handle payment automatically on retry.` }],
          };
        }

        if (!response.ok) {
          return { content: [{ type: 'text', text: `Purchase failed: HTTP ${response.status}` }] };
        }

        const data = await response.json();
        return {
          content: [{ type: 'text', text: `Purchase successful — ${product.vendor_name} / ${product.product_id}\nPaid: ${product.price_display}\n\nData:\n${JSON.stringify(data, null, 2)}` }],
        };
      } catch (error) {
        return { content: [{ type: 'text', text: `Purchase error: ${error instanceof Error ? error.message : 'Unknown'}` }] };
      }
    }

    case 'pyrimid_preview': {
      const vendorId = String(args.vendor_id || '');
      const productId = String(args.product_id || '');
      const products = await getCatalog();
      const product = products.find(p => p.vendor_id === vendorId && p.product_id === productId);

      if (!product) {
        return { content: [{ type: 'text', text: `Product not found: ${vendorId}/${productId}` }] };
      }

      const split = calculateSplit(product.price_usdc, product.affiliate_bps);
      return {
        content: [{
          type: 'text',
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

    case 'pyrimid_categories': {
      const products = await getCatalog();
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
        content: [{ type: 'text', text: `Pyrimid Catalog — ${products.length} products across ${Object.keys(cats).length} categories:\n\n${formatted}\n\nUse pyrimid_browse to search.` }],
      };
    }

    case 'pyrimid_register_affiliate': {
      const wallet = String(args.wallet_address || '');
      const referrer = args.referrer_id ? String(args.referrer_id) : '';
      return {
        content: [{
          type: 'text',
          text: [
            `Register as a Pyrimid affiliate on Base:`,
            ``,
            `  Contract: 0x34e22fc20D457095e2814CdFfad1e42980EEC389`,
            `  Function: ${referrer ? `registerAffiliateWithReferral("${referrer}")` : 'registerAffiliate()'}`,
            `  From: ${wallet}`,
            `  Cost: Free (gas only, ~$0.01 on Base)`,
            ``,
            `After registration, use your affiliate ID with @pyrimid/sdk to start earning.`,
          ].join('\n'),
        }],
      };
    }

    default:
      return { content: [{ type: 'text', text: `Unknown tool: ${name}` }] };
  }
}

// ═══════════════════════════════════════════════════════════
//                    SERVER INFO
// ═══════════════════════════════════════════════════════════

const SERVER_INFO = {
  name: 'pyrimid-mcp',
  version: '0.1.0',
  description: 'Pyrimid onchain affiliate distribution — product discovery, purchase, and affiliate tools',
  tools: TOOLS,
  contracts: {
    registry: '0x34e22fc20D457095e2814CdFfad1e42980EEC389',
    catalog: '0xC935d6B73034dDDb97AD2a1BbD2106F34A977908',
    router: '0xc949AEa380D7b7984806143ddbfE519B03ABd68B',
    treasury: '0x74A512F4f3F64aD479dEc4554a12855Ce943E12C',
  },
  network: 'base',
};

// ═══════════════════════════════════════════════════════════
//                    ROUTE HANDLERS
// ═══════════════════════════════════════════════════════════

export async function GET() {
  return NextResponse.json(SERVER_INFO, {
    headers: { 'Cache-Control': 'public, s-maxage=60' },
  });
}

export async function POST(req: NextRequest) {
  let body: JsonRpcRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' }, id: null },
      { status: 400 },
    );
  }

  if (body.jsonrpc !== '2.0' || !body.method) {
    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32600, message: 'Invalid Request' }, id: body.id ?? null },
      { status: 400 },
    );
  }

  try {
    switch (body.method) {
      case 'tools/list': {
        return NextResponse.json({
          jsonrpc: '2.0',
          result: { tools: TOOLS },
          id: body.id,
        });
      }

      case 'tools/call': {
        const params = body.params as { name?: string; arguments?: Record<string, unknown> } | undefined;
        const toolName = params?.name;
        const toolArgs = params?.arguments || {};

        if (!toolName) {
          return NextResponse.json({
            jsonrpc: '2.0',
            error: { code: -32602, message: 'Missing params.name' },
            id: body.id,
          });
        }

        const tool = TOOLS.find(t => t.name === toolName);
        if (!tool) {
          return NextResponse.json({
            jsonrpc: '2.0',
            error: { code: -32602, message: `Unknown tool: ${toolName}` },
            id: body.id,
          });
        }

        const result = await handleToolCall(toolName, toolArgs);
        return NextResponse.json({
          jsonrpc: '2.0',
          result,
          id: body.id,
        });
      }

      case 'initialize': {
        return NextResponse.json({
          jsonrpc: '2.0',
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {} },
            serverInfo: { name: SERVER_INFO.name, version: SERVER_INFO.version },
          },
          id: body.id,
        });
      }

      default:
        return NextResponse.json({
          jsonrpc: '2.0',
          error: { code: -32601, message: `Method not found: ${body.method}` },
          id: body.id,
        });
    }
  } catch (error) {
    return NextResponse.json({
      jsonrpc: '2.0',
      error: { code: -32603, message: error instanceof Error ? error.message : 'Internal error' },
      id: body.id,
    });
  }
}
