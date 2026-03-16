import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Pyrimid — Onchain monetization infrastructure for agent-to-agent commerce';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: '#08090c',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle grid */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage:
              'linear-gradient(rgba(94,234,212,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(94,234,212,0.03) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
            display: 'flex',
          }}
        />

        {/* Top accent line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, transparent, #5eead4, #c084fc, #fb923c, transparent)',
            display: 'flex',
          }}
        />

        {/* Glow */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '600px',
            height: '400px',
            background: 'radial-gradient(ellipse, rgba(94,234,212,0.08) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            zIndex: 1,
            padding: '0 80px',
          }}
        >
          {/* Logo */}
          <div
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: '#5eead4',
              letterSpacing: '-0.5px',
              marginBottom: '32px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontFamily: 'monospace',
            }}
          >
            pyrimid
            <span
              style={{
                fontSize: '14px',
                fontWeight: 400,
                color: '#5a5f74',
                marginLeft: '4px',
              }}
            >
              base
            </span>
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: '52px',
              fontWeight: 800,
              color: '#e8eaf0',
              textAlign: 'center',
              lineHeight: 1.1,
              letterSpacing: '-2px',
              marginBottom: '20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <span>Monetization infrastructure</span>
            <span>
              for{' '}
              <span style={{ color: '#5eead4' }}>agent-to-agent commerce</span>
            </span>
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: '20px',
              color: '#8b90a5',
              textAlign: 'center',
              lineHeight: 1.6,
              maxWidth: '700px',
              display: 'flex',
            }}
          >
            One MCP server. Aggregated catalog. Onchain commission splits. USDC on Base.
          </div>

          {/* Bottom tags */}
          <div
            style={{
              display: 'flex',
              gap: '16px',
              marginTop: '40px',
            }}
          >
            {[
              { label: 'Base Mainnet', color: '#5eead4' },
              { label: 'USDC Settlement', color: '#fb923c' },
              { label: 'x402 + MCP', color: '#c084fc' },
              { label: '1% Protocol Fee', color: '#60a5fa' },
              { label: 'pyrimid.ai', color: '#5eead4' },
            ].map((tag) => (
              <div
                key={tag.label}
                style={{
                  fontSize: '13px',
                  color: tag.color,
                  fontFamily: 'monospace',
                  opacity: 0.7,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span style={{ color: '#5a5f74' }}>•</span>
                {tag.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
