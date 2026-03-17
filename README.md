# Pyrimid

**Onchain affiliate distribution for AI agents.**

Pyrimid is a protocol on Base where vendors list digital products, AI agents register as affiliates to distribute them, and commissions settle instantly in USDC via smart contracts. 1% protocol fee on every transaction.

**Not a marketplace. Not MLM. One-layer affiliate distribution with onchain commission splitting.**

🌐 [pyrimid.ai](https://pyrimid.ai) · 📦 [@pyrimid/sdk](https://www.npmjs.com/package/@pyrimid/sdk) · 📄 [Docs](https://pyrimid.ai/docs)

---

## How It Works

```
Agent discovers product → Agent buys via x402 payment → Smart contract splits USDC:

  1%        → Protocol treasury
  5–50%     → Affiliate agent (set by vendor per product)
  Remainder → Vendor
```

No affiliate? Vendor gets 99%, protocol gets 1%. Vendors only pay for distribution that delivers sales.

## Contracts (Base Mainnet)

| Contract | Address | Role |
|----------|---------|------|
| Registry | [`0x34e2...389`](https://basescan.org/address/0x34e22fc20D457095e2814CdFfad1e42980EEC389) | Affiliate + vendor registration, ERC-8004 identity, reputation |
| Catalog | [`0xC935...908`](https://basescan.org/address/0xC935d6B73034dDDb97AD2a1BbD2106F34A977908) | Product listings, pricing, commission rates |
| Router | [`0xc949...68B`](https://basescan.org/address/0xc949AEa380D7b7984806143ddbfE519B03ABd68B) | Commission splitting engine |
| Treasury | [`0x74A5...12C`](https://basescan.org/address/0x74A512F4f3F64aD479dEc4554a12855Ce943E12C) | Protocol operations fund |

## Three Integration Paths

### Path 1: Embedded Resolver (highest leverage)
Embed `PyrimidResolver` as the default service layer in your agent framework. Every agent on your stack routes purchases through Pyrimid with your affiliate ID.

```typescript
import { PyrimidResolver } from '@pyrimid/sdk';

const resolver = new PyrimidResolver({ affiliateId: 'af_your_id' });
const match = await resolver.findProduct("trading signals");
if (match) await resolver.purchase(match, agentWallet);
```

### Path 2: MCP Server (medium leverage)
Deploy an MCP server wrapping the Pyrimid catalog. Agents connect, browse, buy — your affiliate ID on every transaction.

```typescript
import { createPyrimidMcpServer } from '@pyrimid/sdk';

const server = createPyrimidMcpServer({
  affiliateId: 'af_your_id',
  serverName: 'my-recommender',
});
```

### Path 3: Vendor Middleware (for sellers)
10 lines to activate affiliate distribution on your existing product:

```typescript
import { pyrimidMiddleware } from '@pyrimid/sdk';

app.use(pyrimidMiddleware({
  vendorId: 'vn_your_id',
  products: {
    'your-endpoint': { price: 250000, affiliateBps: 2000 }
  }
}));
```

## Architecture

```
pyrimid/
├── app/                    # Next.js 15 (Vercel)
│   ├── page.tsx            # Landing page
│   ├── dashboard/          # Protocol dashboard
│   └── api/
│       ├── v1/catalog/     # Aggregated product catalog (94+ products)
│       ├── v1/stats/       # Protocol analytics
│       └── mcp/            # MCP JSON-RPC endpoint
├── sdk/                    # @pyrimid/sdk (npm)
│   └── src/
│       ├── resolver.ts     # PyrimidResolver
│       ├── mcp-server.ts   # MCP server factory
│       ├── middleware.ts   # Vendor middleware
│       └── types.ts        # ABIs, addresses, interfaces
├── subgraph/               # The Graph (Base indexer)
│   ├── schema.graphql
│   ├── subgraph.yaml
│   └── src/mapping.ts
└── lib/
    └── contracts.ts        # Addresses + chain config
```

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/catalog` | GET | Aggregated product catalog (onchain + x402 Bazaar + MCPize + more) |
| `/api/v1/stats` | GET | Protocol-level stats |
| `/api/v1/stats?type=affiliate&id=af_xxx` | GET | Affiliate performance |
| `/api/v1/stats?type=vendor&id=vn_xxx` | GET | Vendor analytics |
| `/api/mcp` | POST | MCP JSON-RPC 2.0 (tools/list, tools/call) |
| `/api/mcp` | GET | Server info + tool definitions |

## MCP Tools

| Tool | Description |
|------|-------------|
| `pyrimid_browse` | Search catalog by query, price, verified status |
| `pyrimid_buy` | Purchase a product with x402 payment |
| `pyrimid_preview` | Preview payment split without buying |
| `pyrimid_categories` | List product categories with counts |
| `pyrimid_register_affiliate` | Register as an affiliate |

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

## Deploy

```bash
# App
GIT_DIR=/dev/null npx vercel --prod --yes

# SDK
cd sdk && npm run build && npm publish

# Subgraph
cd subgraph && npm run build && npm run deploy
```

## License

Proprietary. Contracts are public on Base. SDK, MCP server, catalog API, and aggregation logic are source-available, non-commercial.
