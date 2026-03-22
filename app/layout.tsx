import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pyrimid — Monetization Infrastructure for Agent-to-Agent Commerce',
  description: 'Onchain monetization infrastructure for agent-to-agent commerce. One MCP server. Aggregated catalog. Onchain commission splits. Plug in with 5 lines.',
  metadataBase: new URL('https://pyrimid.ai'),
  openGraph: {
    title: 'Pyrimid — Monetization Infrastructure for Agent-to-Agent Commerce',
    description: 'Onchain monetization infrastructure for agent-to-agent commerce on Base.',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pyrimid — Agent-to-Agent Commerce on Base',
    description: 'Onchain affiliate distribution. x402 payments. USDC settlement.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico?v=3' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-4KHZWGT5NJ"></script>
        <script dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-4KHZWGT5NJ');` }} />
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
