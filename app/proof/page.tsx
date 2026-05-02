import type { Metadata } from 'next';
import Link from 'next/link';
import { CONTRACTS, CHAIN, LINKS } from '@/lib/contracts';

export const metadata: Metadata = {
  title: 'Pyrimid Proof — Live x402 USDC Transactions on Base',
  description: 'Pyrimid proof of routed USDC payments, protocol fees, affiliate payouts, contracts, and BaseScan transaction links.',
  alternates: { canonical: '/proof' },
  openGraph: {
    title: 'Pyrimid Proof — Live x402 USDC Transactions on Base',
    description: 'Auditable onchain proof for Pyrimid payments and affiliate splits.',
    url: '/proof',
    type: 'article',
  },
};

const txs = [
  ['2026-03-18 17:15:11', '0x83a641b27046574d54f1582eb4b183cd770d017c14d7530f6fa3d7252b243cd0', '$0.2500', '$0.0025', '$0.0000', '$0.2475'],
  ['2026-03-18 17:18:31', '0xe43540aa3f5cb95541e4063f6cb018078502556bb0788fff51cea6cb1ae00038', '$0.2500', '$0.0025', '$0.12375', '$0.12375'],
  ['2026-03-18 17:22:39', '0x28f00c2036f60697d0e3b09d49d416ce7919dda300351ca04c65b046e9094ae5', '$0.2500', '$0.0025', '$0.0495', '$0.1980'],
  ['2026-03-18 17:26:25', '0x11cb37766cba58139549e41d97ce07ae86382d1285c4016214cd2c5245c2a73c', '$0.2500', '$0.0025', '$0.0495', '$0.1980'],
];

const stats = [
  ['Total routed volume', '$1.00'],
  ['Routed payments', '4'],
  ['Protocol fees captured', '$0.0100'],
  ['Affiliate payouts', '$0.22275'],
  ['Registered vendors', '3'],
  ['Registered affiliates', '2'],
  ['Onchain products', '8'],
  ['Indexed catalog products', '107'],
];

function short(hash: string) {
  return `${hash.slice(0, 10)}…${hash.slice(-8)}`;
}

export default function ProofPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: 'Pyrimid Proof of Transactions',
    description: 'Onchain proof that Pyrimid has routed real USDC payments through PyrimidRouter on Base mainnet.',
    url: 'https://pyrimid.ai/proof',
    about: ['x402', 'Base', 'USDC', 'agent payments', 'affiliate routing'],
  };

  return (
    <main className="min-h-screen bg-[#08090c] text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="mx-auto max-w-5xl px-6 py-16">
        <nav className="mb-10 flex flex-wrap gap-4 font-mono text-xs text-[#8b90a5]">
          <Link href="/" className="hover:text-[#5eead4]">← Home</Link>
          <Link href="/stats" className="hover:text-[#5eead4]">Live stats</Link>
          <Link href="/quickstart" className="hover:text-[#5eead4]">Quickstart</Link>
          <a href={LINKS.basescan(CONTRACTS.ROUTER)} target="_blank" rel="noopener" className="hover:text-[#5eead4]">Router on BaseScan</a>
        </nav>

        <p className="mb-3 font-mono text-xs font-semibold uppercase tracking-[0.25em] text-[#5eead4]">Proof of payment routing</p>
        <h1 className="max-w-3xl text-4xl font-black tracking-tight md:text-6xl">Pyrimid is live on Base mainnet.</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-[#a3a8b8]">
          These are real x402-style USDC payments routed through <code className="text-[#5eead4]">PyrimidRouter</code>. Not mock counters, not offchain ledgers: BaseScan-verifiable events with protocol fees, affiliate commissions, and vendor shares.
        </p>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded-xl border border-[#1e2230] bg-[#0d0f14] p-5">
              <div className="font-mono text-[10px] uppercase tracking-widest text-[#5a5f74]">{label}</div>
              <div className="mt-2 text-2xl font-bold text-white">{value}</div>
            </div>
          ))}
        </div>

        <section className="mt-14 rounded-2xl border border-[#1e2230] bg-[#0d0f14] p-6">
          <h2 className="text-2xl font-bold">Transaction proof</h2>
          <p className="mt-2 text-sm leading-6 text-[#8b90a5]">Every payment below paid a 1% protocol fee to Treasury and split the remainder between vendor and affiliate according to product settings.</p>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="font-mono text-[10px] uppercase tracking-widest text-[#5a5f74]">
                <tr><th className="py-3">UTC time</th><th>Tx</th><th>Total</th><th>Protocol fee</th><th>Affiliate</th><th>Vendor</th></tr>
              </thead>
              <tbody className="divide-y divide-[#1e2230]">
                {txs.map(([time, hash, total, fee, affiliate, vendor]) => (
                  <tr key={hash} className="text-[#c8ccd8]">
                    <td className="py-4 font-mono text-xs">{time}</td>
                    <td><a href={LINKS.tx(hash)} target="_blank" rel="noopener" className="font-mono text-[#5eead4] hover:underline">{short(hash)}</a></td>
                    <td>{total}</td><td>{fee}</td><td>{affiliate}</td><td>{vendor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-[#1e2230] bg-[#0d0f14] p-6">
            <h2 className="text-xl font-bold">Contracts</h2>
            <div className="mt-4 space-y-3 font-mono text-xs text-[#8b90a5]">
              {Object.entries(CONTRACTS).map(([name, addr]) => (
                <a key={name} href={LINKS.basescan(addr)} target="_blank" rel="noopener" className="block hover:text-[#5eead4]">{name}: {addr}</a>
              ))}
              <div>USDC: {CHAIN.usdc}</div>
            </div>
          </div>
          <div className="rounded-2xl border border-[#1e2230] bg-[#0d0f14] p-6">
            <h2 className="text-xl font-bold">Why this matters</h2>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-[#a3a8b8]">
              <li>• Vendor/product registration exists onchain.</li>
              <li>• USDC payment splits execute in one Router call.</li>
              <li>• Treasury has captured the 1% protocol fee.</li>
              <li>• Catalog, stats API, and MCP discovery are live.</li>
            </ul>
          </div>
        </section>
      </section>
    </main>
  );
}
