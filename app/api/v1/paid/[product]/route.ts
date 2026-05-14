import { NextRequest, NextResponse } from 'next/server';
import { getSeedProduct, paymentRequirement } from '@/lib/seed-products';
import { verifyPyrimidPaymentTx } from '@/lib/payment-verification';

function paymentRequired(req: NextRequest, product: NonNullable<ReturnType<typeof getSeedProduct>>) {
  const requirement = paymentRequirement(product, req.url);
  return NextResponse.json(
    {
      error: 'payment_required',
      message: `Pay ${product.price_display} USDC on Base through Pyrimid, then retry with X-PAYMENT or X-PAYMENT-TX.`,
      accepts: [requirement],
      docs: 'https://pyrimid.ai/quickstart',
      catalog: 'https://pyrimid.ai/api/v1/catalog?source=pyrimid-seed',
    },
    {
      status: 402,
      headers: {
        'X-PAYMENT-REQUIRED': JSON.stringify(requirement),
        'X-Pyrimid-Vendor': product.vendor_id,
        'X-Pyrimid-Product': product.product_id,
        'Cache-Control': 'no-store',
      },
    }
  );
}

function hostHint(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl);
    return {
      url: parsed.toString(),
      host: parsed.hostname,
      slug: parsed.hostname.replace(/^www\./, '').split('.')[0] || 'mcp-server',
      secure: parsed.protocol === 'https:',
    };
  } catch {
    return {
      url: rawUrl,
      host: 'unknown-host',
      slug: 'mcp-server',
      secure: false,
    };
  }
}

function auditMcpServer(rawUrl: string) {
  const target = hostHint(rawUrl);
  const lower = rawUrl.toLowerCase();
  const likelyCategories = [
    lower.includes('search') || lower.includes('index') ? 'search' : null,
    lower.includes('data') || lower.includes('api') ? 'data-api' : null,
    lower.includes('audit') || lower.includes('security') ? 'audit' : null,
    lower.includes('agent') || lower.includes('mcp') ? 'agent-tooling' : null,
  ].filter(Boolean);
  const primaryCategory = likelyCategories[0] || 'general-mcp';

  const candidateTools = [
    {
      tool: 'preview',
      why: 'Free or low-cost teaser that lets buyer agents inspect freshness and schema before payment.',
      route: `/api/paid/${target.slug}/preview`,
      suggested_price_usdc: 0,
    },
    {
      tool: 'search',
      why: 'Usage-based search maps cleanly to per-call pricing and affiliate distribution.',
      route: `/api/paid/${target.slug}/search`,
      suggested_price_usdc: primaryCategory === 'search' ? 0.05 : 0.03,
    },
    {
      tool: 'enrich',
      why: 'Transforms a buyer-provided URL, repo, or record into higher-value structured output.',
      route: `/api/paid/${target.slug}/enrich`,
      suggested_price_usdc: 0.1,
    },
    {
      tool: 'export',
      why: 'Batch output should cost more because it is larger and easier to resell downstream.',
      route: `/api/paid/${target.slug}/export`,
      suggested_price_usdc: 0.25,
    },
  ];

  return {
    url: target.url,
    host: target.host,
    https_ready: target.secure,
    likely_category: primaryCategory,
    recommended_paid_tools: candidateTools,
    pricing: {
      preview: '$0.00 or $0.01',
      single_lookup: '$0.03-$0.10',
      enriched_report: '$0.10-$0.25',
      batch_export: '$0.25-$1.00',
      rule: 'Price by marginal data/model cost plus value to a buyer agent; keep the first paid call below $0.25 to reduce friction.',
    },
    payment_route_shape: {
      unpaid: 'Return HTTP 402 with accepts[] containing Base USDC asset, exact amount, payTo, resource, and mimeType.',
      paid: 'Verify X-PAYMENT or X-PAYMENT-TX before returning paid data.',
      retry: 'Buyer agent retries the same route with payment proof after x402 settlement.',
    },
    catalog_metadata: {
      vendor_id: target.slug,
      product_id: `${target.slug}-${primaryCategory}`,
      category: primaryCategory,
      tags: ['mcp', 'x402', 'base-usdc', primaryCategory],
      endpoint: `${target.url.replace(/\/$/, '')}/paid/${primaryCategory}`,
      method: 'GET',
      affiliate_bps: 2000,
      output_schema: {
        type: 'object',
        required: ['result', 'routed_by'],
        properties: {
          result: { type: 'object' },
          routed_by: { const: 'pyrimid' },
        },
      },
    },
    risk_notes: [
      target.secure ? 'HTTPS is present; keep TLS mandatory for paid routes.' : 'Use HTTPS before accepting payment proofs.',
      'Do not return paid data before payment verification succeeds.',
      'Keep secrets out of 402 examples, logs, query strings, and catalog metadata.',
      'Document rate limits and cache freshness so buyer agents can price retries.',
    ],
    launch_checklist: [
      'Add one unpaid 402 fixture test.',
      'Add one paid-path verification test using a mocked valid x402 proof.',
      'Publish llms.txt, agents.txt, and an MCP server card that point to the paid products.',
      'List the product in the Pyrimid catalog with stable vendor_id/product_id.',
    ],
  };
}

