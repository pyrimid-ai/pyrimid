/**
 * GET /api/v1/stats
 *
 * Protocol-level statistics for the Pyrimid network.
 * Aggregated from subgraph events + catalog data.
 *
 * Query params:
 *   ?type=protocol          — overall protocol stats (default)
 *   ?type=affiliate&id=af_x — affiliate-specific stats
 *   ?type=vendor&id=vn_x    — vendor-specific stats
 *   ?type=product&vendor=vn_x&product=prod_x — product stats
 */

import { type NextRequest, NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════════════
//                    CONTRACT ADDRESSES
// ═══════════════════════════════════════════════════════════

const CONTRACTS = {
  REGISTRY: '0x2263852363Bce16791A059c6F6fBb590f0b98c89',
  CATALOG:  '0x1ae8EbbFf7c5A15a155c9bcF9fF7984e7C8e0E74',
  ROUTER:   '0x6594A6B2785b1f8505b291bDc50E017b5599aFC8',
  TREASURY: '0xdF29F94EA8053cC0cb1567D0A8Ac8dd3d1E00908',
} as const;

const SUBGRAPH_URL = process.env.PYRIMID_SUBGRAPH_URL || 'https://api.studio.thegraph.com/query/pyrimid/pyrimid-base/version/latest';
const CATALOG_URL  = process.env.NEXT_PUBLIC_BASE_URL
  ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/catalog`
  : 'https://api.pyrimid.ai/v1/catalog';

// Cache
let statsCache: { data: any; fetchedAt: number } | null = null;
const CACHE_TTL = 60 * 1000; // 1 minute

// ═══════════════════════════════════════════════════════════
//                  SUBGRAPH QUERIES
// ═══════════════════════════════════════════════════════════

async function querySubgraph(query: string, variables: Record<string, any> = {}) {
  try {
    const res = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`Subgraph returned ${res.status}`);
    const data = await res.json();
    return data?.data || null;
  } catch (err) {
    console.error('[stats] Subgraph query failed:', err);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════
//                  STAT FETCHERS
// ═══════════════════════════════════════════════════════════

async function fetchProtocolStats() {
  // Check cache
  if (statsCache && Date.now() - statsCache.fetchedAt < CACHE_TTL) {
    return statsCache.data;
  }

  const [subgraphData, catalogRes] = await Promise.all([
    querySubgraph(`{
      protocolStats(id: "global") {
        totalVolumeUsdc
        totalTransactions
        totalAffiliates
        totalVendors
        totalProducts
        treasuryBalance
        totalAffiliatePayouts
        totalProtocolFees
      }
      recentPayments: paymentRoutedEvents(
        first: 10,
        orderBy: blockTimestamp,
        orderDirection: desc
      ) {
        vendorId
        productId
        affiliateId
        total
        platformFee
        affiliateCommission
        vendorShare
        blockTimestamp
        transactionHash
      }
    }`),
    fetch(CATALOG_URL, { signal: AbortSignal.timeout(5000) }).then(r => r.ok ? r.json() : null).catch(() => null),
  ]);

  const onchain = subgraphData?.protocolStats || {};
  const catalog = catalogRes || {};

  // Build category breakdown from catalog
  const categories: Record<string, number> = {};
  const sources: Record<string, number> = {};
  if (catalog.products) {
    for (const p of catalog.products) {
      categories[p.category] = (categories[p.category] || 0) + 1;
      sources[p.source] = (sources[p.source] || 0) + 1;
    }
  }

  const stats = {
    protocol: {
      total_volume_usdc: Number(onchain.totalVolumeUsdc || 0),
      total_volume_display: formatUsdc(Number(onchain.totalVolumeUsdc || 0)),
      total_transactions: Number(onchain.totalTransactions || 0),
      total_affiliates: Number(onchain.totalAffiliates || 0),
      total_vendors: Number(onchain.totalVendors || 0),
      total_products_onchain: Number(onchain.totalProducts || 0),
      total_products_indexed: catalog.total || 0,
      treasury_balance_usdc: Number(onchain.treasuryBalance || 0),
      treasury_balance_display: formatUsdc(Number(onchain.treasuryBalance || 0)),
      total_affiliate_payouts_usdc: Number(onchain.totalAffiliatePayouts || 0),
      total_protocol_fees_usdc: Number(onchain.totalProtocolFees || 0),
    },
    catalog: {
      total_products: catalog.total || 0,
      categories,
      sources,
    },
    recent_transactions: (subgraphData?.recentPayments || []).map((p: any) => ({
      vendor_id: p.vendorId,
      product_id: p.productId,
      affiliate_id: p.affiliateId,
      total_usdc: Number(p.total),
      total_display: formatUsdc(Number(p.total)),
      platform_fee: Number(p.platformFee),
      affiliate_commission: Number(p.affiliateCommission),
      vendor_share: Number(p.vendorShare),
      timestamp: new Date(Number(p.blockTimestamp) * 1000).toISOString(),
      tx_hash: p.transactionHash,
    })),
    contracts: CONTRACTS,
    network: 'base',
    updated_at: new Date().toISOString(),
  };

  statsCache = { data: stats, fetchedAt: Date.now() };
  return stats;
}

async function fetchAffiliateStats(affiliateId: string) {
  const data = await querySubgraph(`
    query AffiliateStats($id: String!) {
      affiliate(id: $id) {
        wallet
        reputation
        erc8004Linked
        salesCount
        totalVolume
        uniqueBuyers
        vendorsServed
        totalEarnings
        registeredAt
      }
      affiliateSales: paymentRoutedEvents(
        where: { affiliateId: $id }
        first: 20
        orderBy: blockTimestamp
        orderDirection: desc
      ) {
        vendorId
        productId
        affiliateCommission
        total
        blockTimestamp
        transactionHash
      }
    }
  `, { id: affiliateId });

  if (!data?.affiliate) {
    return { error: 'affiliate_not_found', affiliate_id: affiliateId };
  }

  const a = data.affiliate;
  return {
    affiliate: {
      id: affiliateId,
      wallet: a.wallet,
      reputation_score: Number(a.reputation || 0),
      erc8004_linked: a.erc8004Linked || false,
      total_earnings_usdc: Number(a.totalEarnings || 0),
      total_earnings_display: formatUsdc(Number(a.totalEarnings || 0)),
      sales_count: Number(a.salesCount || 0),
      unique_buyers: Number(a.uniqueBuyers || 0),
      vendors_served: Number(a.vendorsServed || 0),
      registered_at: a.registeredAt
        ? new Date(Number(a.registeredAt) * 1000).toISOString()
        : null,
    },
    recent_sales: (data.affiliateSales || []).map((s: any) => ({
      vendor_id: s.vendorId,
      product_id: s.productId,
      commission_usdc: Number(s.affiliateCommission),
      commission_display: formatUsdc(Number(s.affiliateCommission)),
      total_usdc: Number(s.total),
      timestamp: new Date(Number(s.blockTimestamp) * 1000).toISOString(),
      tx_hash: s.transactionHash,
    })),
    updated_at: new Date().toISOString(),
  };
}

async function fetchVendorStats(vendorId: string) {
  const data = await querySubgraph(`
    query VendorStats($id: String!) {
      vendor(id: $id) {
        name
        payoutAddress
        active
        productsCount
        totalVolume
        totalSales
        uniqueAffiliates
        affiliatePayouts
        registeredAt
      }
      vendorSales: paymentRoutedEvents(
        where: { vendorId: $id }
        first: 20
        orderBy: blockTimestamp
        orderDirection: desc
      ) {
        productId
        affiliateId
        vendorShare
        total
        blockTimestamp
        transactionHash
      }
    }
  `, { id: vendorId });

  if (!data?.vendor) {
    return { error: 'vendor_not_found', vendor_id: vendorId };
  }

  const v = data.vendor;
  return {
    vendor: {
      id: vendorId,
      name: v.name,
      payout_address: v.payoutAddress,
      active: v.active,
      products_count: Number(v.productsCount || 0),
      total_volume_usdc: Number(v.totalVolume || 0),
      total_volume_display: formatUsdc(Number(v.totalVolume || 0)),
      total_sales: Number(v.totalSales || 0),
      unique_affiliates: Number(v.uniqueAffiliates || 0),
      affiliate_payouts_usdc: Number(v.affiliatePayouts || 0),
      registered_at: v.registeredAt
        ? new Date(Number(v.registeredAt) * 1000).toISOString()
        : null,
    },
    recent_sales: (data.vendorSales || []).map((s: any) => ({
      product_id: s.productId,
      affiliate_id: s.affiliateId,
      vendor_share_usdc: Number(s.vendorShare),
      total_usdc: Number(s.total),
      timestamp: new Date(Number(s.blockTimestamp) * 1000).toISOString(),
      tx_hash: s.transactionHash,
    })),
    updated_at: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════
//                    ROUTE HANDLER
// ═══════════════════════════════════════════════════════════

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const type = params.get('type') || 'protocol';
  const id = params.get('id') || '';

  try {
    let data: any;

    switch (type) {
      case 'affiliate':
        if (!id) {
          return NextResponse.json({ error: 'missing_id', message: 'Provide ?id=af_xxx for affiliate stats' }, { status: 400 });
        }
        data = await fetchAffiliateStats(id);
        break;

      case 'vendor':
        if (!id) {
          return NextResponse.json({ error: 'missing_id', message: 'Provide ?id=vn_xxx for vendor stats' }, { status: 400 });
        }
        data = await fetchVendorStats(id);
        break;

      case 'protocol':
      default:
        data = await fetchProtocolStats();
        break;
    }

    if (data?.error) {
      return NextResponse.json(data, { status: 404 });
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': type === 'protocol'
          ? 'public, s-maxage=60, stale-while-revalidate=30'
          : 'public, s-maxage=30, stale-while-revalidate=15',
        'X-Pyrimid-Registry': CONTRACTS.REGISTRY,
        'X-Pyrimid-Router': CONTRACTS.ROUTER,
      },
    });
  } catch (err) {
    console.error('[stats] Error:', err);
    return NextResponse.json(
      { error: 'stats_fetch_failed', message: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════
//                        HELPERS
// ═══════════════════════════════════════════════════════════

function formatUsdc(atomic: number): string {
  const usd = atomic / 1_000_000;
  if (usd >= 1000) return `$${(usd / 1000).toFixed(1)}K`;
  if (usd >= 1) return `$${usd.toFixed(2)}`;
  return `$${usd.toFixed(4)}`;
}
