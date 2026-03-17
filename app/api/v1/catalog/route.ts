/**
 * GET /api/v1/catalog
 *
 * Aggregated product catalog — the single endpoint agents hit to discover
 * every product available on the Pyrimid network.
 *
 * Sources:
 *   1. Onchain (PyrimidCatalog contract via subgraph)
 *   2. x402 Bazaar
 *   3. MCPize
 *   4. MCP Hive
 *   5. Apify
 *
 * Query params:
 *   ?query=trading+signals  — keyword search
 *   ?category=trading       — filter by category
 *   ?max_price=10           — max price in USD
 *   ?verified_only=true     — only ERC-8004 verified vendors
 *   ?limit=25               — results per page (default 50, max 200)
 *   ?offset=0               — pagination offset
 *   ?sort=relevance         — relevance | price_asc | price_desc | volume | newest
 */

import { type NextRequest, NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════════════
//                    CONTRACT ADDRESSES
// ═══════════════════════════════════════════════════════════

const CONTRACTS = {
  REGISTRY: '0x34e22fc20D457095e2814CdFfad1e42980EEC389',
  CATALOG:  '0xC935d6B73034dDDb97AD2a1BbD2106F34A977908',
  ROUTER:   '0xc949AEa380D7b7984806143ddbfE519B03ABd68B',
  TREASURY: '0x74A512F4f3F64aD479dEc4554a12855Ce943E12C',
} as const;

// ═══════════════════════════════════════════════════════════
//                   EXTERNAL SOURCES
// ═══════════════════════════════════════════════════════════

const SUBGRAPH_URL = process.env.PYRIMID_SUBGRAPH_URL || 'https://api.studio.thegraph.com/query/pyrimid/pyrimid-base/version/latest';
// Real CDP Bazaar discovery endpoint (x402 v2)
const BAZAAR_URL   = process.env.BAZAAR_CATALOG_URL   || 'https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources';
// x402.org testnet discovery (fallback, also valid)
const BAZAAR_TESTNET_URL = 'https://x402.org/facilitator/discovery/resources';
// These don't have stable public REST APIs yet — env-overridable stubs
const MCPIZE_URL   = process.env.MCPIZE_CATALOG_URL   || '';
const MCPHIVE_URL  = process.env.MCPHIVE_CATALOG_URL  || '';
const APIFY_URL    = process.env.APIFY_CATALOG_URL     || '';

// In-memory cache
let catalogCache: { products: Product[]; fetchedAt: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ═══════════════════════════════════════════════════════════
//                        TYPES
// ═══════════════════════════════════════════════════════════

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
  source: string;         // 'onchain' | 'bazaar' | 'mcpize' | 'mcphive' | 'apify'
  sdk_integrated: boolean; // true = vendor has Pyrimid middleware installed
  indexed_at: string;
}

// ═══════════════════════════════════════════════════════════
//                   SOURCE FETCHERS
// ═══════════════════════════════════════════════════════════

/**
 * Fetch products from the Pyrimid subgraph (onchain registrations)
 */
async function fetchOnchainProducts(): Promise<Product[]> {
  try {
    const res = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `{
          products(first: 1000, where: { active: true }) {
            id
            vendorId
            vendorName
            productId
            endpoint
            description
            priceUsdc
            affiliateBps
            vendor {
              erc8004Linked
              reputation
            }
            monthlySales
            monthlyBuyers
            createdAt
          }
        }`,
      }),
    });

    if (!res.ok) return [];
    const data = await res.json();
    const raw = data?.data?.products || [];

    return raw.map((p: any) => ({
      vendor_id: p.vendorId,
      vendor_name: p.vendorName || `Vendor #${p.vendorId}`,
      vendor_erc8004: p.vendor?.erc8004Linked || false,
      product_id: p.productId,
      description: p.description || '',
      category: inferCategory(p.description, p.productId),
      tags: inferTags(p.description),
      price_usdc: Number(p.priceUsdc),
      price_display: formatPrice(Number(p.priceUsdc)),
      affiliate_bps: Number(p.affiliateBps),
      endpoint: p.endpoint,
      method: 'GET',
      output_schema: {},
      monthly_volume: Number(p.monthlySales) || 0,
      monthly_buyers: Number(p.monthlyBuyers) || 0,
      network: 'base',
      asset: 'USDC',
      source: 'onchain',
      sdk_integrated: true,
      indexed_at: new Date(Number(p.createdAt) * 1000).toISOString(),
    }));
  } catch (err) {
    console.error('[catalog] Subgraph fetch failed:', err);
    return [];
  }
}

