import { NextRequest, NextResponse } from 'next/server';
import { getSeedProduct, paymentRequirement } from '@/lib/seed-products';
import { verifyPyrimidPaymentTx } from '@/lib/payment-verification';

const VENDOR_LEADS = [
  {
    segment: 'mcp',
    target: 'MCP servers with data-heavy tools',
    examples: ['search', 'enrich', 'audit', 'export', 'analyze'],
    discovery: [
      'GitHub search: topic:mcp-server "api key"',
      'MCP registry/server cards with tools that call paid upstream APIs',
      'agents.txt or llms.txt files that mention MCP tools but no pricing',
    ],
    x402_fit: 96,
    revenue_fit: 92,
    integration_lift: 28,
    pitch: 'Gate the highest-value tool with x402, keep free discovery tools open, and list the paid route in the Pyrimid catalog.',
    pyrimid_angle: 'Each MCP tool maps to one product_id with affiliateBps for recommender agents.',
  },
  {
    segment: 'github',
    target: 'Open-source AI API wrappers and SDK demos',
    examples: ['AI search wrappers', 'data enrichment scripts', 'market data APIs'],
    discovery: [
      'GitHub search: "x402" "API" language:TypeScript',
      'GitHub search: "llms.txt" "pricing" "API"',
      'Repos with examples/quickstarts but no paid endpoint or usage metering',
    ],
    x402_fit: 88,
    revenue_fit: 86,
    integration_lift: 35,
    pitch: 'Convert the demo endpoint into a paid per-call route and publish catalog metadata for buyer agents.',
    pyrimid_angle: 'Pyrimid adds payment settlement and affiliate distribution without forcing a marketplace rewrite.',
  },
  {
    segment: 'agent-frameworks',
    target: 'Agent frameworks with plugin or tool marketplaces',
    examples: ['tool routers', 'agent app stores', 'marketplace plugins'],
    discovery: [
      'Docs pages that explain tools/plugins but do not expose paid-tool purchase metadata',
      'Repos with marketplace/plugin folders and no settlement path',
      'Framework templates where adding a resolver creates downstream distribution',
    ],
    x402_fit: 82,
    revenue_fit: 90,
    integration_lift: 48,
    pitch: 'Bundle a Pyrimid resolver so every downstream agent can discover and buy paid tools with affiliate attribution.',
    pyrimid_angle: 'Frameworks can earn as affiliates while vendors keep the paid API relationship.',
  },
  {
    segment: 'api-tools',
    target: 'AI API services with per-call compute or data cost',
    examples: ['scrapers with compliant data sources', 'structured reports', 'model evaluation APIs'],
    discovery: [
      'Landing pages with clear API value but only manual sales contact',
      'OpenAPI specs with expensive endpoints and no micropayment option',
      'Agent-readable docs that describe outputs but not price or payment',
    ],
    x402_fit: 91,
    revenue_fit: 88,
    integration_lift: 32,
    pitch: 'Add a 402 response to the expensive endpoint, price it in Base USDC, and publish OpenAPI plus agents.txt metadata.',
    pyrimid_angle: 'Buyer agents can inspect, pay, and call the API in one flow.',
  },
] as const;

function scoreLead(lead: (typeof VENDOR_LEADS)[number], requestedSegment: string) {
  const segmentBoost = requestedSegment === 'all' || lead.segment === requestedSegment ? 10 : 0;
  return lead.x402_fit + lead.revenue_fit - lead.integration_lift + segmentBoost;
}

function vendorLeadDiscovery(segment: string) {
  const requestedSegment = segment.toLowerCase();
  const filtered = VENDOR_LEADS
    .filter((lead) => requestedSegment === 'all' || lead.segment === requestedSegment)
    .map((lead) => ({
      ...lead,
      score: scoreLead(lead, requestedSegment),
      qualification_questions: [
        'Does the vendor already expose a callable API or MCP tool?',
        'Is at least one output valuable enough for per-call pricing?',
        'Can the endpoint verify x402/Base USDC payment before returning paid data?',
        'Can the vendor publish llms.txt, agents.txt, OpenAPI, or catalog metadata for buyer agents?',
      ],
      outreach_note: `Lead with the concrete ${lead.target} use case; propose one paid endpoint, one price, and one Pyrimid catalog listing.`,
    }))
    .sort((a, b) => b.score - a.score);

  return {
    segment: requestedSegment,
    scoring: {
      formula: 'x402_fit + revenue_fit - integration_lift + segment_match_bonus',
      fields: ['x402_fit', 'revenue_fit', 'integration_lift', 'score'],
      best_score: filtered[0]?.score ?? 0,
    },
    leads: filtered,
    next_actions: [
      'Run the discovery searches for the top segment and keep only vendors with a public API, MCP server, or OpenAPI spec.',
      'Offer a one-endpoint pilot: 402 payment requirement, Base USDC price, Pyrimid catalog metadata, and a public agents.txt/llms.txt entry.',
      'Reject leads that require fake engagement, credential sharing, deposits, KYC bypass, or private user data.',
    ],
  };
}

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
      return vendorLeadDiscovery(segment);
    }
    case 'mcp-server-audit': {
      const url = query.url || 'https://example.com/mcp';
      return {
        audit: {
          url,
          recommended_paid_tools: ['search', 'enrich', 'export', 'analyze'],
          pricing: '$0.01-$0.25 per call depending on compute/data cost',
          integration_steps: [
            'Add 402 response with x402 accepts[] metadata',
            'Register vendor/product in Pyrimid catalog',
            'Expose tool schema in MCP server card',
            'Add affiliateBps for distribution agents',
          ],
        },
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
