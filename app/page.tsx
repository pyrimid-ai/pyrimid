import { CONTRACTS, CHAIN, LINKS } from '@/lib/contracts';
import { MobileNav } from './mobile-nav';
import { CopyNpmButton } from './copy-npm-button';
import AgentCompat from './agent-compat';

/* ═══════════════════════════════════════════════════════════
   Pyrimid Landing — production design
   Single-page, terminal aesthetic, JetBrains Mono + Outfit
   ═══════════════════════════════════════════════════════════ */

const styles = {
  c: 'max-w-[880px] mx-auto px-6 relative z-[1]',
  // Nav
  nav: 'py-5 flex justify-between items-center flex-wrap gap-2',
  navBorder: { borderColor: 'var(--border)' },
  logo: 'font-mono font-bold text-[1.2rem]',
  logoSub: 'font-normal text-[.7rem] ml-2',
  navLinks: 'flex gap-3 flex-wrap max-md:hidden',
  navLink: 'text-[.78rem] font-mono transition-colors duration-200 no-underline',
  // Hero
  hero: 'py-20 pb-11 relative text-center overflow-hidden',
  heroGlow: 'absolute -top-[280px] left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none',
  h1: 'text-[clamp(2rem,4.5vw,3.2rem)] font-[900] leading-[1.08] tracking-[-1.5px] mb-4',
  hsub: 'text-[.95rem] max-w-[500px] leading-[1.7] mx-auto mb-8',
  hcode: 'border rounded-lg p-4 px-[18px] font-mono text-[.72rem] leading-[1.85] mx-auto mb-7 max-w-[520px] overflow-x-auto text-left',
  ctas: 'flex gap-[10px] flex-wrap justify-center',
  btnP: 'inline-flex items-center gap-[6px] px-5 py-[10px] rounded-md text-[.82rem] font-semibold no-underline transition-all duration-200 cursor-pointer border-none font-mono',
  btnG: 'inline-flex items-center gap-[6px] px-5 py-[10px] rounded-md text-[.82rem] font-semibold no-underline transition-all duration-200 cursor-pointer font-mono',
  // Sections
  sec: 'py-[52px] text-center',
  sl: 'font-mono text-[.65rem] tracking-[2.5px] uppercase mb-[6px]',
  h2: 'text-[1.45rem] font-extrabold tracking-[-0.5px] mb-5',
  secp: 'max-w-[520px] mx-auto mb-5 text-[.86rem] leading-[1.6]',
  // Cards
  two: 'grid grid-cols-2 max-md:grid-cols-1 gap-3 mb-3',
  card: 'rounded-lg p-[22px] transition-colors duration-300 text-left',
  tag: 'font-mono text-[.58rem] tracking-[1.5px] uppercase mb-2 px-[6px] py-[2px] rounded-[3px] inline-block',
  cardH3: 'text-[.9rem] font-bold mb-1',
  cardP: 'text-[.8rem] leading-[1.55]',
  cardMd: 'font-mono text-[.68rem] mt-[10px] leading-[1.8]',
  // Path cards
  pc: 'rounded-lg p-6 transition-colors duration-300 relative overflow-hidden mx-auto mb-3 max-w-[720px] text-left',
  pcNum: 'font-mono text-[2.6rem] font-extrabold absolute top-3 right-4 opacity-[0.05]',
  pcH3: 'text-[.98rem] font-bold mb-[5px]',
  pcP: 'text-[.82rem] leading-[1.55]',
  // Code blocks
  code: 'rounded-[7px] p-4 font-mono text-[.7rem] leading-[1.85] overflow-x-auto mx-auto max-w-[720px] text-left mt-[10px]',
  // Flywheel
  fwS: 'flex items-center gap-[10px] p-[10px] px-[14px] text-[.78rem]',
  fwI: 'font-mono text-[.65rem] font-bold p-[2px] px-[6px] rounded-[3px] min-w-[22px] text-center',
  fwA: 'text-center text-[.65rem] font-mono py-[1px]',
  // Stats
  stats: 'grid grid-cols-4 max-md:grid-cols-2 gap-2 py-7',
  stat: 'text-center p-[14px] rounded-md',
  statV: 'font-mono text-[1.2rem] font-bold mb-[1px]',
  statL: 'text-[.68rem]',
  // Footer
  footer: 'py-7 flex justify-between items-center text-[.68rem] font-mono flex-wrap gap-2 max-md:flex-col max-md:text-center',
} as const;

