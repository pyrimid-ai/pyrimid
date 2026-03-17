<p align="center">
  <img src="https://pyrimid.ai/opengraph-image" width="600" alt="Pyrimid Protocol" />
</p>

<h1 align="center">Pyrimid Protocol</h1>

<p align="center">
  <strong>Onchain affiliate distribution for AI agents on Base.</strong>
</p>

<p align="center">
  <a href="https://pyrimid.ai">Website</a> ·
  <a href="https://pyrimid.ai/docs">Documentation</a> ·
  <a href="https://www.npmjs.com/package/@pyrimid/sdk">SDK on npm</a> ·
  <a href="https://basescan.org/address/0xc949AEa380D7b7984806143ddbfE519B03ABd68B">Contracts</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@pyrimid/sdk"><img src="https://img.shields.io/npm/v/@pyrimid/sdk?label=SDK&color=8b5cf6" alt="npm version" /></a>
  <a href="https://pyrimid.ai/api/v1/catalog"><img src="https://img.shields.io/badge/Products-92+-8b5cf6" alt="Products" /></a>
  <a href="https://basescan.org"><img src="https://img.shields.io/badge/Network-Base-0052FF" alt="Base" /></a>
  <a href="https://pyrimid.ai/api/mcp"><img src="https://img.shields.io/badge/MCP-Enabled-00d4aa" alt="MCP" /></a>
</p>

---

## What is Pyrimid?

Pyrimid is a protocol where **vendors list digital products**, **AI agents distribute them as affiliates**, and **commissions settle instantly in USDC** via smart contracts on Base.

```
Agent discovers a product → purchases via x402 → smart contract splits payment:

  1%        → Protocol treasury
  0–50%     → Affiliate agent (set by vendor)
  Remainder → Vendor
```

No affiliate? Vendor gets 99%. Vendors only pay for distribution that drives real sales. One layer only — no MLM, no pyramids. Just clean, transparent commission splitting onchain.

---

## Why Pyrimid?

| Problem | Pyrimid's Solution |
|---------|-------------------|
| Agents can't monetize recommendations | Earn commissions by recommending products to users |
| Vendors can't reach agents at scale | List once, get discovered by every agent on the network |
| Commission payments are slow & opaque | Instant USDC settlement via smart contracts — fully auditable |
| No standard for agent commerce | x402 payments + MCP tools + onchain registry = open standard |

---

## Quick Start

### Install the SDK

```bash
npm install @pyrimid/sdk
```

### For Agents — Find & Recommend Products

```typescript
import { PyrimidResolver } from '@pyrimid/sdk';

const resolver = new PyrimidResolver({ affiliateId: 'af_your_id' });

// Search the catalog
const product = await resolver.findProduct("trading signals");

// Purchase with x402 payment (auto-splits commissions)
if (product) {
  const receipt = await resolver.purchase(product, agentWallet);
  console.log(`Earned: $${receipt.affiliate_earned / 1_000_000} USDC`);
}
```

### For Vendors — List Your Product

```typescript
import { pyrimidMiddleware } from '@pyrimid/sdk';

// 10 lines to activate affiliate distribution
app.use(pyrimidMiddleware({
  vendorId: 'vn_your_id',
  products: {
    '/api/signals/latest': {
      productId: 'signals_latest',
      price: 250_000,        // $0.25 USDC
      affiliateBps: 1000,    // 10% to affiliates
    },
  },
}));
```

### For Frameworks — Embed as Default Layer

```typescript
import { createPyrimidMcpServer } from '@pyrimid/sdk';

// Deploy an MCP server — agents connect, browse, buy
const server = createPyrimidMcpServer({
  affiliateId: 'af_your_id',
  serverName: 'my-recommender',
});
```

---

## Three Integration Paths

| Path | Who | Effort | Leverage |
|------|-----|--------|----------|
| **Embedded Resolver** | Agent frameworks & toolkits | 3 lines | Every agent on your stack earns you commissions |
| **MCP Server** | Agent infrastructure providers | 5 lines | Agents connect to your server to discover products |
| **Vendor Middleware** | API & product builders | 10 lines | Activate affiliate distribution on your product |

---

## Smart Contracts (Base Mainnet)

All contracts are deployed and verified on Base. ERC-1967 upgradeable proxy pattern.

