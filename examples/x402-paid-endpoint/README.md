# x402 paid endpoint example

Use this pattern when you run an API, dataset, scraper, model wrapper, or signal feed and want agents to pay per call with Base USDC.

## 1. Return HTTP 402 until paid

```ts
import { NextRequest, NextResponse } from 'next/server';

const product = {
  vendorId: 'your-vendor',
  productId: 'your-paid-tool',
  price: '0.10',
  payTo: '0xc949AEa380D7b7984806143ddbfE519B03ABd68B', // PyrimidRouter
};

export async function GET(req: NextRequest) {
  const proof = req.headers.get('x-payment') || req.headers.get('x-payment-tx');

  if (!proof) {
    const requirement = {
      x402Version: 2,
      scheme: 'exact',
      network: 'base',
      asset: 'USDC',
      maxAmountRequired: product.price,
      payTo: product.payTo,
      resource: req.url,
      description: 'Paid API call routed through Pyrimid',
      mimeType: 'application/json',
      vendorId: product.vendorId,
      productId: product.productId,
      affiliateBps: 3000,
      protocol: 'pyrimid',
    };

    return NextResponse.json(
      { error: 'payment_required', accepts: [requirement] },
      { status: 402, headers: { 'X-PAYMENT-REQUIRED': JSON.stringify(requirement) } }
    );
  }

  return NextResponse.json({ ok: true, paid: true, data: 'your paid result' });
}
```

## 2. List it in Pyrimid

Expose metadata through `llms.txt`, `agents.txt`, and the Pyrimid catalog so agents can discover the endpoint before buying.

- Catalog: https://pyrimid.ai/api/v1/catalog
- Quickstart: https://pyrimid.ai/quickstart
- Proof: https://pyrimid.ai/proof