/**
 * Fetch products from x402 Bazaar (CDP facilitator discovery endpoint)
 *
 * Real response shape (x402 v2):
 * [
 *   {
 *     "resource": "https://api.example.com/x402/weather",
 *     "type": "http",
 *     "x402Version": 2,
 *     "lastUpdated": "2025-08-09T01:07:04.005Z",
 *     "metadata": {},
 *     "accepts": [{
 *       "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
 *       "description": "",
 *       "maxAmountRequired": "200",
 *       "network": "eip155:8453",
 *       "payTo": "0xa2477E16dCB42E2AD80f03FE97D7F1a1646cd1c0",
 *       "scheme": "exact",
 *       "outputSchema": { "input": {...}, "output": null }
 *     }]
 *   }
 * ]
 */
async function fetchBazaarProducts(): Promise<Product[]> {
  const urls = [BAZAAR_URL, BAZAAR_TESTNET_URL];

  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const data = await res.json();

      // CDP returns array directly, or { resources: [...] }
      const resources: any[] = Array.isArray(data) ? data : (data.resources || data.items || []);

      return resources
        .filter((r: any) => r.resource && r.accepts?.length > 0)
        .map((r: any) => {
          const accept = r.accepts[0]; // primary payment scheme
          const resourceUrl = r.resource || '';
          // Extract vendor name from URL hostname
          let vendorName = 'Unknown';
          try { vendorName = new URL(resourceUrl).hostname.replace('api.', '').split('.')[0]; } catch {}

          // Price: maxAmountRequired is in USDC atomic units (6 decimals)
          const priceAtomic = parseInt(accept.maxAmountRequired || '0', 10);

          // Description from metadata or accept block
          const description = accept.description || r.metadata?.description || r.metadata?.name || resourceUrl;

          // Extract method from URL path or metadata
          const pathPart = resourceUrl.split('/').pop() || '';

          return {
            vendor_id: `bazaar_${accept.payTo?.toLowerCase().slice(0, 10) || 'unknown'}`,
            vendor_name: r.metadata?.name || r.metadata?.provider || vendorName,
            vendor_erc8004: false,
            product_id: `bazaar_${pathPart || resourceUrl.replace(/[^a-zA-Z0-9]/g, '_').slice(-30)}`,
            description,
            category: inferCategory(description, vendorName),
            tags: inferTags(description),
            price_usdc: priceAtomic,
            price_display: formatPrice(priceAtomic),
            affiliate_bps: 0, // 0% default — vendor must set explicitly
            endpoint: resourceUrl,
            method: r.metadata?.method || accept.outputSchema?.input?.method || 'GET',
            output_schema: accept.outputSchema?.output || {},
            monthly_volume: 0,
            monthly_buyers: 0,
            network: accept.network === 'eip155:8453' ? 'base' : (accept.network || 'base'),
            asset: accept.asset === '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' ? 'USDC' : 'USDC',
            source: 'bazaar' as const,
            sdk_integrated: false,
            indexed_at: r.lastUpdated || new Date().toISOString(),
          };
        });
    } catch {
      continue; // Try next URL
    }
  }
  return [];
}

/**
 * Fetch products from MCPize
 */
