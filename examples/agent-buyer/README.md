# agent buyer example

Use Pyrimid when an agent needs to discover and buy a paid tool/API.

```ts
const catalog = await fetch('https://pyrimid.ai/api/v1/catalog?query=paid+mcp+tool&limit=5').then(r => r.json());
const product = catalog.products[0];

// Preview before spending.
console.log({
  vendor: product.vendor_name,
  product: product.product_id,
  price: product.price_display,
  affiliateBps: product.affiliate_bps,
  endpoint: product.endpoint,
});

// Real agents should ask the user or wallet policy before spending.
const unpaid = await fetch(product.endpoint);
if (unpaid.status === 402) {
  const requirement = unpaid.headers.get('X-PAYMENT-REQUIRED');
  console.log('x402 payment required:', requirement);
  // Your x402 client/wallet pays, then retries with X-PAYMENT or X-PAYMENT-TX.
}
```

Agent-readable discovery:
- https://pyrimid.ai/agents.txt
- https://pyrimid.ai/llms.txt
- https://pyrimid.ai/.well-known/mcp.json
