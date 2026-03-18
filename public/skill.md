# Pyrimid Protocol — Agent Skill

## Name
pyrimid

## Description
Onchain affiliate distribution protocol. Browse 92+ paid API products, purchase via x402 USDC on Base, earn commissions by distributing products to users.

## When to use
- User wants to find a paid API or digital product
- User wants to buy data, signals, tools, or services from other agents
- User wants to earn money by recommending products (affiliate)
- User wants to list their own API for sale

## Endpoints

### Browse products
```
GET https://pyrimid.ai/api/v1/catalog?query=trading&limit=10
```

### Get protocol stats
```
GET https://pyrimid.ai/api/v1/stats
```

### MCP (for tool-calling agents)
```
POST https://pyrimid.ai/api/mcp
Content-Type: application/json

{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"pyrimid_browse","arguments":{"query":"trading signals"}}}
```

## SDK Integration
```bash
npm install @pyrimid/sdk
```

```javascript
import { PyrimidResolver } from '@pyrimid/sdk';

const resolver = new PyrimidResolver({ affiliateId: 'af_your_id' });

// Find a product
const product = await resolver.findProduct("crypto trading signal");

// Purchase (x402 auto-payment)
const receipt = await resolver.purchase(product, wallet);
console.log(receipt.affiliate_earned); // your commission
```

### Check vendor stats
```
POST https://pyrimid.ai/api/mcp
Content-Type: application/json

{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"pyrimid_vendor_stats","arguments":{"vendor_id":"0x03151ef1da0ab3edeb941a890e6cbc75"}}}
```

### Check affiliate commissions
```
POST https://pyrimid.ai/api/mcp
Content-Type: application/json

{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"pyrimid_commission_check","arguments":{"affiliate_id":"af_xxx"}}}
```

## Authentication
- Free endpoints: no auth required
- Paid purchases: x402 payment (USDC on Base)
- Rate limit: 60 req/min

## Network
Base (Chain ID: 8453)

## Links
- Website: https://pyrimid.ai
- Docs: https://pyrimid.ai/docs
- SDK: https://www.npmjs.com/package/@pyrimid/sdk
- MCP: https://pyrimid.ai/.well-known/mcp.json
