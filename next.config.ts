import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  headers: async () => [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: '*' },
        { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
        { key: 'Access-Control-Allow-Headers', value: 'Content-Type, X-Affiliate-ID' },
        { key: 'X-Pyrimid-Network', value: 'base' },
      ],
    },
  ],
  redirects: async () => [
    {
      source: '/docs',
      destination: '/docs/index.html',
      permanent: false,
    },
  ],
};

export default nextConfig;