async function fetchMcpizeProducts(): Promise<Product[]> {
  if (!MCPIZE_URL) return []; // No stable public API yet
  try {
    const res = await fetch(MCPIZE_URL, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const data = await res.json();
    const servers = Array.isArray(data) ? data : data.servers || [];

    return servers
      .filter((s: any) => s.pricing && s.pricing !== 'free')
      .map((s: any) => ({
        vendor_id: `mcpize_${s.id || s.slug}`,
        vendor_name: s.author || s.name || 'Unknown',
        vendor_erc8004: false,
        product_id: s.id || s.slug,
        description: s.description || '',
        category: s.category || 'mcp-tools',
        tags: s.tags || [],
        price_usdc: parsePrice(s.pricing?.price || s.price),
        price_display: formatPrice(parsePrice(s.pricing?.price || s.price)),
        affiliate_bps: 0, // 0% default — vendor must set explicitly
        endpoint: s.endpoint || s.url || '',
        method: 'GET',
        output_schema: {},
        monthly_volume: s.installs || 0,
        monthly_buyers: 0,
        network: 'base',
        asset: 'USDC',
        source: 'mcpize',
        sdk_integrated: false,
        indexed_at: new Date().toISOString(),
      }));
  } catch {
    return [];
  }
}

/**
 * Fetch products from MCP Hive
 */
async function fetchMcpHiveProducts(): Promise<Product[]> {
  if (!MCPHIVE_URL) return []; // No stable public API yet
  try {
    const res = await fetch(MCPHIVE_URL, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const data = await res.json();
    const items = Array.isArray(data) ? data : data.catalog || [];

    return items.map((s: any) => ({
      vendor_id: `mcphive_${s.id}`,
      vendor_name: s.vendor || s.name || 'Unknown',
      vendor_erc8004: false,
      product_id: s.id,
      description: s.description || '',
      category: s.category || 'mcp-tools',
      tags: s.tags || [],
      price_usdc: parsePrice(s.price),
      price_display: formatPrice(parsePrice(s.price)),
      affiliate_bps: 0, // 0% default — vendor must set explicitly
      endpoint: s.endpoint || '',
      method: s.method || 'GET',
      output_schema: {},
      monthly_volume: s.transactions || 0,
      monthly_buyers: 0,
      network: 'base',
      asset: 'USDC',
      source: 'mcphive',
      sdk_integrated: false,
      indexed_at: new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch products from Apify MCP servers
 */
async function fetchApifyProducts(): Promise<Product[]> {
  if (!APIFY_URL) return []; // No stable public API yet
  try {
    const res = await fetch(APIFY_URL, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const data = await res.json();
    const actors = Array.isArray(data) ? data : data.data?.items || [];

    return actors
      .filter((a: any) => a.pricing?.type === 'per_event')
      .map((a: any) => ({
        vendor_id: `apify_${a.id}`,
        vendor_name: a.username || 'Apify',
        vendor_erc8004: false,
        product_id: a.id,
        description: a.description || a.title || '',
        category: inferCategory(a.description || '', a.title || ''),
        tags: a.categories || [],
        price_usdc: parsePrice(a.pricing?.pricePerEvent),
        price_display: formatPrice(parsePrice(a.pricing?.pricePerEvent)),
        affiliate_bps: 0, // 0% default — vendor must set explicitly
        endpoint: `https://api.apify.com/v2/mcp/${a.id}`,
        method: 'POST',
        output_schema: {},
        monthly_volume: a.stats?.totalRuns || 0,
        monthly_buyers: a.stats?.totalUsers || 0,
        network: 'base',
        asset: 'USDC',
        source: 'apify',
        sdk_integrated: false,
        indexed_at: new Date().toISOString(),
      }));
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════
//                      AGGREGATOR
// ═══════════════════════════════════════════════════════════

async function aggregateCatalog(): Promise<Product[]> {
  // Check cache
  if (catalogCache && Date.now() - catalogCache.fetchedAt < CACHE_TTL) {
    return catalogCache.products;
  }

  // Fetch all sources in parallel
  const [onchain, bazaar, mcpize, mcphive, apify] = await Promise.all([
    fetchOnchainProducts(),
    fetchBazaarProducts(),
    fetchMcpizeProducts(),
    fetchMcpHiveProducts(),
    fetchApifyProducts(),
  ]);

  // Merge + deduplicate (prefer onchain → bazaar → mcpize → mcphive → apify)
  const seen = new Set<string>();
  const products: Product[] = [];

  for (const source of [onchain, bazaar, mcpize, mcphive, apify]) {
    for (const p of source) {
      const key = `${p.vendor_id}:${p.product_id}`;
      if (!seen.has(key) && p.endpoint) {
        seen.add(key);
        products.push(p);
      }
    }
  }

  catalogCache = { products, fetchedAt: Date.now() };
  return products;
}

// ═══════════════════════════════════════════════════════════
//                      ROUTE HANDLER
// ═══════════════════════════════════════════════════════════

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;

  const query        = params.get('query') || '';
  const category     = params.get('category') || '';
  const maxPriceUsd  = parseFloat(params.get('max_price') || '0') || 0;
  const verifiedOnly = params.get('verified_only') === 'true';
  const limit        = Math.min(parseInt(params.get('limit') || '50'), 200);
  const offset       = parseInt(params.get('offset') || '0') || 0;
  const sort         = params.get('sort') || 'relevance';

  try {
    let products = await aggregateCatalog();

    // --- Filters ---
    if (category) {
      products = products.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }
    if (maxPriceUsd > 0) {
      const maxAtomic = maxPriceUsd * 1_000_000;
      products = products.filter(p => p.price_usdc <= maxAtomic);
    }
    if (verifiedOnly) {
      products = products.filter(p => p.vendor_erc8004);
    }

    // --- Search scoring ---
    if (query) {
      const keywords = query.toLowerCase().split(/\s+/);
      const scored = products.map(p => {
        const searchable = `${p.description} ${p.tags.join(' ')} ${p.category} ${p.vendor_name} ${p.product_id}`.toLowerCase();
        let score = 0;
        for (const kw of keywords) {
          if (searchable.includes(kw)) score += 10;
          if (p.product_id.toLowerCase().includes(kw)) score += 5;
          if (p.vendor_name.toLowerCase().includes(kw)) score += 3;
        }
        if (p.vendor_erc8004) score += 5;
        if (p.sdk_integrated) score += 3;
        score += Math.min(p.monthly_volume / 1000, 5);
        return { product: p, score };
      });

      products = scored
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(s => s.product);
    } else {
      // --- Sorting (non-search) ---
      switch (sort) {
        case 'price_asc':
          products.sort((a, b) => a.price_usdc - b.price_usdc);
          break;
        case 'price_desc':
          products.sort((a, b) => b.price_usdc - a.price_usdc);
          break;
        case 'volume':
          products.sort((a, b) => b.monthly_volume - a.monthly_volume);
          break;
        case 'newest':
          products.sort((a, b) => new Date(b.indexed_at).getTime() - new Date(a.indexed_at).getTime());
          break;
        default: // relevance — verified + volume
          products.sort((a, b) => {
            if (a.vendor_erc8004 && !b.vendor_erc8004) return -1;
            if (!a.vendor_erc8004 && b.vendor_erc8004) return 1;
            if (a.sdk_integrated && !b.sdk_integrated) return -1;
            if (!a.sdk_integrated && b.sdk_integrated) return 1;
            return b.monthly_volume - a.monthly_volume;
          });
      }
    }

    const total = products.length;
    const page = products.slice(offset, offset + limit);

    // Source breakdown
    const sources: Record<string, number> = {};
    for (const p of products) {
      sources[p.source] = (sources[p.source] || 0) + 1;
    }

    return NextResponse.json({
      products: page,
      total,
      limit,
      offset,
      sources,
      updated_at: catalogCache?.fetchedAt
        ? new Date(catalogCache.fetchedAt).toISOString()
        : new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
        'X-Pyrimid-Registry': CONTRACTS.REGISTRY,
        'X-Pyrimid-Catalog': CONTRACTS.CATALOG,
        'X-Pyrimid-Router': CONTRACTS.ROUTER,
      },
    });
  } catch (err) {
    console.error('[catalog] Error:', err);
    return NextResponse.json(
      { error: 'catalog_fetch_failed', message: 'Failed to aggregate catalog' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════
//                      HELPERS
// ═══════════════════════════════════════════════════════════

function formatPrice(atomicUsdc: number): string {
  const usd = atomicUsdc / 1_000_000;
  if (usd >= 1) return `$${usd.toFixed(2)}`;
  if (usd >= 0.01) return `$${usd.toFixed(2)}`;
  return `$${usd.toFixed(4)}`;
}

function parsePrice(input: any): number {
  if (!input) return 0;
  if (typeof input === 'number') {
    return input < 1000 ? Math.round(input * 1_000_000) : input; // assume USD if small
  }
  const str = String(input).replace(/[$,]/g, '');
  const num = parseFloat(str);
  if (isNaN(num)) return 0;
  return num < 1000 ? Math.round(num * 1_000_000) : num;
}

function inferCategory(desc: string, name: string): string {
  const text = `${desc} ${name}`.toLowerCase();
  if (/trad|signal|futures|perp|swap|defi/i.test(text)) return 'trading';
  if (/image|video|generat|diffus/i.test(text)) return 'ai-generation';
  if (/search|scrap|crawl|index/i.test(text)) return 'search-scraping';
  if (/data|feed|price|market/i.test(text)) return 'data-feeds';
  if (/secur|audit|compli/i.test(text)) return 'security';
  if (/comput|infer|gpu|llm/i.test(text)) return 'compute';
  if (/nlp|embed|token/i.test(text)) return 'nlp';
  if (/analyt|metric|dashboard/i.test(text)) return 'analytics';
  if (/blockchain|onchain|web3|nft/i.test(text)) return 'blockchain';
  if (/stor|retriev|database/i.test(text)) return 'storage';
  return 'other';
}

function inferTags(desc: string): string[] {
  const tags: string[] = [];
  const text = desc.toLowerCase();
  const keywords = ['api', 'mcp', 'ai', 'trading', 'data', 'blockchain', 'search', 'analytics', 'compute', 'security'];
  for (const kw of keywords) {
    if (text.includes(kw)) tags.push(kw);
  }
  return tags;
}