| Contract | Address | Purpose |
|----------|---------|---------|
| **Registry** | [`0x34e22fc2...389`](https://basescan.org/address/0x34e22fc20D457095e2814CdFfad1e42980EEC389) | Affiliate & vendor registration, ERC-8004 identity linking |
| **Catalog** | [`0xC935d6B7...908`](https://basescan.org/address/0xC935d6B73034dDDb97AD2a1BbD2106F34A977908) | Product listings with pricing & commission rates |
| **Router** | [`0xc949AEa3...68B`](https://basescan.org/address/0xc949AEa380D7b7984806143ddbfE519B03ABd68B) | Commission splitting engine with `maxPrice` slippage protection |
| **Treasury** | [`0x74A512F4...12C`](https://basescan.org/address/0x74A512F4f3F64aD479dEc4554a12855Ce943E12C) | Protocol operations fund |

---

## API Reference

The Pyrimid API is free to read, rate-limited (60 req/min), and returns JSON.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/catalog` | `GET` | Full product catalog with search, filters, pagination |
| `/api/v1/stats` | `GET` | Protocol-level stats (volume, transactions, affiliates) |
| `/api/v1/stats?type=affiliate&id=af_xxx` | `GET` | Affiliate performance & earnings |
| `/api/v1/stats?type=vendor&id=vn_xxx` | `GET` | Vendor analytics |
| `/api/mcp` | `POST` | MCP JSON-RPC 2.0 endpoint (Streamable HTTP) |
| `/api/mcp` | `GET` | Server info & tool definitions |

### MCP Tools

| Tool | Description |
|------|-------------|
| `pyrimid_browse` | Search catalog by query, price, category, verified status |
| `pyrimid_buy` | Purchase a product via x402 with affiliate attribution |
| `pyrimid_preview` | Preview the commission split before buying |
| `pyrimid_categories` | List all product categories with counts |
| `pyrimid_register_affiliate` | Instructions to register as an affiliate onchain |

---

## Architecture

```
pyrimid/
├── app/                       # Next.js 15 (Vercel, region: bom1)
│   ├── page.tsx               # Landing page
│   ├── dashboard/             # Protocol dashboard
│   └── api/
│       ├── v1/catalog/        # Aggregated product catalog (92+ products)
│       ├── v1/stats/          # Protocol & affiliate analytics
│       └── mcp/               # MCP JSON-RPC endpoint
├── sdk/                       # @pyrimid/sdk (published to npm)
│   └── src/
│       ├── resolver.ts        # PyrimidResolver — search, purchase, stats
│       ├── mcp-server.ts      # MCP server factory
│       ├── middleware.ts       # Vendor payment middleware + calculateSplit()
│       └── types.ts           # ABIs, addresses, interfaces
├── subgraph/                  # The Graph indexer (Base)
│   ├── schema.graphql         # PaymentRouted, Affiliate, Vendor entities
│   ├── subgraph.yaml          # 4 data sources
│   └── src/mapping.ts         # Event handlers
├── middleware.ts               # Edge rate limiting (60/min API, 120/min MCP)
└── public/docs/               # Developer documentation
```

---

## Development

```bash
# Clone & install
git clone https://github.com/pyrimid/protocol.git
cd protocol
npm install

# Run locally
cp .env.example .env
npm run dev

# SDK development
cd sdk
npm run build    # TypeScript → dist/
npm run dev      # Watch mode
```

### Deploy

```bash
# Website + API
npx vercel --prod

# SDK to npm
cd sdk && npm publish --access public

# Subgraph to The Graph
cd subgraph && npx graph deploy pyrimid --studio
```

---

## Security

- **Payment verification**: Real onchain verification via viem — checks `PaymentRouted` events + USDC transfers with 5-minute expiry
- **Rate limiting**: Edge middleware, 60 req/min per IP on catalog/stats, 120/min on MCP
- **BigInt safety**: `calculateSplit()` handles both `Number` and `BigInt` inputs from web3 libraries
- **Contract pattern**: ERC-1967 upgradeable proxies with verified source on BaseScan

---

## Roadmap

- [x] Core contracts deployed on Base
- [x] SDK v0.2.3 with full catalog pagination
- [x] MCP server with 5 tools
- [x] x402 Bazaar aggregation (92+ products)
- [x] Subgraph indexing on The Graph
- [x] Rate limiting & security hardening
- [ ] ERC-8004 identity verification for vendors
- [ ] Multi-network support (Arbitrum, Optimism)
- [ ] Revenue dashboard for affiliates
- [ ] Vendor self-service registration portal

---

## Links

| Resource | URL |
|----------|-----|
| Website | [pyrimid.ai](https://pyrimid.ai) |
| Documentation | [pyrimid.ai/docs](https://pyrimid.ai/docs) |
| SDK | [npmjs.com/package/@pyrimid/sdk](https://www.npmjs.com/package/@pyrimid/sdk) |
| Subgraph | [thegraph.com/studio/subgraph/pyrimid](https://thegraph.com/studio/subgraph/pyrimid) |
| Registry | [BaseScan](https://basescan.org/address/0x34e22fc20D457095e2814CdFfad1e42980EEC389) |
| Router | [BaseScan](https://basescan.org/address/0xc949AEa380D7b7984806143ddbfE519B03ABd68B) |

---

<p align="center">
  <sub>Built on Base · Payments via x402 · Settlement in USDC</sub>
</p>
