'use client';

/* Agent compatibility / integration badge section */
const platforms = [
  { name: 'Claude', icon: '◆' },
  { name: 'GPT', icon: '●' },
  { name: 'Cursor', icon: '▸' },
  { name: 'Windsurf', icon: '◎' },
  { name: 'Cline', icon: '⌘' },
  { name: 'OpenClaw', icon: '🦀' },
];

const methods = [
  {
    label: 'MCP Server',
    desc: '5 tools — catalog, product, purchase, affiliate, commissions',
    code: 'npx @pyrimid/mcp-server',
    color: 'var(--accent)',
    bg: 'var(--accent-d)',
  },
  {
    label: 'TypeScript SDK',
    desc: 'Full client — resolver, recommender, vendor middleware',
    code: 'npm install @pyrimid/sdk',
    color: 'var(--blue)',
    bg: 'var(--blue-d)',
  },
  {
    label: 'REST API',
    desc: '5 endpoints — /catalog, /product, /purchase, /register, /commissions',
    code: 'curl https://pyrimid.ai/api/v1/catalog',
    color: 'var(--purple)',
    bg: 'var(--purple-d)',
  },
];

export default function AgentCompat() {
  return (
    <section style={{ padding: '40px 0 20px', textAlign: 'center' }}>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '.65rem', letterSpacing: '2.5px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6 }}>
        Integrations
      </div>
      <h2 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 8 }}>
        Works with every MCP client.
      </h2>
      <p style={{ color: 'var(--muted)', fontSize: '.86rem', maxWidth: 480, margin: '0 auto 24px' }}>
        Three integration paths. Zero vendor lock-in. Your agent picks the one that fits.
      </p>

      {/* Platform badges */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 32 }}>
        {platforms.map(p => (
          <div key={p.name} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 6,
            border: '1px solid var(--border)',
            background: 'var(--bg2)',
            fontSize: '.75rem', fontFamily: 'JetBrains Mono, monospace',
            color: 'var(--muted)',
          }}>
            <span style={{ fontSize: '.8rem' }}>{p.icon}</span> {p.name}
          </div>
        ))}
      </div>

      {/* Method cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, maxWidth: 720, margin: '0 auto' }}>
        {methods.map(m => (
          <div key={m.label} style={{
            textAlign: 'left', padding: 18, borderRadius: 8,
            background: 'var(--bg3)', border: '1px solid var(--border)',
          }}>
            <div style={{
              fontSize: '.58rem', letterSpacing: '1.5px', textTransform: 'uppercase',
              fontFamily: 'JetBrains Mono, monospace',
              color: m.color, background: m.bg,
              display: 'inline-block', padding: '2px 6px', borderRadius: 3, marginBottom: 8,
            }}>
              {m.label}
            </div>
            <div style={{ fontSize: '.8rem', color: 'var(--muted)', marginBottom: 10, lineHeight: 1.5 }}>
              {m.desc}
            </div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: '.68rem',
              padding: '8px 10px', borderRadius: 5,
              background: 'var(--bg2)', border: '1px solid var(--border)',
              color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {m.code}
            </div>
          </div>
        ))}
      </div>

      {/* Responsive override */}
      <style>{`
        @media (max-width: 768px) {
          section > div:last-of-type { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
