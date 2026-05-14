# Sell a Paid MCP Tool with x402 and Pyrimid

This guide shows a reproducible pattern for turning one MCP tool or API call into a paid Base USDC endpoint routed through Pyrimid.

Use this when your MCP server has a tool with real per-call cost or value: search, scraping, enrichment, analytics, compliance checks, model calls, exports, or proprietary data.

## What You Will Build

- A free MCP preview tool that tells agents what the paid tool returns.
- A paid HTTP endpoint that returns `402 Payment Required` until the buyer sends `X-PAYMENT` or `X-PAYMENT-TX`.
- Pyrimid catalog metadata so buyer agents can discover the tool before paying.
- A repeatable curl check for the 402 payment requirement.

Live Pyrimid links:

- Catalog: https://pyrimid.ai/api/v1/catalog
- Quickstart: https://pyrimid.ai/quickstart
- Payment proof: https://pyrimid.ai/proof

## 1. Pick One Paid Tool

Start with one small, valuable operation. Do not charge for a whole MCP server at first; charge for one tool result.

Example product:

```txt
Tool: company_intel
Free preview: preview_company_intel
Paid endpoint: GET /api/paid/company-intel?domain=example.com
Price: 0.05 USDC
Affiliate commission: 30%
Network: Base
Asset: USDC
```

The preview should be free and deterministic. It should return the schema, price, sample output, and payment route without doing the expensive work.

## 2. Add a Paid Endpoint

In a Next.js app that already uses this repository's payment verifier, add a route like `app/api/paid/company-intel/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { CONTRACTS } from '@/lib/contracts';
import { verifyPyrimidPaymentTx } from '@/lib/payment-verification';

const PRODUCT = {
  vendorId: 'example-intel',
  productId: 'company-intel',
  priceDisplay: '0.05',
  priceAtomic: 50000,
  affiliateBps: 3000,
  description: 'Paid company intelligence summary for agent workflows',
};

function paymentRequired(req: NextRequest) {
  const requirement = {
    x402Version: 2,
    scheme: 'exact',
    network: 'base',
    asset: 'USDC',
    maxAmountRequired: PRODUCT.priceDisplay,
    payTo: CONTRACTS.ROUTER,
    resource: req.url,
    description: PRODUCT.description,
    mimeType: 'application/json',
    vendorId: PRODUCT.vendorId,
    productId: PRODUCT.productId,
    affiliateBps: PRODUCT.affiliateBps,
    protocol: 'pyrimid',
  };

  return NextResponse.json(
    {
      error: 'payment_required',
      message: `Pay ${PRODUCT.priceDisplay} USDC on Base, then retry with X-PAYMENT or X-PAYMENT-TX.`,
      accepts: [requirement],
      docs: 'https://pyrimid.ai/quickstart',
      catalog: 'https://pyrimid.ai/api/v1/catalog',
    },
    {
      status: 402,
      headers: {
        'X-PAYMENT-REQUIRED': JSON.stringify(requirement),
        'X-Pyrimid-Vendor': PRODUCT.vendorId,
        'X-Pyrimid-Product': PRODUCT.productId,
        'Cache-Control': 'no-store',
      },
    }
  );
}

