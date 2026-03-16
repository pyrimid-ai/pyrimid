# @pyrimid/sdk

Onchain monetization infrastructure for agent-to-agent commerce on Base.

**Pyrimid** is a one-layer affiliate distribution protocol. Vendors list products. Agents earn commissions by distributing them. Payments settle instantly in USDC via smart contracts. Protocol takes 1%.

## Install

```bash
npm install @pyrimid/sdk
```

### Peer Dependencies

The SDK uses peer dependencies to keep the bundle small — install only what you need:

```bash
# Path 1: Resolver (no extra deps needed — just fetch)
npm install @pyrimid/sdk

# Path 2: MCP Server
npm install @pyrimid/sdk @modelcontextprotocol/sdk zod

# Path 3: Vendor Middleware (no extra deps for basic usage)
# For x402 payment verification in the resolver:
npm install @pyrimid/sdk @x402/fetch
```

## Three Integration Paths

### Path 1: Embedded Resolver (Framework Developers)

Highest leverage. Embed `PyrimidResolver` in your agent framework — every agent on your stack routes purchases through Pyrimid with your affiliate ID. One integration, thousands of passive sales.

```typescript
import { PyrimidResolver } from '@pyrimid/sdk';

const resolver = new PyrimidResolver({
  affiliateId: 'af_your_id',
  // Optional:
  // catalogUrl: 'https://pyrimid.ai/api/v1/catalog',
  // cacheTtlMs: 5 * 60 * 1000,
  // preferVerifiedVendors: true,
  // maxPriceUsdc: 10_000_000,  // $10
});

// Search the catalog by natural language
const product = await resolver.findProduct("btc trading signal");

if (product) {
  console.log(`Found: ${product.vendor_name} — ${product.price_display}`);

  // Purchase with automatic x402 payment
  const receipt = await resolver.purchase(product, agentWallet);
  console.log(`Paid $${receipt.paid_usdc / 1e6}, earned $${receipt.affiliate_earned / 1e6}`);
}

// Multi-result search
const products = await resolver.findProducts("image generation", 10);

// Browse by category
const tradingTools = await resolver.findByCategory("trading");

// Get affiliate stats
const stats = await resolver.getStats();
```

### Path 2: MCP Recommender (Server Operators)

Deploy an MCP server wrapping the Pyrimid catalog. Other agents connect as a tool and browse/buy — your affiliate ID on every transaction.

```typescript
import { createPyrimidMcpServer } from '@pyrimid/sdk';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = createPyrimidMcpServer({
  affiliateId: 'af_your_id',
  serverName: 'my-trading-recommender',
  // catalogUrl: 'https://pyrimid.ai/api/v1/catalog',
  // refreshIntervalMs: 5 * 60 * 1000,
});

// Connect via stdio (for Claude Desktop, etc.)
const transport = new StdioServerTransport();
await server.connect(transport);

// Tools exposed:
//   pyrimid_browse           — keyword search with filters
//   pyrimid_categories       — list categories with counts
//   pyrimid_buy              — purchase a product via x402
//   pyrimid_preview          — show payment split breakdown
//   pyrimid_register_affiliate — registration instructions
```

Or use the hosted HTTP endpoint at `https://pyrimid.ai/api/mcp` (JSON-RPC 2.0):

```bash
# List available tools
curl -X POST https://pyrimid.ai/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'

# Search the catalog
curl -X POST https://pyrimid.ai/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"pyrimid_browse","arguments":{"query":"trading signals"}},"id":2}'
```

### Path 3: Vendor Middleware (Product Vendors)

10 lines to activate affiliate distribution on your existing API. Works with Express, Hono, Fastify, or any Connect-compatible framework:

```typescript
import { pyrimidMiddleware } from '@pyrimid/sdk';

app.use(pyrimidMiddleware({
  vendorId: 'vn_your_id',
  products: {
    '/api/signals/latest': {
      productId: 'signals_latest',
      price: 250_000,       // $0.25 in USDC atomic units (6 decimals)
      affiliateBps: 2000,   // 20% affiliate commission
    },
    '/api/analysis/deep': {
      productId: 'deep_analysis',
      price: 1_000_000,     // $1.00
      affiliateBps: 1500,   // 15%
    },
  },
}));
```

For Next.js App Router, use the `withPyrimid` wrapper:

```typescript
import { withPyrimid } from '@pyrimid/sdk';

export const GET = withPyrimid({
  vendorId: 'vn_your_id',
  productId: 'signals_latest',
  price: 250_000,
  affiliateBps: 2000,
}, async (req, receipt) => {
  // receipt.verified === true — payment confirmed onchain
  // receipt.tx_hash, receipt.affiliate_id, receipt.paid_usdc, receipt.split
  return Response.json({ signal: 'BTC LONG', confidence: 0.82 });
});
```

## Utility: Payment Split Calculator

```typescript
import { calculateSplit } from '@pyrimid/sdk';

const split = calculateSplit(250_000, 2000); // price, affiliateBps
// split.total_usdc        = 250000
// split.protocol_fee      = 2500   (1%)
// split.affiliate_commission = 49500 (20% of remainder)
// split.vendor_share      = 198000
```

## Contracts (Base Mainnet)

| Contract | Address | Deploy Block |
|----------|---------|-------------|
| PyrimidRegistry | `0x2263852363Bce16791A059c6F6fBb590f0b98c89` | 43437586 |
| PyrimidCatalog | `0x1ae8EbbFf7c5A15a155c9bcF9fF7984e7C8e0E74` | 43437593 |
| PyrimidRouter | `0x6594A6B2785b1f8505b291bDc50E017b5599aFC8` | 43437600 |
| PyrimidTreasury | `0xdF29F94EA8053cC0cb1567D0A8Ac8dd3d1E00908` | 43437579 |

USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

ABI fragments are exported from the SDK:

```typescript
import { ROUTER_ABI, REGISTRY_ABI, CATALOG_ABI, TREASURY_ABI, PYRIMID_ADDRESSES } from '@pyrimid/sdk';

const addresses = PYRIMID_ADDRESSES.base;
// addresses.REGISTRY, addresses.CATALOG, addresses.ROUTER, addresses.TREASURY, addresses.USDC
```

## Commission Split

Every transaction splits automatically onchain:

```
1%        → Protocol treasury
5–50%     → Affiliate (set per product by vendor)
Remainder → Vendor
```

No affiliate on the sale? Vendor gets 99%, protocol gets 1%.

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/catalog` | Aggregated product catalog (query, category, price filters) |
| `GET /api/v1/stats` | Protocol, affiliate, or vendor statistics |
| `POST /api/mcp` | MCP JSON-RPC 2.0 endpoint (tools/list, tools/call) |
| `GET /api/mcp` | MCP server info + tool definitions |

## License

Proprietary. Source-available, non-commercial. See LICENSE.
