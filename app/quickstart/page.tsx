import type { Metadata } from 'next';
import Link from 'next/link';
import { CONTRACTS, CHAIN, LINKS } from '@/lib/contracts';

export const metadata: Metadata = {
  title: 'Pyrimid Quickstart — Add x402 USDC Payments to an Agent API',
  description: 'Integrate Pyrimid with an API endpoint: register a vendor, list a product, route USDC payments, and verify splits on Base.',
  alternates: { canonical: '/quickstart' },
  openGraph: {
    title: 'Pyrimid Quickstart — Agent API Payments on Base',
    description: 'A vendor integration quickstart for x402, Base USDC, MCP catalog discovery, and affiliate splits.',
    url: '/quickstart',
    type: 'article',
  },
};

const code = (text: string) => (
  <pre className="overflow-x-auto rounded-xl border border-[#1e2230] bg-[#050609] p-4 font-mono text-xs leading-6 text-[#c8ccd8]"><code>{text}</code></pre>
);

export default function QuickstartPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'Integrate Pyrimid x402 payments into an API endpoint',
    description: 'Register a vendor, list a paid product, route Base USDC payments, and verify Pyrimid affiliate splits.',
    totalTime: 'PT30M',
    supply: ['Base wallet', 'USDC', 'API endpoint'],
    tool: ['@pyrimid/sdk', 'PyrimidRouter', 'Pyrimid MCP'],
  };

  return (
    <main className="min-h-screen bg-[#08090c] text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="mx-auto max-w-4xl px-6 py-16">
        <nav className="mb-10 flex flex-wrap gap-4 font-mono text-xs text-[#8b90a5]">
          <Link href="/" className="hover:text-[#5eead4]">← Home</Link>
          <Link href="/proof" className="hover:text-[#5eead4]">Proof</Link>
          <Link href="/stats" className="hover:text-[#5eead4]">Stats</Link>
          <a href="/docs" className="hover:text-[#5eead4]">Docs</a>
        </nav>

        <p className="mb-3 font-mono text-xs font-semibold uppercase tracking-[0.25em] text-[#5eead4]">Vendor quickstart</p>
        <h1 className="text-4xl font-black tracking-tight md:text-6xl">Turn an API endpoint into an agent-payable product.</h1>
        <p className="mt-6 text-lg leading-8 text-[#a3a8b8]">
          Pyrimid lets agents discover your endpoint through MCP/catalog surfaces, pay in USDC on Base, and route affiliate commissions without you building checkout, attribution, or settlement logic.
        </p>

        <div className="mt-10 rounded-2xl border border-[#1e2230] bg-[#0d0f14] p-6">
          <h2 className="text-2xl font-bold">Mental model</h2>
          <div className="mt-4 text-sm leading-7 text-[#a3a8b8]">
            Agent requests paid endpoint → endpoint requires x402 payment → buyer pays USDC through PyrimidRouter → Router splits protocol fee, affiliate commission, and vendor share → endpoint returns result.
          </div>
        </div>

        <section className="mt-10 space-y-8">
          <div>
            <h2 className="text-2xl font-bold">1. Register vendor</h2>
            <p className="mt-2 text-sm leading-6 text-[#8b90a5]">Create a vendor record pointing to your service and payout address.</p>
            <div className="mt-4">{code(`PyrimidRegistry.registerVendor(\n  name,\n  baseUrl,\n  payoutAddress\n)`)}</div>
          </div>

          <div>
            <h2 className="text-2xl font-bold">2. List product</h2>
            <p className="mt-2 text-sm leading-6 text-[#8b90a5]">Define endpoint, USDC price, and affiliate commission bps. Example: 2000 = 20% affiliate share.</p>
            <div className="mt-4">{code(`PyrimidCatalog.listProduct(\n  vendorId,\n  productId,\n  endpoint,\n  description,\n  priceUsdc,\n  affiliateBps\n)`)}</div>
          </div>

          <div>
            <h2 className="text-2xl font-bold">3. Gate the endpoint</h2>
            <p className="mt-2 text-sm leading-6 text-[#8b90a5]">Target DX for an Express-style API route. Keep your hosting; Pyrimid adds payment + attribution.</p>
            <div className="mt-4">{code(`import { pyrimidGate } from '@pyrimid/sdk';\n\napp.post('/paid/run', pyrimidGate({\n  vendorId: '0x...',\n  productId: 1,\n  priceUsdc: 100000, // $0.10\n}), async (req, res) => {\n  const output = await runService(req.body);\n  res.json(output);\n});`)}</div>
          </div>

          <div>
            <h2 className="text-2xl font-bold">4. Route payment</h2>
            <p className="mt-2 text-sm leading-6 text-[#8b90a5]">Buyer approves USDC, then the Router settles vendor, affiliate, and protocol in one call.</p>
            <div className="mt-4">{code(`PyrimidRouter.routePayment(\n  vendorId,\n  productId,\n  affiliateId,\n  buyer,\n  maxPrice\n)`)}</div>
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-[#1e2230] bg-[#0d0f14] p-6">
          <h2 className="text-2xl font-bold">Minimal verification</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-6 text-[#a3a8b8]">
            <li>Product appears in <a href="/api/v1/catalog" className="text-[#5eead4]">/api/v1/catalog</a>.</li>
            <li>Payment emits <code>PaymentRouted</code> on Base.</li>
            <li><a href="/api/v1/stats" className="text-[#5eead4]">/api/v1/stats</a> increments.</li>
            <li>Vendor receives USDC.</li>
            <li>Treasury receives the 1% protocol fee.</li>
          </ol>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-[#1e2230] bg-[#0d0f14] p-6">
            <h2 className="text-xl font-bold">Current example product</h2>
            <div className="mt-4 space-y-2 font-mono text-xs text-[#8b90a5]">
              <div>Vendor: Receipts</div>
              <div>Product: onchain_0xcdef72_1</div>
              <div>Endpoint: https://api.leoclaw.cc/analyze</div>
              <div>Price: $0.10 USDC</div>
              <div>Affiliate commission: 2000 bps</div>
            </div>
          </div>
          <div className="rounded-2xl border border-[#1e2230] bg-[#0d0f14] p-6">
            <h2 className="text-xl font-bold">Contracts</h2>
            <div className="mt-4 space-y-2 font-mono text-xs text-[#8b90a5]">
              <a href={LINKS.basescan(CONTRACTS.ROUTER)} target="_blank" rel="noopener" className="block hover:text-[#5eead4]">Router: {CONTRACTS.ROUTER}</a>
              <a href={LINKS.basescan(CONTRACTS.REGISTRY)} target="_blank" rel="noopener" className="block hover:text-[#5eead4]">Registry: {CONTRACTS.REGISTRY}</a>
              <a href={LINKS.basescan(CONTRACTS.CATALOG)} target="_blank" rel="noopener" className="block hover:text-[#5eead4]">Catalog: {CONTRACTS.CATALOG}</a>
              <div>USDC: {CHAIN.usdc}</div>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
