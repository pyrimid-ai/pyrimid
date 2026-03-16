import Link from 'next/link';
import { CONTRACTS, CHAIN, LINKS } from '@/lib/contracts';

function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-pyrimid-border/60 bg-pyrimid-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="h-5 w-5 bg-gradient-to-br from-pyrimid-accent to-pyrimid-purple"
               style={{ clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)' }} />
          <span className="text-lg font-bold tracking-tight text-white">Pyrimid</span>
          <span className="rounded-full bg-pyrimid-accent/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-pyrimid-accent">
            v0.2
          </span>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/docs" className="text-sm font-medium text-[#8b90a5] transition hover:text-white">Docs</Link>
          <Link href="/dashboard" className="text-sm font-medium text-[#8b90a5] transition hover:text-white">Dashboard</Link>
          <a href={LINKS.basescan(CONTRACTS.REGISTRY)} target="_blank" rel="noopener"
             className="text-sm font-medium text-[#8b90a5] transition hover:text-white">BaseScan</a>
          <a href={LINKS.sdk} target="_blank" rel="noopener"
             className="rounded-md bg-pyrimid-accent px-3.5 py-1.5 text-sm font-semibold text-pyrimid-bg transition hover:bg-[#99f6e4]">
            npm install
          </a>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-24">
      {/* Geometric background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-20 right-1/4 h-[500px] w-[500px] rotate-45 rounded-3xl bg-pyrimid-accent/[0.03] blur-3xl" />
        <div className="absolute -bottom-20 left-1/4 h-[400px] w-[400px] -rotate-12 rounded-3xl bg-pyrimid-purple/[0.04] blur-3xl" />
        {/* Grid lines */}
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(rgba(30,34,48,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(30,34,48,0.5) 1px, transparent 1px)`,
          backgroundSize: '80px 80px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
        }} />
      </div>

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-pyrimid-border bg-pyrimid-surface px-4 py-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-pyrimid-accent animate-pulse" />
            <span className="font-mono text-xs font-medium text-[#8b90a5]">Live on Base Mainnet</span>
          </div>

          <h1 className="mb-6 text-5xl font-bold tracking-tight leading-[1.1] md:text-6xl lg:text-7xl">
            <span className="text-white">The monetization</span>
            <br />
            <span className="bg-gradient-to-r from-pyrimid-accent to-pyrimid-purple bg-clip-text text-transparent">
              layer agents need
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-[#8b90a5]">
            Onchain affiliate distribution for agent-to-agent commerce.
            Vendors list products. Agents earn commissions. Commission splits settle
            instantly in USDC on Base. Protocol takes 1%.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link href="/docs" className="rounded-lg bg-pyrimid-accent px-6 py-3 text-sm font-bold text-pyrimid-bg transition hover:bg-[#99f6e4] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-pyrimid-accent/20">
              Read the Docs
            </Link>
            <a href={LINKS.sdk} target="_blank" rel="noopener"
               className="group flex items-center gap-2 rounded-lg border border-pyrimid-border bg-pyrimid-surface px-6 py-3 text-sm font-semibold text-white transition hover:border-pyrimid-accent/40 hover:-translate-y-0.5">
              <span className="font-mono text-pyrimid-accent">npm i</span>
              <span className="text-[#8b90a5]">@pyrimid/sdk</span>
            </a>
          </div>
        </div>

        {/* Quick code preview */}
        <div className="mx-auto mt-16 max-w-2xl overflow-hidden rounded-xl border border-pyrimid-border bg-[#0a0c10] shadow-2xl shadow-black/40">
          <div className="flex items-center gap-2 border-b border-pyrimid-border px-4 py-3">
            <div className="h-2.5 w-2.5 rounded-full bg-[#f87171]/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-[#fbbf24]/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-[#4ade80]/60" />
            <span className="ml-3 font-mono text-[11px] text-[#5a5f74]">resolver.ts</span>
          </div>
          <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-7 text-[#8b90a5]">
{`import { `}<span className="text-pyrimid-accent">PyrimidResolver</span>{` } from '@pyrimid/sdk';

const resolver = new `}<span className="text-pyrimid-accent">PyrimidResolver</span>{`({
  affiliateId: `}<span className="text-[#4ade80]">'af_your_id'</span>{`,
});

const product = await resolver.`}<span className="text-[#60a5fa]">findProduct</span>{`(`}<span className="text-[#4ade80]">"btc trading signal"</span>{`);
const receipt = await resolver.`}<span className="text-[#60a5fa]">purchase</span>{`(product, wallet);

console.log(receipt.affiliate_earned); `}<span className="text-[#5a5f74]">// your cut, paid instantly</span>
          </pre>
        </div>
      </div>
    </section>
  );
}

function Paths() {
  const paths = [
    {
      num: '01',
      title: 'Embedded Resolver',
      who: 'Framework Developers',
      desc: 'Embed PyrimidResolver in your agent framework. Every agent on your stack routes purchases through Pyrimid with your affiliate ID. One integration → thousands of passive sales.',
      leverage: 'Highest',
      code: `const resolver = new PyrimidResolver({\n  affiliateId: 'af_your_id'\n});`,
    },
    {
      num: '02',
      title: 'MCP Server',
      who: 'Recommender Operators',
      desc: 'Deploy a catalog server that other agents connect to as a tool. Browse, buy — your affiliate ID on every transaction. Specialize by vertical to outperform the generic catalog.',
      leverage: 'Medium',
      code: `const server = createPyrimidMcpServer({\n  affiliateId: 'af_your_id',\n  serverName: 'trading-recommender'\n});`,
    },
    {
      num: '03',
      title: 'Vendor Middleware',
      who: 'Product Vendors',
      desc: '10 lines to activate affiliate distribution on your existing API. Handles x402 payment verification, affiliate attribution, and commission splitting automatically.',
      leverage: 'Direct',
      code: `app.use(pyrimidMiddleware({\n  vendorId: 'vn_your_id',\n  products: { '/api/signals': {\n    price: 250_000, affiliateBps: 2000\n  }}\n}));`,
    },
  ];

  return (
    <section className="border-t border-pyrimid-border py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16 text-center">
          <p className="mb-3 font-mono text-xs font-semibold uppercase tracking-widest text-pyrimid-accent">Integration Paths</p>
          <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Three ways to earn</h2>
        </div>

        <div className="grid gap-6 md:grid-columns-3 md:grid-cols-3">
          {paths.map((p) => (
            <div key={p.num} className="group rounded-xl border border-pyrimid-border bg-pyrimid-surface p-6 transition hover:border-pyrimid-accent/40 hover:shadow-lg hover:shadow-pyrimid-accent/5">
              <div className="mb-4 flex items-center justify-between">
                <span className="font-mono text-2xl font-bold text-pyrimid-accent/30 group-hover:text-pyrimid-accent/60 transition">{p.num}</span>
                <span className="rounded-full bg-pyrimid-accent/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-pyrimid-accent">
                  {p.leverage}
                </span>
              </div>
              <h3 className="mb-1 text-lg font-bold text-white">{p.title}</h3>
              <p className="mb-3 font-mono text-xs text-pyrimid-accent/70">{p.who}</p>
              <p className="mb-5 text-sm leading-relaxed text-[#8b90a5]">{p.desc}</p>
              <pre className="overflow-x-auto rounded-lg bg-pyrimid-bg p-3 font-mono text-[11px] leading-6 text-[#8b90a5]">{p.code}</pre>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="border-t border-pyrimid-border py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16 text-center">
          <p className="mb-3 font-mono text-xs font-semibold uppercase tracking-widest text-pyrimid-accent">Protocol Mechanics</p>
          <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Every transaction, split onchain</h2>
        </div>

        <div className="mx-auto max-w-3xl">
          {/* Flow diagram */}
          <div className="mb-12 flex flex-col items-center gap-3 font-mono text-sm">
            <div className="flex w-full items-center gap-4 rounded-lg border border-pyrimid-border bg-pyrimid-surface p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#60a5fa]/10 text-[#60a5fa] font-bold">A</div>
              <div>
                <p className="font-semibold text-white">Agent discovers product</p>
                <p className="text-xs text-[#5a5f74]">Via MCP catalog or PyrimidResolver</p>
              </div>
            </div>
            <div className="h-6 w-px bg-pyrimid-border" />
            <div className="flex w-full items-center gap-4 rounded-lg border border-pyrimid-border bg-pyrimid-surface p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pyrimid-orange/10 text-pyrimid-orange font-bold">B</div>
              <div>
                <p className="font-semibold text-white">x402 payment to vendor endpoint</p>
                <p className="text-xs text-[#5a5f74]">USDC on Base, affiliate ID in X-Affiliate-ID header</p>
              </div>
            </div>
            <div className="h-6 w-px bg-pyrimid-border" />
            <div className="flex w-full items-center gap-4 rounded-lg border border-pyrimid-border bg-pyrimid-surface p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pyrimid-purple/10 text-pyrimid-purple font-bold">C</div>
              <div>
                <p className="font-semibold text-white">CommissionRouter splits payment</p>
                <p className="text-xs text-[#5a5f74]">Single onchain tx — 1% protocol, X% affiliate, rest to vendor</p>
              </div>
            </div>
            <div className="h-6 w-px bg-pyrimid-border" />
            <div className="flex w-full items-center gap-4 rounded-lg border border-pyrimid-border bg-pyrimid-surface p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#4ade80]/10 text-[#4ade80] font-bold">D</div>
              <div>
                <p className="font-semibold text-white">Product delivered, reputation updated</p>
                <p className="text-xs text-[#5a5f74]">Vendor serves directly. Affiliate score increases onchain.</p>
              </div>
            </div>
          </div>

          {/* Commission split visual */}
          <div className="rounded-xl border border-pyrimid-border bg-[#0a0c10] p-6">
            <p className="mb-5 font-mono text-xs font-semibold text-[#5a5f74] uppercase tracking-wider">Commission split — $0.25 signal, 20% affiliate</p>
            <div className="space-y-3">
              {[
                { label: 'Protocol', pct: 1, color: '#c084fc', amount: '$0.0025' },
                { label: 'Affiliate', pct: 19.8, color: '#5eead4', amount: '$0.0495' },
                { label: 'Vendor', pct: 79.2, color: '#fb923c', amount: '$0.1980' },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-3">
                  <span className="w-20 font-mono text-xs text-[#5a5f74]">{row.label}</span>
                  <div className="flex-1 overflow-hidden rounded-full bg-pyrimid-border/30 h-3">
                    <div className="h-full rounded-full transition-all duration-700"
                         style={{ width: `${row.pct}%`, backgroundColor: row.color }} />
                  </div>
                  <span className="w-16 text-right font-mono text-xs text-[#8b90a5]">{row.amount}</span>
                  <span className="w-12 text-right font-mono text-[10px] text-[#5a5f74]">{row.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ContractAddresses() {
  const contracts = [
    { name: 'PyrimidRegistry', addr: CONTRACTS.REGISTRY, role: 'Affiliates, vendors, ERC-8004, reputation' },
    { name: 'PyrimidCatalog', addr: CONTRACTS.CATALOG, role: 'Product listings, pricing, commissions' },
    { name: 'PyrimidRouter', addr: CONTRACTS.ROUTER, role: 'Commission splitting engine' },
    { name: 'PyrimidTreasury', addr: CONTRACTS.TREASURY, role: '1% protocol fee accumulator' },
  ];

  return (
    <section className="border-t border-pyrimid-border py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16 text-center">
          <p className="mb-3 font-mono text-xs font-semibold uppercase tracking-widest text-pyrimid-accent">Base Mainnet</p>
          <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Verified on BaseScan</h2>
        </div>

        <div className="mx-auto max-w-3xl space-y-3">
          {contracts.map((c) => (
            <a key={c.name} href={LINKS.basescan(c.addr)} target="_blank" rel="noopener"
               className="group flex items-center gap-4 rounded-xl border border-pyrimid-border bg-pyrimid-surface p-4 transition hover:border-pyrimid-accent/40">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">{c.name}</p>
                <p className="truncate font-mono text-xs text-[#5a5f74] group-hover:text-pyrimid-accent transition">{c.addr}</p>
              </div>
              <p className="hidden text-right text-xs text-[#8b90a5] sm:block">{c.role}</p>
              <span className="text-[#5a5f74] transition group-hover:text-pyrimid-accent">↗</span>
            </a>
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-[#5a5f74]">
            USDC: <span className="font-mono text-xs">{CHAIN.usdc}</span>
            {' · '}
            ERC-8004: <span className="font-mono text-xs">{CHAIN.erc8004}</span>
          </p>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-pyrimid-border py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 sm:flex-row">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 bg-gradient-to-br from-pyrimid-accent to-pyrimid-purple"
               style={{ clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)' }} />
          <span className="font-bold text-white">Pyrimid</span>
          <span className="text-xs text-[#5a5f74]">— Agent-to-agent commerce on Base</span>
        </div>
        <div className="flex gap-6 font-mono text-xs text-[#5a5f74]">
          <Link href="/docs" className="transition hover:text-pyrimid-accent">Docs</Link>
          <Link href="/dashboard" className="transition hover:text-pyrimid-accent">Dashboard</Link>
          <a href={LINKS.sdk} target="_blank" rel="noopener" className="transition hover:text-pyrimid-accent">npm</a>
          <a href={LINKS.basescan(CONTRACTS.REGISTRY)} target="_blank" rel="noopener" className="transition hover:text-pyrimid-accent">BaseScan</a>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <>
      <Nav />
      <Hero />
      <Paths />
      <HowItWorks />
      <ContractAddresses />
      <Footer />
    </>
  );
}
