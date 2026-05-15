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

function vendorLeadDiscovery(segment: string) {
  const normalized = segment.trim().toLowerCase() || 'mcp';
  const segmentProfiles: Record<string, { label: string; tags: string[]; intent: string }> = {
    mcp: {
      label: 'MCP servers and tool vendors',
      tags: ['mcp-server', 'tools', 'stdio', 'streamable-http'],
      intent: 'Monetize high-value tools with x402-gated paid endpoints.',
    },
    'agent-frameworks': {
      label: 'Agent frameworks and plugin ecosystems',
      tags: ['agent-framework', 'plugins', 'marketplace', 'tools'],
      intent: 'Add Pyrimid as a default commerce layer for agent tool purchases.',
    },
    'api-tools': {
      label: 'AI API and data-tool vendors',
      tags: ['api', 'data', 'enrichment', 'search'],
      intent: 'Convert per-call API value into Base USDC settlement through x402.',
    },
  };
  const profile = segmentProfiles[normalized] || segmentProfiles.mcp;

  const leads = [
    {
      name: 'MCP servers with paid or rate-limited tools',
      source_type: 'github_search',
      discovery_query: `topic:mcp-server ${profile.tags.join(' ')}`,
      fit_score: 92,
      score_reasons: ['already exposes tool interface', 'can add 402 gate without changing buyer UX', 'strong agent-discovery fit'],
      suggested_pitch: 'List one premium tool in Pyrimid and let agents pay per call with Base USDC.',
    },
    {
      name: 'Agent frameworks with plugin registries',
      source_type: 'github_search',
      discovery_query: 'agent framework plugin marketplace tool registry',
      fit_score: 84,
      score_reasons: ['aggregates tool demand', 'can distribute affiliate revenue to agent builders', 'clear recurring distribution channel'],
      suggested_pitch: 'Bundle Pyrimid resolver support so framework users can recommend and buy paid tools.',
    },
    {
      name: 'AI API wrappers with expensive upstream calls',
      source_type: 'web_search',
      discovery_query: `${normalized} AI API enrichment search pricing`,
      fit_score: 79,
      score_reasons: ['direct per-call cost', 'pricing already familiar', 'simple x402 route shape'],
      suggested_pitch: 'Offer a low-priced paid endpoint and publish catalog metadata for buyer agents.',
    },
    {
      name: 'Public agent directories',
      source_type: 'directory_search',
      discovery_query: 'AI agent directory MCP x402 paid tools',
      fit_score: 71,
      score_reasons: ['existing discovery surface', 'can route traffic to paid tools', 'good affiliate candidate'],
      suggested_pitch: 'Add Pyrimid catalog links and earn affiliate commission on paid tool referrals.',
    },
  ];

  return {
    segment: normalized,
    target_profile: profile,
    scoring_model: {
      max_score: 100,
      signals: {
        has_tool_interface: 30,
        exposes_api_or_mcp: 25,
        has_clear_per_call_value: 20,
        has_existing_distribution: 15,
        has_public_contact_or_repo: 10,
      },
    },
    discovery_queries: [
      `GitHub: topic:mcp-server ${profile.tags.join(' ')}`,
      `GitHub: "${normalized}" "MCP" "tools"`,
      `Web: "${normalized}" "x402" OR "paid API"`,
      `Directory: agent tool marketplace ${normalized}`,
    ],
    leads,
    clean_json_schema: {
      required: ['name', 'source_type', 'discovery_query', 'fit_score', 'score_reasons', 'suggested_pitch'],
      fit_score_range: '0-100',
    },
    outreach_next_steps: [
      'Verify the target has a public repo, docs, or contact path.',
      'Check whether the tool has high-cost calls, rate limits, premium data, or paid API history.',
      'Pitch one low-friction paid endpoint with 402 metadata and Pyrimid catalog listing.',
      'Track accepted listings and the first non-self x402 transaction.',
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
        vendor_lead_discovery: vendorLeadDiscovery(segment),
      };
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
