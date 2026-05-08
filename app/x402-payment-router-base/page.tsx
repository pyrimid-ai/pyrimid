import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'x402 Payment Router on Base — Pyrimid',
  description: 'Route paid agent API calls with x402 payment requirements, USDC settlement on Base, and onchain fee splits through PyrimidRouter.',
  alternates: { canonical: '/x402-payment-router-base' },
  openGraph: {
    title: 'x402 Payment Router on Base — Pyrimid',
    description: 'x402 payment requirements, Base USDC settlement, and onchain fee splits for paid agent calls.',
    url: 'https://pyrimid.ai/x402-payment-router-base',
    type: 'article',
    images: [{ url: '/og-image-v2.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'x402 Payment Router on Base — Pyrimid',
    description: 'A payment router for agent-native APIs: discover, authorize, settle, split.',
    images: ['/og-image-v2.png'],
  },
};

const box = 'rounded-lg border border-[var(--border)] bg-[var(--bg3)] p-5 text-left';
const code = 'rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-4 font-mono text-[.72rem] leading-[1.8] overflow-x-auto text-left';

export default function X402PaymentRouterBasePage() {
  return (
    <main className="mx-auto max-w-[860px] px-6 py-14">
      <Link href="/" className="font-mono text-sm text-[var(--accent)]">← pyrimid</Link>

      <section className="py-14 text-center">
        <div className="mb-3 font-mono text-[.68rem] uppercase tracking-[2.5px] text-[var(--accent)]">x402 payment router on Base</div>
        <h1 className="mb-5 text-[clamp(2rem,5vw,3.6rem)] font-black leading-[1.04] tracking-[-2px]">
          Paid agent calls need a router, not another checkout page.
        </h1>
        <p className="mx-auto max-w-[620px] text-[.96rem] leading-7 text-[var(--muted)]">
          Pyrimid turns an x402 payment requirement into a Base USDC settlement path with vendor, affiliate, and protocol fee accounting in one route.
        </p>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <div className={box}>
          <div className="mb-2 font-mono text-[.65rem] uppercase tracking-[1.8px] text-[var(--accent)]">01 / Discover</div>
          <h2 className="mb-2 text-lg font-bold">Agent finds a paid capability</h2>
          <p className="text-sm leading-6 text-[var(--muted)]">MCP catalog metadata exposes service, price, route, and settlement hints before the agent calls the API.</p>
        </div>
        <div className={box}>
          <div className="mb-2 font-mono text-[.65rem] uppercase tracking-[1.8px] text-[var(--accent)]">02 / Authorize</div>
          <h2 className="mb-2 text-lg font-bold">Service returns x402</h2>
          <p className="text-sm leading-6 text-[var(--muted)]">The buyer gets a payment requirement instead of an account signup, card form, or manual invoice flow.</p>
        </div>
        <div className={box}>
          <div className="mb-2 font-mono text-[.65rem] uppercase tracking-[1.8px] text-[var(--accent)]">03 / Settle</div>
          <h2 className="mb-2 text-lg font-bold">PyrimidRouter splits USDC</h2>
          <p className="text-sm leading-6 text-[var(--muted)]">Base settlement records vendor payout, affiliate commission, and the 1% protocol fee with tx receipts.</p>
        </div>
      </section>

      <section className="py-12">
        <h2 className="mb-4 text-2xl font-extrabold tracking-[-.5px]">What the route does</h2>
        <div className={code}>
          <span style={{ color: 'var(--accent)' }}>PyrimidRouter</span>.routePayment(vendor, product, affiliate, buyer){'\n'}
          {'  '}├─ verifies vendor + product registration{'\n'}
          {'  '}├─ collects USDC payment on Base{'\n'}
          {'  '}├─ sends 1% protocol fee to treasury{'\n'}
          {'  '}├─ sends vendor-defined affiliate split{'\n'}
          {'  '}└─ sends remaining settlement to vendor
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <div className={box}>
          <h2 className="mb-2 text-xl font-bold">Why Base</h2>
          <p className="text-sm leading-6 text-[var(--muted)]">Low-cost USDC settlement is good enough for high-frequency agent calls. The point is not financial theater; it is payable endpoints with receipts.</p>
        </div>
        <div className={box}>
          <h2 className="mb-2 text-xl font-bold">Why x402</h2>
          <p className="text-sm leading-6 text-[var(--muted)]">HTTP 402 maps cleanly to agent workflows: request, payment requirement, signed payment, response. No dashboard dependency.</p>
        </div>
      </section>

      <section className="mt-12 rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-6 text-center">
        <h2 className="mb-3 text-2xl font-extrabold">Try the live surfaces</h2>
        <div className="flex flex-wrap justify-center gap-3 font-mono text-sm">
          <a href="/api/v1/catalog" className="text-[var(--accent)]">/api/v1/catalog</a>
          <a href="/api/mcp" className="text-[var(--accent)]">/api/mcp</a>
          <a href="/api/v1/stats" className="text-[var(--accent)]">/api/v1/stats</a>
          <a href="/proof" className="text-[var(--accent)]">/proof</a>
        </div>
      </section>
    </main>
  );
}