function payload(productId: string, req: NextRequest, proof: string) {
  const query = Object.fromEntries(req.nextUrl.searchParams.entries());

  switch (productId) {
    case 'mya-agent-enrichment': {
      const agent = query.agent || 'demo-agent';
      return {
        enrichment: {
          agent,
          category: 'developer-tools',
          agent_readable_summary: `${agent} can monetize API calls by exposing paid tools through x402 and listing them in the Pyrimid catalog.`,
          monetization_angle: 'Package one high-value tool as a paid MCP/API endpoint priced $0.05-$0.25 per call.',
          suggested_cta: 'Claim listing → add paid tool → route purchases through Pyrimid.',
        },
      };
    }
    case 'mya-category-scout': {
      const category = query.category || 'developer-tools';
      return {
        category,
        agents: [
          { name: 'MCP server vendors', fit: 'high', reason: 'Already expose tool interfaces; easiest path to paid tools.' },
          { name: 'AI API wrappers', fit: 'high', reason: 'Usage-based value maps cleanly to x402 per-call pricing.' },
          { name: 'agent directories', fit: 'medium', reason: 'Can route discovery traffic into paid vendor listings.' },
        ],
      };
    }
    case 'vendor-lead-discovery': {
      const segment = query.segment || 'mcp';
      return {
        segment,
        leads: [
          { segment: 'mcp', target: 'MCP servers with paid/data-heavy tools', pitch: 'Add optional x402 payment gate + Pyrimid catalog listing.' },
          { segment: 'agent-frameworks', target: 'Agent frameworks with marketplace/plugin systems', pitch: 'Let builders sell tools to agents with Base USDC settlement.' },
          { segment: 'api-tools', target: 'AI API services with per-call cost', pitch: 'Turn API calls into agent-purchasable products.' },
        ],
      };
    }
    case 'mcp-server-audit': {
      const url = query.url || 'https://example.com/mcp';
      return {
        audit: auditMcpServer(url),
      };
    }
    case 'x402-integration-plan': {
      const service = query.service || 'agent-api';
      return {
        plan: {
          service,
          route_shape: 'GET /api/paid/{tool} returns 402 until X-PAYMENT or X-PAYMENT-TX is supplied',
          payment_network: 'Base USDC',
          pyrimid_metadata: ['vendorId', 'productId', 'affiliateBps', 'endpoint', 'output_schema'],
          launch_checklist: ['publish llms.txt', 'publish agents.txt', 'submit MCP server card', 'list product in Pyrimid catalog'],
        },
      };
    }
    default:
      return { result: 'unknown_seed_product' };
  }
}

export async function GET(req: NextRequest, context: { params: Promise<{ product: string }> }) {
  const { product: productId } = await context.params;
  const product = getSeedProduct(productId);

  if (!product) {
    return NextResponse.json(
      { error: 'not_found', message: 'Unknown Pyrimid seed product', catalog: 'https://pyrimid.ai/api/v1/catalog' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const proof = req.headers.get('x-payment-tx') || req.headers.get('x-payment');
  if (!proof) return paymentRequired(req, product);

  const verification = await verifyPyrimidPaymentTx(proof, product.price_usdc);
  if (!verification.valid) {
    return NextResponse.json(
      {
        error: 'payment_invalid',
        message: verification.reason || 'Payment could not be verified on Base',
        docs: 'https://pyrimid.ai/quickstart',
        proof: 'https://pyrimid.ai/proof',
      },
      { status: 403, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  return NextResponse.json({
    product_id: product.product_id,
    vendor_id: product.vendor_id,
    payment_tx: verification.txHash,
    payment_amount: verification.amount?.toString(),
    buyer: verification.buyer,
    ...payload(product.product_id, req, proof),
    routed_by: 'pyrimid',
    links: {
      docs: 'https://pyrimid.ai/quickstart',
      proof: 'https://pyrimid.ai/proof',
      stats: 'https://pyrimid.ai/stats',
      catalog: 'https://pyrimid.ai/api/v1/catalog',
    },
  }, { headers: { 'Cache-Control': 'no-store' } });
}
