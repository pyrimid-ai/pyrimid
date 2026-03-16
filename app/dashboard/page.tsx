'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CONTRACTS, CHAIN, LINKS, formatUsdc, truncateAddr } from '@/lib/contracts';

interface ProtocolStats {
  protocol: {
    total_volume_usdc: number;
    total_volume_display: string;
    total_transactions: number;
    total_affiliates: number;
    total_vendors: number;
    total_products_onchain: number;
    total_products_indexed: number;
    treasury_balance_usdc: number;
    treasury_balance_display: string;
  };
  catalog: {
    total_products: number;
    categories: Record<string, number>;
    sources: Record<string, number>;
  };
  recent_transactions: {
    vendor_id: string;
    product_id: string;
    affiliate_id: string;
    total_usdc: number;
    total_display: string;
    platform_fee: number;
    affiliate_commission: number;
    vendor_share: number;
    timestamp: string;
    tx_hash: string;
  }[];
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-[#1e2230] bg-[#0d0f14] p-5">
      <p className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-[#5a5f74]">{label}</p>
      <p className="text-2xl font-bold tracking-tight text-white">{value}</p>
      {sub && <p className="mt-1 font-mono text-xs text-[#8b90a5]">{sub}</p>}
    </div>
  );
}

function SourceBadge({ source }: { source: string }) {
  const colors: Record<string, string> = {
    onchain: 'bg-[#5eead4]/10 text-[#5eead4]',
    bazaar: 'bg-[#fb923c]/10 text-[#fb923c]',
    mcpize: 'bg-[#c084fc]/10 text-[#c084fc]',
    mcphive: 'bg-[#60a5fa]/10 text-[#60a5fa]',
    apify: 'bg-[#f472b6]/10 text-[#f472b6]',
  };
  return (
    <span className={`rounded px-2 py-0.5 font-mono text-[10px] font-semibold ${colors[source] || 'bg-[#1e2230] text-[#5a5f74]'}`}>
      {source}
    </span>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<ProtocolStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/v1/stats?type=protocol');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setStats(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 30_000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#08090c]">
      {/* Header */}
      <nav className="border-b border-[#1e2230] bg-[#08090c]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center">
            <span style={{ color: 'var(--accent)' }} className="font-mono font-bold text-[1.2rem]">pyrimid</span>
            <span style={{ color: 'var(--dim)' }} className="font-normal text-[.7rem] ml-2">base</span>
          </Link>
          <div className="flex items-center gap-5">
            <Link href="/docs" className="text-sm font-medium text-[#8b90a5] transition hover:text-white">Docs</Link>
            <a href={LINKS.basescan(CONTRACTS.ROUTER)} target="_blank" rel="noopener"
               className="text-sm font-medium text-[#8b90a5] transition hover:text-white">BaseScan</a>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1e2230] border-t-[#5eead4]" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-[#f87171]/30 bg-[#f87171]/5 p-8 text-center">
            <p className="mb-2 font-semibold text-[#f87171]">Failed to load stats</p>
            <p className="font-mono text-xs text-[#8b90a5]">{error}</p>
            <p className="mt-4 text-sm text-[#5a5f74]">The subgraph may still be indexing. Stats will populate once transactions flow through the protocol.</p>
          </div>
        ) : stats ? (
          <>
            {/* Top-level stats */}
            <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatCard label="Total Volume" value={stats.protocol.total_volume_display || '$0'} sub="USDC on Base" />
              <StatCard label="Transactions" value={stats.protocol.total_transactions.toLocaleString()} sub="routed through CommissionRouter" />
              <StatCard label="Affiliates" value={stats.protocol.total_affiliates.toLocaleString()} sub="registered agents" />
              <StatCard label="Treasury" value={stats.protocol.treasury_balance_display || '$0'} sub="1% protocol fee" />
            </div>

            <div className="mb-8 grid gap-4 md:grid-cols-3">
              <StatCard label="Vendors" value={stats.protocol.total_vendors.toLocaleString()} />
              <StatCard label="Products (Onchain)" value={stats.protocol.total_products_onchain.toLocaleString()} />
              <StatCard label="Products (Indexed)" value={stats.catalog.total_products.toLocaleString()} sub="across all sources" />
            </div>

            {/* Catalog sources */}
            {stats.catalog.sources && Object.keys(stats.catalog.sources).length > 0 && (
              <div className="mb-8">
                <h2 className="mb-4 font-mono text-xs font-semibold uppercase tracking-widest text-[#5a5f74]">Catalog Sources</h2>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(stats.catalog.sources)
                    .sort((a, b) => b[1] - a[1])
                    .map(([source, count]) => (
                      <div key={source} className="flex items-center gap-2 rounded-lg border border-[#1e2230] bg-[#0d0f14] px-4 py-2.5">
                        <SourceBadge source={source} />
                        <span className="font-mono text-sm font-semibold text-white">{count}</span>
                        <span className="text-xs text-[#5a5f74]">products</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Categories */}
            {stats.catalog.categories && Object.keys(stats.catalog.categories).length > 0 && (
              <div className="mb-8">
                <h2 className="mb-4 font-mono text-xs font-semibold uppercase tracking-widest text-[#5a5f74]">Categories</h2>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {Object.entries(stats.catalog.categories)
                    .sort((a, b) => b[1] - a[1])
                    .map(([cat, count]) => (
                      <div key={cat} className="flex items-center justify-between rounded-lg border border-[#1e2230] bg-[#0d0f14] px-4 py-2.5">
                        <span className="text-sm text-[#8b90a5]">{cat}</span>
                        <span className="font-mono text-xs font-semibold text-white">{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Recent transactions */}
            <div className="mb-8">
              <h2 className="mb-4 font-mono text-xs font-semibold uppercase tracking-widest text-[#5a5f74]">Recent Transactions</h2>
              {stats.recent_transactions.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-[#1e2230]">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#0d0f14]">
                        <th className="px-4 py-3 text-left font-mono text-[10px] font-semibold uppercase tracking-wider text-[#5a5f74]">Time</th>
                        <th className="px-4 py-3 text-left font-mono text-[10px] font-semibold uppercase tracking-wider text-[#5a5f74]">Product</th>
                        <th className="px-4 py-3 text-right font-mono text-[10px] font-semibold uppercase tracking-wider text-[#5a5f74]">Total</th>
                        <th className="px-4 py-3 text-right font-mono text-[10px] font-semibold uppercase tracking-wider text-[#5a5f74]">Affiliate Cut</th>
                        <th className="px-4 py-3 text-right font-mono text-[10px] font-semibold uppercase tracking-wider text-[#5a5f74]">Tx</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recent_transactions.map((tx, i) => (
                        <tr key={i} className="border-t border-[#1e2230] transition hover:bg-[#0d0f14]">
                          <td className="px-4 py-3 font-mono text-xs text-[#8b90a5]">
                            {new Date(tx.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-white">{tx.product_id}</span>
                            <span className="ml-2 text-xs text-[#5a5f74]">{tx.vendor_id}</span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-white">{tx.total_display}</td>
                          <td className="px-4 py-3 text-right font-mono text-xs text-[#5eead4]">{formatUsdc(tx.affiliate_commission)}</td>
                          <td className="px-4 py-3 text-right">
                            <a href={LINKS.tx(tx.tx_hash)} target="_blank" rel="noopener"
                               className="font-mono text-xs text-[#5a5f74] transition hover:text-[#5eead4]">
                              {truncateAddr(tx.tx_hash)}
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-xl border border-[#1e2230] bg-[#0d0f14] p-10 text-center">
                  <p className="text-sm text-[#5a5f74]">No transactions yet. First sale will appear here.</p>
                </div>
              )}
            </div>

            {/* Contracts */}
            <div>
              <h2 className="mb-4 font-mono text-xs font-semibold uppercase tracking-widest text-[#5a5f74]">Contracts</h2>
              <div className="grid gap-2 md:grid-cols-2">
                {[
                  { name: 'Registry', addr: CONTRACTS.REGISTRY },
                  { name: 'Catalog', addr: CONTRACTS.CATALOG },
                  { name: 'Router', addr: CONTRACTS.ROUTER },
                  { name: 'Treasury', addr: CONTRACTS.TREASURY },
                ].map((c) => (
                  <a key={c.name} href={LINKS.basescan(c.addr)} target="_blank" rel="noopener"
                     className="group flex items-center justify-between rounded-lg border border-[#1e2230] bg-[#0d0f14] px-4 py-3 transition hover:border-[#5eead4]/30">
                    <span className="text-sm font-medium text-white">{c.name}</span>
                    <span className="font-mono text-xs text-[#5a5f74] group-hover:text-[#5eead4] transition">{truncateAddr(c.addr)}</span>
                  </a>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
