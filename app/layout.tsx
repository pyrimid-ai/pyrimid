import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pyrimid — Onchain Monetization for Agent Commerce',
  description: 'One-layer affiliate distribution protocol on Base. Vendors list products. Agents earn commissions. Payments settle instantly in USDC.',
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    title: 'Pyrimid — Agent-to-Agent Commerce Infrastructure',
    description: 'The monetization layer agent commerce is missing. Commission splitting settles onchain in USDC on Base.',
    type: 'website',
    url: 'https://pyrimid.xyz',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Pyrimid Protocol' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pyrimid Protocol',
    description: 'Onchain affiliate distribution for AI agents on Base.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-pyrimid-bg font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
