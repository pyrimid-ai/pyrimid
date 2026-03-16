# Pyrimid

Onchain monetization infrastructure for agent-to-agent commerce on Base.

## Architecture

```
pyrimid/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Landing page
│   ├── dashboard/page.tsx        # Protocol dashboard (live stats)
│   ├── api/v1/catalog/route.ts   # Aggregated product catalog API
│   └── api/v1/stats/route.ts     # Protocol/affiliate/vendor stats API
├── lib/
│   └── contracts.ts              # Shared addresses, chain config, helpers
├── public/
│   └── docs/index.html           # Developer documentation (static)
├── sdk/                          # @pyrimid/sdk npm package
│   └── src/
│       ├── index.ts              # Barrel export
│       ├── types.ts              # Addresses, ABIs, interfaces
│       ├── resolver.ts           # PyrimidResolver (Path 1)
│       ├── mcp-server.ts         # MCP server factory (Path 2)
│       └── middleware.ts         # Vendor middleware (Path 3)
├── subgraph/                     # The Graph subgraph
│   ├── schema.graphql            # Entity definitions
│   ├── subgraph.yaml             # Manifest (all 4 contracts)
│   └── src/mapping.ts            # Event handlers
├── pyrimid-spec-v0.2.md          # Master specification
├── vercel.json                   # Vercel deployment config
└── next.config.ts                # Next.js config
```

## Contracts (Base Mainnet)

| Contract | Address |
|----------|---------|
| PyrimidRegistry | `0x2263852363Bce16791A059c6F6fBb590f0b98c89` |
| PyrimidCatalog | `0x1ae8EbbFf7c5A15a155c9bcF9fF7984e7C8e0E74` |
| PyrimidRouter | `0x6594A6B2785b1f8505b291bDc50E017b5599aFC8` |
| PyrimidTreasury | `0xdF29F94EA8053cC0cb1567D0A8Ac8dd3d1E00908` |

## Setup

```bash
# Install app dependencies
npm install

# Copy env
cp .env.example .env
# Fill in PYRIMID_SUBGRAPH_URL

# Run dev server
npm run dev
```

## Deploy

```bash
# App → Vercel
GIT_DIR=/dev/null npx vercel --prod --yes

# SDK → npm
cd sdk && npm run build && npm publish

# Subgraph → The Graph Studio
cd subgraph && npm install && npm run build && npm run deploy
```

## API Endpoints

- `GET /api/v1/catalog` — Aggregated product catalog (5 sources)
- `GET /api/v1/stats` — Protocol stats
- `GET /api/v1/stats?type=affiliate&id=af_xxx` — Affiliate stats
- `GET /api/v1/stats?type=vendor&id=vn_xxx` — Vendor stats

Rewrite aliases: `/v1/catalog` and `/v1/stats` also work.

## Commission Split

```
1%       → Protocol treasury
5–50%    → Affiliate (vendor sets per product)
Remainder → Vendor
```
