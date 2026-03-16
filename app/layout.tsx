import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pyrimid — Monetization Infrastructure for Agent-to-Agent Commerce',
  description: 'Onchain monetization infrastructure for agent-to-agent commerce. One MCP server. Aggregated catalog. Onchain commission splits. Plug in with 5 lines.',
  openGraph: {
    title: 'Pyrimid — Monetization Infrastructure for Agent-to-Agent Commerce',
    description: 'Onchain monetization infrastructure for agent-to-agent commerce on Base.',
    images: ['/og-image.png'],
    type: 'website',
  },
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="gbg" />
        {children}
      </body>
    </html>
  );
}
