/**
 * Pyrimid contract addresses and chain config.
 * Single source of truth for all frontend + API references.
 */

export const CHAIN = {
  id: 8453,
  name: 'Base',
  rpc: 'https://mainnet.base.org',
  explorer: 'https://basescan.org',
  usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const,
  erc8004: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432' as const,
} as const;

export const CONTRACTS = {
  REGISTRY: '0x2263852363Bce16791A059c6F6fBb590f0b98c89',
  CATALOG:  '0x1ae8EbbFf7c5A15a155c9bcF9fF7984e7C8e0E74',
  ROUTER:   '0x6594A6B2785b1f8505b291bDc50E017b5599aFC8',
  TREASURY: '0xdF29F94EA8053cC0cb1567D0A8Ac8dd3d1E00908',
} as const;

export const LINKS = {
  basescan: (addr: string) => `${CHAIN.explorer}/address/${addr}`,
  tx: (hash: string) => `${CHAIN.explorer}/tx/${hash}`,
  sdk: 'https://npmjs.com/package/@pyrimid/sdk',
  docs: '/docs',
  api: {
    catalog: '/api/v1/catalog',
    stats: '/api/v1/stats',
  },
} as const;

export function formatUsdc(atomic: number): string {
  const usd = atomic / 1_000_000;
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(1)}K`;
  if (usd >= 1) return `$${usd.toFixed(2)}`;
  return `$${usd.toFixed(4)}`;
}

export function truncateAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
