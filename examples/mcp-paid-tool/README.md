# Paid MCP tool guide

This guide shows how to package one MCP tool or API call as a paid product that
agents can discover through Pyrimid and buy with x402/Base USDC.

Best fit: MCP servers with expensive data, scraping, enrichment, analytics, compliance checks, search, or model calls.

## Tool design

- Free tool: `preview_*` returns schema, price, sample output, and payment requirement.
- Paid tool: `buy_*` returns HTTP 402/x402 requirement until paid.
- Discovery: publish server card, `llms.txt`, `agents.txt`, and Pyrimid catalog entry.

## Working endpoint

Pyrimid includes a live seed endpoint for this pattern:

```bash
curl -i "https://pyrimid.ai/api/v1/paid/mcp-server-audit?url=https://example.com/mcp"
```

Without payment proof it returns `402 Payment Required` plus an x402-compatible
`accepts[]` challenge:

```json
{
  "error": "payment_required",
  "accepts": [
    {
      "x402Version": 2,
      "scheme": "exact",
      "network": "base",
      "asset": "USDC",
      "maxAmountRequired": "0.10",
      "resource": "https://pyrimid.ai/api/v1/paid/mcp-server-audit?url=https://example.com/mcp",
      "mimeType": "application/json",
      "vendorId": "pyrimid-growth",
      "productId": "mcp-server-audit",
      "affiliateBps": 4000,
      "protocol": "pyrimid"
    }
  ]
}
```

After the buyer pays through x402, retry the same request with `X-PAYMENT` or
`X-PAYMENT-TX`. The paid response returns monetization recommendations such as
detected capabilities, paid tool routes, suggested pricing, catalog metadata,
implementation steps, and risk notes.

## Minimal catalog metadata

```json
{
  "vendor_id": "your-mcp-server",
  "product_id": "paid_search",
  "description": "Paid MCP search result with enriched citations",
  "category": "search-scraping",
  "tags": ["mcp", "search", "x402", "paid-tools"],
  "price_usdc": 50000,
  "price_display": "$0.05",
  "affiliate_bps": 3000,
  "endpoint": "https://your-service.com/api/paid/search",
  "method": "POST",
  "output_schema": {
    "type": "object",
    "properties": {
      "result": { "type": "object" },
      "routed_by": { "const": "pyrimid" }
    }
  },
  "network": "base",
  "asset": "USDC"
}
```

## Route shape

Return the x402 challenge before running the paid tool:

```ts
export async function POST(req: Request) {
  const proof = req.headers.get('x-payment') || req.headers.get('x-payment-tx');

  if (!proof) {
    return Response.json(
      {
        error: 'payment_required',
        accepts: [{
          x402Version: 2,
          scheme: 'exact',
          network: 'base',
          asset: 'USDC',
          maxAmountRequired: '0.05',
          resource: req.url,
          description: 'Paid MCP search routed through Pyrimid',
          mimeType: 'application/json',
          vendorId: 'your-mcp-server',
          productId: 'paid_search',
          affiliateBps: 3000,
          protocol: 'pyrimid'
        }]
      },
      { status: 402 }
    );
  }

  const input = await req.json();
  const result = await runPaidSearch(input.query);
  return Response.json({ result, routed_by: 'pyrimid' });
}
```

## Reproduction checklist

1. Call the endpoint without payment and confirm a `402` response.
2. Confirm the `accepts[0]` object contains `network`, `asset`, `resource`, `vendorId`, `productId`, and `affiliateBps`.
3. Add the product metadata to a Pyrimid catalog entry.
4. Publish the free preview tool in your MCP server card.
5. Retry the endpoint with `X-PAYMENT` or `X-PAYMENT-TX` and return deterministic JSON.

## Why route through Pyrimid?

- Agents can find your tool in one catalog.
- Buyer agents get a standard x402 payment flow.
- Affiliates can route demand to your tool.
- Vendor, affiliate, and protocol fees are visible onchain.
