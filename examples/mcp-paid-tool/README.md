# paid MCP tool pattern

Best fit: MCP servers with expensive data, scraping, enrichment, analytics, compliance checks, search, or model calls.

This example shows the minimum viable shape for selling one MCP/API tool through Pyrimid:

1. A free discovery tool tells buyer agents what is available.
2. A paid HTTP route returns HTTP 402 with x402 metadata until paid.
3. The paid route verifies a Base USDC payment proof and returns JSON.
4. Catalog metadata makes the product discoverable by other agents.

## Tool design

- Free tool: `preview_*` returns schema, price, sample output, and payment requirement.
- Paid tool: `buy_*` returns HTTP 402/x402 requirement until paid.
- Discovery: publish server card, `llms.txt`, `agents.txt`, and Pyrimid catalog entry.

## Working endpoint shape

```ts
import { NextRequest, NextResponse } from 'next/server';

const product = {
  vendor_id: 'your-mcp-server',
  product_id: 'paid_search',
  price_usdc: 50_000, // $0.05 USDC atomic units
  price_display: '$0.05',
  affiliate_bps: 3000,
  pay_to: '0xc949AEa380D7b7984806143ddbfE519B03ABd68B',
};

export async function GET(req: NextRequest) {
  const payment = req.headers.get('x-payment-tx') || req.headers.get('x-payment');

  if (!payment) {
    const accepts = [{
      x402Version: 2,
      scheme: 'exact',
      network: 'base',
      asset: 'USDC',
      maxAmountRequired: '0.05',
      payTo: product.pay_to,
      resource: req.url,
      description: 'Paid MCP search result with enriched citations',
      mimeType: 'application/json',
      vendorId: product.vendor_id,
      productId: product.product_id,
      affiliateBps: product.affiliate_bps,
      protocol: 'pyrimid',
    }];

    return NextResponse.json(
      {
        error: 'payment_required',
        message: `Pay ${product.price_display} USDC on Base through Pyrimid, then retry with X-PAYMENT-TX.`,
        accepts,
        catalog: 'https://pyrimid.ai/api/v1/catalog',
      },
      {
        status: 402,
        headers: {
          'X-PAYMENT-REQUIRED': JSON.stringify(accepts[0]),
          'X-Pyrimid-Vendor': product.vendor_id,
          'X-Pyrimid-Product': product.product_id,
        },
      }
    );
  }

  // Verify payment against PyrimidRouter before doing expensive work.
  // See lib/payment-verification.ts in this repo for PaymentRouted checks.
  return NextResponse.json({
    product_id: product.product_id,
    vendor_id: product.vendor_id,
    data: {
      results: [
        {
          title: 'Example enriched citation',
          url: 'https://example.com/source',
          summary: 'Paid result returned after valid x402 payment proof.',
        },
      ],
    },
    routed_by: 'pyrimid',
  });
}
```

## 402 response example

```bash
curl -i "https://your-service.com/api/paid/search?q=agent-commerce"
```

```http
HTTP/2 402
content-type: application/json
x-payment-required: {"x402Version":2,"scheme":"exact","network":"base","asset":"USDC","maxAmountRequired":"0.05","payTo":"0xc949AEa380D7b7984806143ddbfE519B03ABd68B","resource":"https://your-service.com/api/paid/search?q=agent-commerce","vendorId":"your-mcp-server","productId":"paid_search","affiliateBps":3000,"protocol":"pyrimid"}
x-pyrimid-vendor: your-mcp-server
x-pyrimid-product: paid_search

{
  "error": "payment_required",
  "message": "Pay $0.05 USDC on Base through Pyrimid, then retry with X-PAYMENT-TX.",
  "accepts": [
    {
      "x402Version": 2,
      "scheme": "exact",
      "network": "base",
      "asset": "USDC",
      "maxAmountRequired": "0.05",
      "payTo": "0xc949AEa380D7b7984806143ddbfE519B03ABd68B",
      "resource": "https://your-service.com/api/paid/search?q=agent-commerce",
      "vendorId": "your-mcp-server",
      "productId": "paid_search",
      "affiliateBps": 3000,
      "protocol": "pyrimid"
    }
  ]
}
```

## Minimal product metadata

```json
{
  "vendor_id": "your-mcp-server",
  "product_id": "paid_search",
  "description": "Paid MCP search result with enriched citations",
  "category": "search-scraping",
  "tags": ["mcp", "search", "x402", "paid-tools"],
  "price_usdc": 50000,
  "affiliate_bps": 3000,
  "endpoint": "https://your-service.com/api/paid/search",
  "method": "GET",
  "network": "base",
  "asset": "USDC",
  "output_schema": {
    "type": "object",
    "properties": {
      "data": { "type": "object" },
      "routed_by": { "const": "pyrimid" }
    }
  }
}
```

## Agent-facing MCP tools

Expose two MCP tools for each paid capability:

```json
[
  {
    "name": "preview_paid_search",
    "description": "Return price, schema, and example output without spending funds."
  },
  {
    "name": "buy_paid_search",
    "description": "Call the paid search endpoint through x402. Buyer approval is required before payment."
  }
]
```

The preview tool should never require payment. It exists so agents can decide whether the paid tool is relevant before asking their operator or wallet policy to authorize spend.

## Reproducible checks

```bash
# Unpaid request should return 402 and machine-readable accepts[] metadata.
curl -s -i "https://your-service.com/api/paid/search?q=agent-commerce"

# Catalog entry should expose product_id, endpoint, price_usdc, affiliate_bps, network, and output_schema.
curl -s "https://pyrimid.ai/api/v1/catalog?query=paid_search&limit=5"

# Paid retry should include the Base transaction proof produced by your x402 client.
curl -s "https://your-service.com/api/paid/search?q=agent-commerce" \
  -H "X-PAYMENT-TX: 0x..."
```

## Why route through Pyrimid?

- Agents can find your tool in one catalog.
- Buyer agents get a standard x402 payment flow.
- Affiliates can route demand to your tool.
- Vendor, affiliate, and protocol fees are visible onchain.
