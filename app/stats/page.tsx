import type { Metadata } from 'next';
import Link from 'next/link';
import { CONTRACTS, LINKS } from '@/lib/contracts';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Pyrimid Stats — Protocol Volume, Vendors, Products, and Fees',
  description: 'Live Pyrimid protocol stats for x402 USDC volume, routed payments, vendors, affiliates, products, treasury fees, and catalog sources.',
  alternates: { canonical: '/stats' },
  openGraph: {
    title: 'Pyrimid Stats — Live Agent Commerce Metrics',
    description: 'Protocol stats for Pyrimid on Base: volume, transactions, vendors, affiliates, products, and treasury fees.',
    url: '/stats',
    type: 'website',
  },
};

type Stats = {
  protocol?: {
    total_volume_display?: string;
    total_transactions?: number;
    total_affiliates?: number;
    total_vendors?: number;
    total_products_onchain?: number;
    treasury_balance_display?: string;
  };
  catalog?: { total_products?: number; sources?: Record<string, number>; categories?: Record<string, number> };
};

async function getStats(): Promise<Stats | null> {
  try {
    const res = await fetch('https://pyrimid.ai/api/v1/stats?type=protocol', { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function StatsPage() {
  const stats = await getStats();
  const protocol = stats?.protocol;
  const catalog = stats?.catalog;
  const cards = [
    ['Total volume', protocol?.total_volume_display ?? '$1.00', 'USDC routed on Base'],
    ['Transactions', String(protocol?.total_transactions ?? 4), 'PyrimidRouter payments'],
    ['Treasury fees', protocol?.treasury_balance_display ?? '$0.0100', '1% protocol fee'],
    ['Affiliates', String(protocol?.total_affiliates ?? 2), 'registered distributors'],
    ['Vendors', String(protocol?.total_vendors ?? 3), 'registered vendors'],
    ['Onchain products', String(protocol?.total_products_onchain ?? 8), 'Base catalog listings'],
    ['Indexed products', String(catalog?.total_products ?? 107), 'catalog + registry sources'],
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Pyrimid Protocol Stats',
    description: 'Live metrics for Pyrimid agent commerce protocol on Base.',
    url: 'https://pyrimid.ai/stats',
    distribution: [{ '@type': 'DataDownload', contentUrl: 'https://pyrimid.ai/api/v1/stats' }],
  };

  return (
    <main className="min-h-screen bg-[#08090c] text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="mx-auto max-w-5xl px-6 py-16">
        <nav className="mb-10 flex flex-wrap gap-4 font-mono text-xs text-[#8b90a5]">
          <Link href="/" className="hover:text-[#5eead4]">← Home</Link>
          <Link href="/proof" className="hover:text-[#5eead4]">Proof</Link>
          <Link href="/quickstart" className="hover:text-[#5eead4]">Quickstart</Link>
          <a href="/api/v1/stats" className="hover:text-[#5eead4]">Stats API</a>
        </nav>

        <p className="mb-3 font-mono text-xs font-semibold uppercase tracking-[0.25em] text-[#5eead4]">Live protocol stats</p>
        <h1 className="text-4xl font-black tracking-tight md:text-6xl">Pyrimid metrics for agent commerce.</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-[#a3a8b8]">
          Public metrics for routed USDC volume, transaction count, vendors, affiliates, onchain products, indexed catalog size, and treasury fees. Data source: <a href="/api/v1/stats" className="text-[#5eead4]">/api/v1/stats</a>.
        </p>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(([label, value, sub]) => (
            <div key={label} className="rounded-xl border border-[#1e2230] bg-[#0d0f14] p-5">
              <div className="font-mono text-[10px] uppercase tracking-widest text-[#5a5f74]">{label}</div>
              <div className="mt-2 text-3xl font-bold text-white">{value}</div>
              <div className="mt-1 font-mono text-xs text-[#8b90a5]">{sub}</div>
            </div>
          ))}
        </div>

        <section className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-[#1e2230] bg-[#0d0f14] p-6">
            <h2 className="text-xl font-bold">Catalog sources</h2>
            <div className="mt-4 space-y-2 text-sm text-[#a3a8b8]">
              {catalog?.sources ? Object.entries(catalog.sources).sort((a, b) => b[1] - a[1]).map(([source, count]) => (
                <div key={source} className="flex justify-between border-b border-[#1e2230] py-2"><span>{source}</span><span className="font-mono text-[#5eead4]">{count}</span></div>
              )) : <p>Source breakdown available from the live API.</p>}
            </div>
          </div>
          <div className="rounded-2xl border border-[#1e2230] bg-[#0d0f14] p-6">
            <h2 className="text-xl font-bold">Verify</h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-[#a3a8b8]">
              <a href="/dashboard" className="block text-[#5eead4] hover:underline">Open live dashboard →</a>
              <a href={LINKS.basescan(CONTRACTS.ROUTER)} target="_blank" rel="noopener" className="block text-[#5eead4] hover:underline">Router on BaseScan →</a>
              <a href="/api/v1/catalog" className="block text-[#5eead4] hover:underline">Catalog API →</a>
              <a href="/api/mcp" className="block text-[#5eead4] hover:underline">MCP endpoint →</a>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