export async function GET(req: NextRequest) {
  const proof = req.headers.get('x-payment-tx') || req.headers.get('x-payment');
  if (!proof) return paymentRequired(req);

  const verification = await verifyPyrimidPaymentTx(proof, PRODUCT.priceAtomic);
  if (!verification.valid) {
    return NextResponse.json(
      {
        error: 'payment_invalid',
        message: verification.reason || 'Payment could not be verified on Base',
        proof: 'https://pyrimid.ai/proof',
      },
      { status: 403, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const domain = req.nextUrl.searchParams.get('domain') || 'example.com';

  return NextResponse.json(
    {
      product_id: PRODUCT.productId,
      vendor_id: PRODUCT.vendorId,
      payment_tx: verification.txHash,
      buyer: verification.buyer,
      result: {
        domain,
        summary: `${domain} is ready for agent-readable paid API packaging.`,
        recommended_offer: 'Expose one preview tool and one paid enrichment endpoint.',
        confidence: 0.82,
      },
      routed_by: 'pyrimid',
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
```

The important pieces are:

- `402` before payment.
- `accepts[]` with `network`, `asset`, `maxAmountRequired`, `payTo`, `resource`, `vendorId`, and `productId`.
- `X-PAYMENT-REQUIRED` header for agents that read payment requirements from headers.
- `verifyPyrimidPaymentTx` before running the expensive operation.
- `Cache-Control: no-store` so paid responses are not cached across buyers.

## 3. Expose Free MCP Preview and Paid Tool Names

Your MCP server should expose one free preview tool and one paid tool. The paid MCP tool can call the HTTP endpoint above after the wallet/client has paid.

Tool card shape:

```json
{
  "tools": [
    {
      "name": "preview_company_intel",
      "description": "Returns price, output schema, sample result, and x402 payment requirement for company_intel.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "domain": { "type": "string" }
        },
        "required": ["domain"]
      }
    },
    {
      "name": "buy_company_intel",
      "description": "Returns paid company intelligence after x402/Base USDC payment through Pyrimid.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "domain": { "type": "string" },
          "payment_tx": { "type": "string" }
        },
        "required": ["domain", "payment_tx"]
      }
    }
  ]
}
```

Preview response shape:

```json
{
  "tool": "buy_company_intel",
  "price": "0.05 USDC",
  "network": "base",
  "asset": "USDC",
  "endpoint": "https://vendor.example/api/paid/company-intel?domain=example.com",
  "sample": {
    "domain": "example.com",
    "summary": "Example paid result",
    "confidence": 0.82
  },
  "output_schema": {
    "type": "object",
    "required": ["domain", "summary", "recommended_offer", "confidence"]
  }
}
```

## 4. Publish Pyrimid Catalog Metadata

Add metadata anywhere agents can read it: your catalog endpoint, `llms.txt`, `agents.txt`, an MCP server card, or a repository README.

```json
{
  "vendor_id": "example-intel",
  "vendor_name": "Example Intel",
  "vendor_erc8004": false,
  "product_id": "company-intel",
  "description": "Paid company intelligence summary for agent workflows.",
  "category": "mcp-tools",
  "tags": ["mcp", "x402", "company-intel", "paid-tools", "base-usdc"],
  "price_usdc": 50000,
  "price_display": "$0.05",
  "affiliate_bps": 3000,
  "endpoint": "https://vendor.example/api/paid/company-intel?domain=example.com",
  "method": "GET",
  "network": "base",
  "asset": "USDC",
  "output_schema": {
    "type": "object",
    "required": ["result", "routed_by"],
    "properties": {
      "result": {
        "type": "object",
        "required": ["domain", "summary", "recommended_offer", "confidence"]
      },
      "routed_by": { "const": "pyrimid" }
    }
  }
}
```

`price_usdc` is atomic USDC units for catalog and contract checks. `price_display` is the human-readable amount.

## 5. Reproduce the 402 Flow

You can check the payment challenge before wiring a wallet:

```bash
curl -i 'https://pyrimid.ai/api/v1/paid/mcp-server-audit?url=https%3A%2F%2Fexample.com%2Fmcp'
```

Expected shape:

```http
HTTP/1.1 402 Payment Required
X-PAYMENT-REQUIRED: {"x402Version":2,"scheme":"exact","network":"base","asset":"USDC",...}
X-Pyrimid-Vendor: pyrimid-growth
X-Pyrimid-Product: mcp-server-audit
Cache-Control: no-store
```

The JSON body should include:

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
      "protocol": "pyrimid"
    }
  ],
  "docs": "https://pyrimid.ai/quickstart"
}
```

After payment, retry with a Base transaction hash:

```bash
curl -i \
  -H 'X-PAYMENT-TX: 0xYOUR_BASE_TX_HASH' \
  'https://vendor.example/api/paid/company-intel?domain=example.com'
```

## 6. Agent Buyer Checklist

Buyer agents should follow this sequence:

1. Read Pyrimid catalog or MCP preview metadata.
2. Fetch the paid endpoint without a payment header.
3. Parse the `402` response and `X-PAYMENT-REQUIRED`.
4. Check wallet policy and max price before spending.
5. Pay on Base USDC through the Pyrimid router.
6. Retry with `X-PAYMENT-TX`.
7. Store the result with the payment transaction hash for auditability.

## Launch Checklist

- The paid endpoint returns `402` without a proof.
- The endpoint includes `X-PAYMENT-REQUIRED`.
- Invalid proofs return `403`.
- Valid proofs are checked before the paid operation runs.
- The result is deterministic JSON with an explicit schema.
- `Cache-Control: no-store` is set on 402, 403, and paid responses.
- Catalog metadata includes endpoint, price, network, asset, affiliate bps, and output schema.
- `llms.txt`, `agents.txt`, or the MCP server card links to the paid endpoint and Pyrimid catalog.
