import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Agent Payments with Affiliate Splits — Pyrimid',
  description: 'Onchain affiliate splits for agent-to-agent payments. Vendors set commission, agents route demand, Pyrimid settles USDC on Base.',
  alternates: { canonical: '/agent-payments-affiliate-splits' },
  openGraph: {
    title: 'Agent Payments with Affiliate Splits — Pyrimid',
    description: 'Vendors set commission. Agents route demand. Pyrimid settles the split onchain.',
    url: 'https://pyrimid.ai/agent-payments-affiliate-splits',
    type: 'article',
    images: [{ url: '/og-image-v2.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Agent Payments with Affiliate Splits — Pyrimid',
    description: 'Affiliate attribution and USDC settlement for paid agent calls.',
    images: ['/og-image-v2.png'],
  },
};

const box = 'rounded-lg border border-[var(--border)] bg-[var(--bg3)] p-5 text-left';

export default function AgentPaymentsAffiliateSplitsPage() {
  return (
    <main className="mx-auto max-w-[860px] px-6 py-14">
      <Link href="/" className="font-mono text-sm text-[var(--accent)]">← pyrimid</Link>

      <section className="py-14 text-center">
        <div className="mb-3 font-mono text-[.68rem] uppercase tracking-[2.5px] text-[var(--accent)]">agent payments with affiliate splits</div>
        <h1 className="mb-5 text-[clamp(2rem,5vw,3.6rem)] font-black leading-[1.04] tracking-[-2px]">
          Agents will distribute products when the payment rail pays them back.
        </h1>
        <p className="mx-auto max-w-[620px] text-[.96rem] leading-7 text-[var(--muted)]">
          Pyrimid lets vendors attach commission to paid API calls. Buyer agents pay once, and the router splits USDC between vendor, affiliate, and protocol treasury.
        </p>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <div className={box}>
          <h2 className="mb-2 text-xl font-bold">The old affiliate model</h2>
          <p className="text-sm leading-6 text-[var(--muted)]">Links, cookies, manual payouts, dashboards, and human checkout flows. Fine for web users. Bad for autonomous agents.</p>
        </div>
        <div className={box}>
          <h2 className="mb-2 text-xl font-bold">The agent-native model</h2>
          <p className="text-sm leading-6 text-[var(--muted)]">A route, a price, a payment requirement, and a deterministic split. The receipt is the attribution layer.</p>
        </div>
      </section>

      <section className="py-12">
        <h2 className="mb-5 text-2xl font-extrabold tracking-[-.5px]">Split anatomy</h2>
        <div className="grid gap-3 md:grid-cols-4">
          {[
            ['Buyer agent', 'Pays for the capability it needs.'],
            ['Affiliate agent', 'Earns for routing the buyer.'],
            ['Vendor', 'Keeps the remainder and delivers directly.'],
            ['Treasury', 'Receives the 1% protocol fee.'],
          ].map(([title, body]) => (
            <div key={title} className={box}>
              <div className="mb-2 font-mono text-[.65rem] uppercase tracking-[1.8px] text-[var(--accent)]">{title}</div>
              <p className="text-sm leading-6 text-[var(--muted)]">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-5 font-mono text-[.72rem] leading-[1.8]">
        vendor sets: product price + affiliateBps{'\n'}
        buyer pays: USDC on Base{'\n'}
        router sends: affiliate commission + vendor settlement + protocol fee{'\n'}
        everyone gets: transaction receipt
      </section>

      <section className="mt-12 grid gap-3 md:grid-cols-3">
        <div className={box}>
          <h2 className="mb-2 text-lg font-bold">For vendors</h2>
          <p className="text-sm leading-6 text-[var(--muted)]">Offer commission without building an affiliate dashboard or payout engine.</p>
        </div>
        <div className={box}>
          <h2 className="mb-2 text-lg font-bold">For agents</h2>
          <p className="text-sm leading-6 text-[var(--muted)]">Recommend useful services and get paid when another agent buys through your route.</p>
        </div>
        <div className={box}>
          <h2 className="mb-2 text-lg font-bold">For buyers</h2>
          <p className="text-sm leading-6 text-[var(--muted)]">Pay once, get the API result, and keep the transaction legible.</p>
        </div>
      </section>

      <section className="mt-12 rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-6 text-center">
        <h2 className="mb-3 text-2xl font-extrabold">See the proof path</h2>
        <div className="flex flex-wrap justify-center gap-3 font-mono text-sm">
          <a href="/proof" className="text-[var(--accent)]">/proof</a>
          <a href="/stats" className="text-[var(--accent)]">/stats</a>
          <a href="/quickstart" className="text-[var(--accent)]">/quickstart</a>
        </div>
      </section>
    </main>
  );
}
