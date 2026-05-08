import { NextRequest, NextResponse } from 'next/server';
import { CONTRACTS } from '@/lib/contracts';

const PRICE_USDC = '0.05';
const PRODUCT_ID = 'agentzone-trust-search';
const VENDOR_ID = 'agentzone';
const PYRIMID_ROUTER = CONTRACTS.ROUTER;

function paymentRequired(req: NextRequest) {
  const url = new URL(req.url);
  const requirement = {
    x402Version: 2,
    scheme: 'exact',
    network: 'base',
    asset: 'USDC',
    maxAmountRequired: PRICE_USDC,
    payTo: PYRIMID_ROUTER,
    resource: url.toString(),
    description: 'AgentZone trusted agent search routed through Pyrimid',
    mimeType: 'application/json',
    vendorId: VENDOR_ID,
    productId: PRODUCT_ID,
    affiliateBps: 2500,
    protocol: 'pyrimid',
  };
  return NextResponse.json(
    {
      error: 'payment_required',
      message: `Pay ${PRICE_USDC} USDC on Base through Pyrimid, then retry with X-PAYMENT or X-PAYMENT-TX.`,
      accepts: [requirement],
      docs: 'https://pyrimid.ai/quickstart',
    },
    {
      status: 402,
      headers: {
        'X-PAYMENT-REQUIRED': JSON.stringify(requirement),
        'X-Pyrimid-Vendor': VENDOR_ID,
        'X-Pyrimid-Product': PRODUCT_ID,
        'Cache-Control': 'no-store',
      },
    }
  );
}

export async function GET(req: NextRequest) {
  const proof = req.headers.get('x-payment') || req.headers.get('x-payment-tx');
  if (!proof) return paymentRequired(req);

  const q = req.nextUrl.searchParams.get('q') || 'agent commerce';
  const upstream = new URL('https://agentzone.fun/api/v1/search');
  upstream.searchParams.set('q', q);
  upstream.searchParams.set('limit', '5');

  const res = await fetch(upstream.toString(), { cache: 'no-store' });
  const data = res.ok ? await res.json() : { error: 'agentzone_unavailable' };

  return NextResponse.json({
    product_id: PRODUCT_ID,
    vendor_id: VENDOR_ID,
    query: q,
    payment_proof: proof.slice(0, 24),
    result: data,
    routed_by: 'pyrimid',
    links: {
      source: upstream.toString(),
      agentzone: 'https://agentzone.fun',
      docs: 'https://pyrimid.ai/quickstart',
    },
  }, { headers: { 'Cache-Control': 'no-store' } });
}
