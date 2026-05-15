# Paid MCP Tool Pattern

Use this pattern when an MCP server exposes data, scraping, enrichment,
analytics, compliance checks, search, or model calls that are expensive enough
to charge per use.

The core flow is:

1. Publish product metadata so buyer agents can discover the paid tool.
2. Let a free preview tool show schema, price, sample output, and payment terms.
3. Return HTTP `402 Payment Required` from the paid endpoint until the buyer
   provides an x402 payment proof.
4. Retry the same endpoint with `X-PAYMENT` or `X-PAYMENT-TX`.
5. Return the paid result and let Pyrimid route vendor, affiliate, and protocol
   settlement in USDC on Base.

Pyrimid entry points:

- Catalog: https://pyrimid.ai/api/v1/catalog
- Quickstart: https://pyrimid.ai/quickstart
- MCP server: https://pyrimid.ai/api/mcp

## Tool Design

Expose two related tools:

- `preview_*`: free tool that returns schema, price, sample output, and the
  x402/Pyrimid payment requirement.
- `buy_*`: paid tool that calls the paid HTTP endpoint and returns either the
  paid result or the `402` requirement.

This keeps discovery cheap while making the paid output explicit and auditable.

## Minimal Product Metadata

Publish metadata through `llms.txt`, `agents.txt`, an MCP server card, and the
Pyrimid catalog.

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
  "network": "base",
  "asset": "USDC"
}
```

## Paid Endpoint Example

The paid HTTP endpoint should be deterministic enough for agents to verify and
should explain the payment requirement before asking for funds.

```ts
import { NextRequest, NextResponse } from "next/server";

const product = {
  vendorId: "your-mcp-server",
  productId: "paid_search",
  price: "0.50",
  payTo: "0xc949AEa380D7b7984806143ddbfE519B03ABd68B", // PyrimidRouter
};

function paymentRequirement(req: NextRequest) {
  return {
    x402Version: 2,
    scheme: "exact",
    network: "base",
    asset: "USDC",
    maxAmountRequired: product.price,
    payTo: product.payTo,
    resource: req.url,
    description: "Paid MCP search result routed through Pyrimid",
    mimeType: "application/json",
    vendorId: product.vendorId,
    productId: product.productId,
    affiliateBps: 3000,
    protocol: "pyrimid",
  };
}

export async function POST(req: NextRequest) {
  const proof =
    req.headers.get("x-payment") || req.headers.get("x-payment-tx");

  if (!proof) {
    const requirement = paymentRequirement(req);

    return NextResponse.json(
      {
        error: "payment_required",
        accepts: [requirement],
        retry: {
          method: "POST",
          headers: ["X-PAYMENT", "X-PAYMENT-TX"],
        },
      },
      {
        status: 402,
        headers: {
          "X-PAYMENT-REQUIRED": JSON.stringify(requirement),
        },
      }
    );
  }

  const body = await req.json();
  const query = String(body.query || "");

  return NextResponse.json({
    ok: true,
    paid: true,
    product_id: product.productId,
    query,
    results: [
      {
        title: "Example enriched result",
        url: "https://example.com/source",
        summary: "Replace this with the paid search, enrichment, or model output.",
      },
    ],
  });
}
```

## MCP Tool Shape

The MCP tool can wrap the HTTP endpoint and surface the same pricing metadata.

```json
{
  "name": "buy_paid_search",
  "description": "Paid MCP search with enriched citations.",
  "inputSchema": {
    "type": "object",
    "required": ["query"],
    "properties": {
      "query": {
        "type": "string",
        "description": "Search query to enrich."
      }
    }
  },
  "annotations": {
    "payment": {
      "protocol": "x402",
      "router": "pyrimid",
      "network": "base",
      "asset": "USDC",
      "amount": "0.50",
      "product_id": "paid_search"
    }
  }
}
```

## Buyer-Agent Flow

1. Fetch the Pyrimid catalog and select a product.
2. Call the endpoint without payment.
3. Read the `402` response and `X-PAYMENT-REQUIRED` header.
4. Ask the user's wallet policy before spending.
5. Pay through the buyer's x402 client.
6. Retry with `X-PAYMENT` or `X-PAYMENT-TX`.
7. Cache the receipt and show the paid result.

Example unpaid call:

```bash
curl -i -X POST https://your-service.com/api/paid/search \
  -H "Content-Type: application/json" \
  -d '{"query":"agent commerce"}'
```

Example paid retry:

```bash
curl -X POST https://your-service.com/api/paid/search \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: <x402-payment-proof>" \
  -d '{"query":"agent commerce"}'
```

## Reproduction Checklist

Before publishing a paid MCP tool, verify:

- The preview tool is free and returns price, schema, and sample output.
- The paid endpoint returns HTTP `402` without payment.
- The `402` response includes network, asset, price, `payTo`, product ID, and
  retry instructions.
- The paid endpoint accepts `X-PAYMENT` or `X-PAYMENT-TX`.
- The product metadata is available through agent-readable discovery surfaces.
- The catalog entry links to the live endpoint.
- The endpoint never asks for private keys, seed phrases, login cookies, or
  CAPTCHA solving.

## Why Route Through Pyrimid?

- Agents can find your tool in one catalog.
- Buyer agents get a standard x402 payment flow.
- Affiliates can route demand to your tool.
- Vendor, affiliate, and protocol fees are visible onchain.
