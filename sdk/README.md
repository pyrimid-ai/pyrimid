# @pyrimid/sdk

Onchain monetization infrastructure for agent-to-agent commerce on Base.

**Pyrimid** is a one-layer affiliate distribution protocol. Vendors list products. Agents earn commissions by distributing them. Payments settle instantly in USDC via smart contracts. Protocol takes 1%.

## Install

```bash
npm install @pyrimid/sdk
```

## Three Integration Paths

### Path 1: Embedded Resolver (Framework Developers)

Highest leverage. Embed `PyrimidResolver` in your agent framework — every agent on your stack routes purchases through Pyrimid with your affiliate ID.

```typescript
import { PyrimidResolver } from '@pyrimid/sdk';

const resolver = new PyrimidResolver({
  affiliateId: 'af_your_id',
});

// Agent needs a capability → search the catalog
const product = await resolver.findProduct("btc trading signal");

if (product) {
  console.log(`Found: ${product.vendor_name} — ${product.price_display}`);
  const receipt = await resolver.purchase(product, agentWallet);
  console.log(`Paid ${receipt.paid_usdc / 1e6} USDC, earned ${receipt.affiliate_earned / 1e6}`);
}
```

### Path 2: MCP Recommender (Server Operators)

Deploy an MCP server wrapping the Pyrimid catalog. Other agents connect as a tool and browse/buy — your affiliate ID on every transaction.

```typescript
import { createPyrimidMcpServer } from '@pyrimid/sdk';

// Your earnings on every sale
const server = createPyrimidMcpServer({
  affiliateId: 'af_your_id',
  serverName: 'my-trading-recommender',
});

// Exposes: pyrimid_browse, pyrimid_buy, pyrimid_preview,
//          pyrimid_categories, pyrimid_register_affiliate
```

### Path 3: Vendor Middleware (Product Vendors)

10 lines to activate affiliate distribution on your existing API:

```typescript
import { pyrimidMiddleware } from '@pyrimid/sdk';

app.use(pyrimidMiddleware({
  vendorId: 'vn_your_id',
  products: {
    '/api/signals/latest': {
      productId: 'signals_latest',
      price: 250_000,       // $0.25 in USDC atomic units
      affiliateBps: 2000,   // 20% affiliate commission
    },
  },
}));
```

For Next.js App Router:

```typescript
import { withPyrimid } from '@pyrimid/sdk';

export const GET = withPyrimid({
  vendorId: 'vn_your_id',
  productId: 'signals_latest',
  price: 250_000,
  affiliateBps: 2000,
}, async (req, receipt) => {
  // receipt.verified === true, payment confirmed
  return Response.json({ signal: 'BTC LONG', confidence: 0.82 });
});
```

## Contracts (Base Mainnet)

| Contract | Address |
|----------|---------|
| PyrimidRegistry | `0x2263852363Bce16791A059c6F6fBb590f0b98c89` |
| PyrimidCatalog | `0x1ae8EbbFf7c5A15a155c9bcF9fF7984e7C8e0E74` |
| PyrimidRouter | `0x6594A6B2785b1f8505b291bDc50E017b5599aFC8` |
| PyrimidTreasury | `0xdF29F94EA8053cC0cb1567D0A8Ac8dd3d1E00908` |

## Commission Split

Every transaction splits automatically:

```
1%       → Protocol treasury
5–50%    → Affiliate (set per product by vendor)
Remainder → Vendor
```

No affiliate on the sale? Vendor gets 99%, protocol gets 1%.

## API

- `GET https://api.pyrimid.xyz/v1/catalog` — Full product catalog
- `GET https://api.pyrimid.xyz/v1/stats` — Protocol-level stats

## License

Proprietary. Source-available, non-commercial. See LICENSE.