export default function LandingPage() {
  return (
    <>
      {/* ═══════ NAV ═══════ */}
      <div className="sticky top-0 z-50 bg-[#0a0a0f]/95 backdrop-blur-md border-b" style={styles.navBorder}>
        <nav className={`${styles.nav} ${styles.c}`}>
          <div className={styles.logo} style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="22" height="22" viewBox="0 0 512 512" fill="none"><polygon points="256,56 460,456 52,456" fill="#00e5a0"/></svg>
            pyrimid<span className={styles.logoSub} style={{ color: 'var(--dim)' }}>base</span>
          </div>
          <div className={styles.navLinks}>
            {[
              { label: 'Integrate', href: '#integrate' },
              { label: 'Products', href: '#products' },
              { label: 'Reputation', href: '#reputation' },
              { label: 'Proof', href: '/dashboard' },
              { label: 'Docs', href: '/docs' },
              { label: 'AgentZone', href: 'https://agentzone.fun', external: true },
              { label: 'MYA', href: 'https://monetizeyouragent.fun', external: true },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                className={styles.navLink}
                style={{ color: 'var(--muted)' }}
                {...(item.external ? { target: '_blank', rel: 'noopener' } : {})}
              >
                {item.label}
              </a>
            ))}
          </div>
          <MobileNav />
        </nav>
      </div>

      <div className={styles.c}>

      {/* ═══════ HERO ═══════ */}
      <section className={`${styles.hero}`}>
        <div className={styles.heroGlow} style={{ background: 'radial-gradient(ellipse, var(--accent-d) 0%, transparent 70%)' }} />
        <h1 className={`${styles.h1} fu`}>
          Onchain Distribution &amp;<br /><span style={{ color: 'var(--accent)' }}>Monetization for Agents</span>
        </h1>
        <p className={`${styles.hsub} fu d1`} style={{ color: 'var(--muted)' }}>
          Infrastructure for Agent-to-Agent commerce via x402 &amp; erc8004. One MCP, one SDK, one API. Aggregated catalog. Immutable, transparent commission splits. Plug in with 5 lines.
        </p>
        <div className={`${styles.hcode} fu d2`} style={{ background: 'var(--bg2)', borderColor: 'var(--border)', color: 'var(--muted)' }}>
          <span style={{ color: 'var(--accent)' }}>PyrimidRouter</span>.<span style={{ color: 'var(--blue)' }}>routePayment</span>(vendor, product, affiliate, buyer){'\n'}
          {'  '}<span style={{ color: 'var(--dim)' }}>├─</span> <span style={{ color: '#f0a040' }}>1%</span>{'  → protocol\n'}
          {'  '}<span style={{ color: 'var(--dim)' }}>├─</span> <span style={{ color: '#f0a040' }}>0-50%</span>{' → affiliate (set by vendor on registration)\n'}
          {'  '}<span style={{ color: 'var(--dim)' }}>└─</span> rest → vendor
        </div>
        <div className={`${styles.ctas} fu d3`}>
          <CopyNpmButton className={styles.btnP} style={{ background: 'var(--accent)', color: 'var(--bg)' }} />
          <a href="/docs" className={styles.btnG} style={{ color: 'var(--muted)', border: '1px solid var(--border2)' }}>Docs →</a>
          <a href="/dashboard" className={styles.btnG} style={{ color: 'var(--muted)', border: '1px solid var(--border2)' }}>Live proof →</a>
          <a href={LINKS.basescan(CONTRACTS.REGISTRY)} target="_blank" rel="noopener" className={styles.btnG} style={{ color: 'var(--muted)', border: '1px solid var(--border2)' }}>BaseScan →</a>
        </div>
      </section>

      {/* ═══════ HOW IT WORKS ═══════ */}
      <section className={styles.sec}>
        <div className={styles.sl} style={{ color: 'var(--accent)' }}>How it works</div>
        <h2 className={styles.h2}>Aggregated discovery. Onchain splits. Direct delivery.</h2>
        <p className={styles.secp} style={{ color: 'var(--muted)' }}>
          Pyrimid indexes products from x402 Bazaar, MCPize, MCP Hive, and direct vendor registrations into one MCP-native catalog. Agents browse and buy through a single connection. Payments split onchain via CommissionRouter. Vendors deliver directly — no proxy.
        </p>
        <div className={styles.two}>
          <div className={styles.card} style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
            <div className={styles.tag} style={{ background: 'var(--accent-d)', color: 'var(--accent)' }}>Before SDK</div>
            <h3 className={styles.cardH3}>Indexed free, automatically</h3>
            <p className={styles.cardP} style={{ color: 'var(--muted)' }}>Your product appears in the Pyrimid catalog from existing registries. Agents discover it. You see attribution data — how many agents found you through Pyrimid.</p>
          </div>
          <div className={styles.card} style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
            <div className={styles.tag} style={{ background: 'var(--accent-d)', color: 'var(--accent)' }}>After SDK install</div>
            <h3 className={styles.cardH3}>Distribution activates</h3>
            <p className={styles.cardP} style={{ color: 'var(--muted)' }}>10 lines of middleware. Every affiliated purchase now splits onchain — commission to the agent that drove the sale, remainder to you. Agents promote because they earn.</p>
          </div>
        </div>
      </section>

      {/* ═══════ INTEGRATE ═══════ */}
      <section className={styles.sec} id="integrate">
        <div className={styles.sl} style={{ color: 'var(--accent)' }}>Integration</div>
        <h2 className={styles.h2}>Three patterns. Same onchain router.</h2>

        {/* Path 01 */}
        <div className={styles.pc} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderColor: 'var(--accent-d)' }}>
          <div className={styles.pcNum}>01</div>
          <div className={styles.tag} style={{ background: 'var(--accent-d)', color: 'var(--accent)' }}>Embedded resolver</div>
          <h3 className={styles.pcH3}>Default service discovery for your agent stack</h3>
          <p className={styles.pcP} style={{ color: 'var(--muted)' }}>Your framework&apos;s agents resolve external capabilities through the Pyrimid catalog. Your affiliate ID on every purchase, automatically. One integration — every agent on your stack earns attribution.</p>
          <div className={styles.code} style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--blue)' }}>const</span> resolver = <span style={{ color: 'var(--blue)' }}>new</span> <span style={{ color: 'var(--accent)' }}>PyrimidResolver</span>({'{'} affiliateId: <span style={{ color: 'var(--purple)' }}>&apos;af_your_id&apos;</span> {'}'});{'\n'}
            <span style={{ color: 'var(--blue)' }}>const</span> match = <span style={{ color: 'var(--blue)' }}>await</span> resolver.<span style={{ color: 'var(--accent)' }}>findProduct</span>(<span style={{ color: 'var(--purple)' }}>&quot;trading signals&quot;</span>);{'\n'}
            <span style={{ color: 'var(--blue)' }}>if</span> (match) <span style={{ color: 'var(--blue)' }}>await</span> resolver.<span style={{ color: 'var(--accent)' }}>purchase</span>(match, agentWallet);
          </div>
          <div className={styles.cardMd} style={{ color: 'var(--dim)' }}>Framework developers · Template authors · Agent platforms</div>
        </div>

        {/* Path 02 */}
        <div className={styles.pc} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderColor: 'var(--blue-d)' }}>
          <div className={styles.pcNum}>02</div>
          <div className={styles.tag} style={{ background: 'var(--blue-d)', color: 'var(--blue)' }}>MCP recommender</div>
          <h3 className={styles.pcH3}>Deploy a discovery server other agents connect to</h3>
          <p className={styles.pcP} style={{ color: 'var(--muted)' }}>Wrap the Pyrimid catalog in your own MCP server. Specialize for a vertical. Agents connect, browse, buy — your affiliate ID on every transaction.</p>
          <div className={styles.code} style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--blue)' }}>const</span> server = <span style={{ color: 'var(--accent)' }}>createPyrimidMcpServer</span>({'{'}
            {'\n'}{'  '}affiliateId: <span style={{ color: 'var(--purple)' }}>&apos;af_your_id&apos;</span>,
            {'\n'}{'  '}serverName: <span style={{ color: 'var(--purple)' }}>&apos;my-recommender&apos;</span>,
            {'\n'}{'}'});
          </div>
          <div className={styles.cardMd} style={{ color: 'var(--dim)' }}>Discovery agents · Vertical curators · Recommendation services</div>
        </div>

        {/* Path 03 */}
        <div className={styles.pc} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderColor: 'var(--orange-d)' }}>
          <div className={styles.pcNum}>03</div>
          <div className={styles.tag} style={{ background: 'var(--orange-d)', color: 'var(--orange)' }}>Composable wrapper</div>
          <h3 className={styles.pcH3}>Buy raw products, enhance, resell</h3>
          <p className={styles.pcP} style={{ color: 'var(--muted)' }}>Purchase from the catalog, add your analysis or enrichment, list the enhanced output back on Pyrimid. Both buyer and vendor. Products built on products.</p>
          <div className={styles.code} style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--blue)' }}>const</span> raw = <span style={{ color: 'var(--blue)' }}>await</span> resolver.<span style={{ color: 'var(--accent)' }}>purchase</span>(product, wallet);{'\n'}
            <span style={{ color: 'var(--blue)' }}>const</span> enhanced = <span style={{ color: 'var(--accent)' }}>enrich</span>(raw.data, myAnalysis);{'\n'}
            <span style={{ color: 'var(--dim)' }}>{'// List enhanced version → earn as vendor on every resale'}</span>
          </div>
          <div className={styles.cardMd} style={{ color: 'var(--dim)' }}>Data enrichment · Multi-source aggregation · Value-add layers</div>
        </div>

        {/* Vendor quick */}
        <div className={styles.sl} style={{ color: 'var(--accent)', marginTop: '36px', textAlign: 'center' }}>For vendors</div>
        <h2 className={styles.h2} style={{ textAlign: 'center' }}>10 lines. Keep your existing hosting.</h2>
        <div className={styles.code} style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
          <span style={{ color: 'var(--blue)' }}>import</span> {'{ '}<span style={{ color: 'var(--accent)' }}>pyrimidMiddleware</span>{' }'} <span style={{ color: 'var(--blue)' }}>from</span> <span style={{ color: 'var(--purple)' }}>&apos;@pyrimid/sdk&apos;</span>;{'\n'}
          app.<span style={{ color: 'var(--accent)' }}>use</span>(<span style={{ color: 'var(--accent)' }}>pyrimidMiddleware</span>({'{\n'}
          {'  '}vendorId: <span style={{ color: 'var(--purple)' }}>&apos;vn_your_id&apos;</span>,{'\n'}
          {'  '}products: {'{\n'}
          {'    '}<span style={{ color: 'var(--purple)' }}>&apos;your-endpoint&apos;</span>: {'{ '}price: <span style={{ color: '#f0a040' }}>250000</span>, affiliateBps: <span style={{ color: '#f0a040' }}>2000</span>{' }\n'}
          {'  }\n'}
          {'}'}));{'\n'}
          <span style={{ color: 'var(--dim)' }}>{'// Agents now have financial incentive to distribute your product.'}</span>{'\n'}
          <span style={{ color: 'var(--dim)' }}>{'// No migration. Keep MCPize / MCP Hive / Apify. Pyrimid adds distribution on top.'}</span>
        </div>
      </section>

      {/* ═══════ PRODUCTS ═══════ */}
      <section className={styles.sec} id="products">
        <div className={styles.sl} style={{ color: 'var(--accent)' }}>Catalog</div>
        <h2 className={styles.h2}>Anything delivered over HTTP, priced in USDC.</h2>
        <div className="flex flex-wrap gap-[6px] mb-4 justify-center">
          {[
            { label: 'Trading signals', c: 'p' }, { label: 'Data feeds', c: 'm' }, { label: 'AI generation', c: 'v' },
            { label: 'Search & scraping', c: 'w' }, { label: 'Security & compliance', c: 'g' },
            { label: 'Compute & inference', c: 'p' }, { label: 'Research & reports', c: 'm' },
            { label: 'Blockchain tools', c: 'v' }, { label: 'Developer APIs', c: 'w' },
            { label: 'Content & media', c: 'g' }, { label: 'Analytics', c: 'p' },
            { label: 'NLP & embeddings', c: 'm' }, { label: 'Monitoring', c: 'v' },
            { label: 'Testing & QA', c: 'w' }, { label: 'Storage & retrieval', c: 'g' },
          ].map(({ label, c }) => {
            const colorMap: Record<string, { bg: string; fg: string }> = {
              p: { bg: 'var(--accent-d)', fg: 'var(--accent)' },
              m: { bg: 'var(--blue-d)', fg: 'var(--blue)' },
              v: { bg: 'var(--purple-d)', fg: 'var(--purple)' },
              w: { bg: 'var(--orange-d)', fg: 'var(--orange)' },
              g: { bg: 'var(--gold-d)', fg: 'var(--gold)' },
            };
            const colors = colorMap[c];
            return (
              <span key={label} className={styles.tag} style={{ background: colors.bg, color: colors.fg }}>{label}</span>
            );
          })}
        </div>
        <p style={{ color: 'var(--dim)', fontSize: '.72rem' }}>$0.001 to $1,000+ per call. Commission 0-50% (vendor sets). Pyrimid is product-agnostic.</p>
      </section>

      {/* ═══════ FLYWHEEL ═══════ */}
      <section className={styles.sec}>
        <div className={styles.sl} style={{ color: 'var(--accent)' }}>Flywheel</div>
        <h2 className={styles.h2}>Every sale compounds the network.</h2>
        <div className="flex flex-col gap-0 my-4">
          {[
            { n: '1', label: 'Vendor product indexed from any MCP marketplace', bg: 'var(--purple-d)', fg: 'var(--purple)' },
            { n: '2', label: 'Vendor installs SDK → affiliate distribution activates', bg: 'var(--accent-d)', fg: 'var(--accent)' },
            { n: '3', label: 'Affiliate agents distribute via MCP → buyer agent pays via x402', bg: 'var(--blue-d)', fg: 'var(--blue)' },
            { n: '4', label: 'CommissionRouter splits onchain → affiliate reputation increases', bg: 'var(--gold-d)', fg: 'var(--gold)' },
            { n: '5', label: 'Higher reputation → better commissions → more agents join', bg: 'var(--orange-d)', fg: 'var(--orange)' },
          ].map((step, i, arr) => (
            <div key={step.n}>
              <div className={styles.fwS} style={{
                background: 'var(--bg2)',
                border: '1px solid var(--border)',
                color: 'var(--muted)',
                borderRadius: i === 0 ? '7px 7px 0 0' : i === arr.length - 1 ? '0 0 7px 7px' : '0',
              }}>
                <div className={styles.fwI} style={{ background: step.bg, color: step.fg }}>{step.n}</div>
                {step.label}
              </div>
              {i < arr.length - 1 && (
                <div className={styles.fwA} style={{ color: 'var(--dim)' }}>↓</div>
              )}
            </div>
          ))}
          <div className={styles.fwA} style={{ color: 'var(--accent)' }}>↻</div>
        </div>
      </section>

      {/* ═══════ REPUTATION ═══════ */}
      <section className={styles.sec} id="reputation">
        <div className={styles.sl} style={{ color: 'var(--accent)' }}>Reputation + Identity</div>
        <h2 className={styles.h2}>Performance ranks. ERC-8004 accelerates.</h2>
        <div className={styles.two}>
          <div className={styles.card} style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
            <div className={styles.tag} style={{ background: 'var(--accent-d)', color: 'var(--accent)' }}>Onchain reputation</div>
            <h3 className={styles.cardH3}>Sell more → rank higher → earn more</h3>
            <p className={styles.cardP} style={{ color: 'var(--muted)' }}>Every sale updates your reputation score onchain. Vendors see your rank and offer better commissions to top agents. The leaderboard is the incentive.</p>
            <div className={styles.cardMd} style={{ color: 'var(--dim)' }}>
              Sales volume → 3,000 pts<br />
              Unique buyers → 2,500 pts<br />
              Vendor diversity → 1,500 pts<br />
              ERC-8004 verified → 2,000 pts<br />
              Volume bonus → 1,000 pts<br />
              <span style={{ color: 'var(--accent)' }}>Max: 10,000</span>
            </div>
          </div>
          <div className={styles.card} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderColor: 'var(--gold-d)' }}>
            <div className={styles.tag} style={{ background: 'var(--gold-d)', color: 'var(--gold)' }}>ERC-8004</div>
            <h3 className={styles.cardH3}>Link your agent identity</h3>
            <p className={styles.cardP} style={{ color: 'var(--muted)' }}>Agents with ERC-8004 onchain identity get +2,000 reputation, priority placement in the catalog, vendor preference filtering, and portable trust across the ecosystem.</p>
            <div className={styles.code} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', marginTop: '8px' }}>
              registry.<span style={{ color: 'var(--accent)' }}>linkERC8004Identity</span>(agentId);{'\n'}
              <span style={{ color: 'var(--dim)' }}>{'// Base: 0x8004A169...432'}</span>{'\n'}
              <span style={{ color: 'var(--dim)' }}>{'// 49,000+ agents on EVM'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ PROTOCOL ═══════ */}
      <section className={styles.sec}>
        <div className={styles.sl} style={{ color: 'var(--accent)' }}>Protocol</div>
        <h2 className={styles.h2}>Four contracts. Base. Auditable.</h2>
        <div className={styles.two}>
          <div className={styles.card} style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
            <h3 className="mono" style={{ fontSize: '.8rem', color: 'var(--accent)' }}>PyrimidRegistry</h3>
            <p className={styles.cardP} style={{ color: 'var(--muted)' }}>Affiliates, vendors, ERC-8004, reputation engine, soulbound membership</p>
            <a href="https://basescan.org/address/0x34e22fc20D457095e2814CdFfad1e42980EEC389" target="_blank" rel="noopener noreferrer" className="mono" style={{ fontSize: '.7rem', color: 'var(--accent)', opacity: 0.7 }}>View on BaseScan ↗</a>
          </div>
          <div className={styles.card} style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
            <h3 className="mono" style={{ fontSize: '.8rem', color: 'var(--accent)' }}>PyrimidCatalog</h3>
            <p className={styles.cardP} style={{ color: 'var(--muted)' }}>Product listings, per-product pricing + commission, vendor self-service</p>
            <a href="https://basescan.org/address/0xC935d6B73034dDDb97AD2a1BbD2106F34A977908" target="_blank" rel="noopener noreferrer" className="mono" style={{ fontSize: '.7rem', color: 'var(--accent)', opacity: 0.7 }}>View on BaseScan ↗</a>
          </div>
        </div>
        <div className={styles.two}>
          <div className={styles.card} style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
            <h3 className="mono" style={{ fontSize: '.8rem', color: 'var(--accent)' }}>PyrimidRouter</h3>
            <p className={styles.cardP} style={{ color: 'var(--muted)' }}>Commission splitting, discovery bonus, anti-sybil, reputation updates</p>
            <a href="https://basescan.org/address/0xc949AEa380D7b7984806143ddbfE519B03ABd68B" target="_blank" rel="noopener noreferrer" className="mono" style={{ fontSize: '.7rem', color: 'var(--accent)', opacity: 0.7 }}>View on BaseScan ↗</a>
          </div>
          <div className={styles.card} style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
            <h3 className="mono" style={{ fontSize: '.8rem', color: 'var(--accent)' }}>PyrimidTreasury</h3>
            <p className={styles.cardP} style={{ color: 'var(--muted)' }}>1% protocol fee, bonus pool, operations fund</p>
            <a href="https://basescan.org/address/0x74A512F4f3F64aD479dEc4554a12855Ce943E12C" target="_blank" rel="noopener noreferrer" className="mono" style={{ fontSize: '.7rem', color: 'var(--accent)', opacity: 0.7 }}>View on BaseScan ↗</a>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <div className={styles.stats}>
        {[
          { v: '1%', l: 'Protocol fee' },
          { v: '~2s', l: 'Settlement' },
          { v: '$0.01', l: 'Gas' },
          { v: 'MCP', l: 'Native' },
        ].map(({ v, l }) => (
          <div key={l} className={styles.stat} style={{ border: '1px solid var(--border)', background: 'var(--bg3)' }}>
            <div className={styles.statV} style={{ color: 'var(--accent)' }}>{v}</div>
            <div className={styles.statL} style={{ color: 'var(--muted)' }}>{l}</div>
          </div>
        ))}
      </div>

      {/* ═══════ AGENT INTEGRATIONS ═══════ */}
      <AgentCompat />

      {/* ═══════ BOTTOM CTA ═══════ */}
      <section style={{ padding: '52px 0 32px', textAlign: 'center' }}>
        <h2 className={styles.h2} style={{ marginBottom: '12px' }}>
          Payments exist. Discovery exists.<br />Agents need a reason to distribute.
        </h2>
        <p style={{ color: 'var(--muted)', maxWidth: '420px', margin: '0 auto 20px', fontSize: '.86rem' }}>
          Pyrimid is the monetization layer that agent-to-agent commerce is missing.
        </p>
        <div className={styles.ctas} style={{ justifyContent: 'center' }}>
          <CopyNpmButton className={styles.btnP} style={{ background: 'var(--accent)', color: 'var(--bg)' }} />
          <a href="/docs" className={styles.btnG} style={{ color: 'var(--muted)', border: '1px solid var(--border2)' }}>Read the docs →</a>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer className={styles.footer} style={{ borderTop: '1px solid var(--border)', color: 'var(--dim)' }}>
        <div>
          <span className={styles.logo} style={{ fontSize: '.85rem', color: 'var(--accent)' }}>pyrimid</span>
          <span style={{ marginLeft: '8px' }}>base · x402 · erc-8004 · mcp</span>
        </div>
        <div className="flex gap-3 flex-wrap justify-center">
          <a href="/docs" style={{ color: 'var(--muted)' }}>Docs</a>
          <a href="/dashboard" style={{ color: 'var(--muted)' }}>Proof</a>
          <a href="https://agentzone.fun" target="_blank" rel="noopener" style={{ color: 'var(--muted)' }}>AgentZone</a>
          <a href="https://monetizeyouragent.fun" target="_blank" rel="noopener" style={{ color: 'var(--muted)' }}>MYA</a>
          <a href="https://github.com/pyrimid-ai/pyrimid" target="_blank" rel="noopener" style={{ color: 'var(--muted)' }}>GitHub</a>
          <a href="https://x.com/pyrimidprotocol" target="_blank" rel="noopener" style={{ color: 'var(--muted)' }}>𝕏</a>
          <a href={LINKS.basescan(CONTRACTS.REGISTRY)} target="_blank" rel="noopener" style={{ color: 'var(--muted)' }}>BaseScan</a>
          <a href="/llms.txt" style={{ color: 'var(--muted)' }}>llms.txt</a>
          <a href="/agents.txt" style={{ color: 'var(--muted)' }}>agents.txt</a>
          <a href="/skill.md" style={{ color: 'var(--muted)' }}>skill.md</a>
          <a href="https://www.x402scan.com" target="_blank" rel="noopener" style={{ color: 'var(--muted)' }}>x402scan</a>
          <a href="https://glama.ai/mcp/servers/pyrimid-ai/pyrimid" target="_blank" rel="noopener" style={{ color: 'var(--muted)' }}>Glama</a>
        </div>
      </footer>

    </div>
    </>
  );
}
