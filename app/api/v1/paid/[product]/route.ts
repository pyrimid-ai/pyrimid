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

type VendorLead = {
  lead_id: string;
  segment: string;
  target: string;
  fit_score: number;
  source_channels: string[];
  why_now: string;
  pitch: string;
  discovery_queries: string[];
  next_action: string;
};

function buildVendorLeadDiscovery(segment: string) {
  const normalized = segment.toLowerCase();
  const leadSets: Record<string, VendorLead[]> = {
    mcp: [
      {
        lead_id: 'mcp-paid-data',
        segment: 'mcp',
        target: 'MCP servers with data-heavy or enrichment-heavy tools',
        fit_score: 92,
        source_channels: ['github', 'mcp directories', 'glama-like registries'],
        why_now: 'These vendors already expose machine-usable tools, so adding a paid route is operationally small.',
        pitch: 'Add optional x402 payment gating plus a Pyrimid catalog listing for the highest-cost tools.',
        discovery_queries: [
          'site:github.com \"mcp server\" enrich OR search OR export',
          'site:github.com \"Model Context Protocol\" \"pricing\"',
          'site:glama.ai mcp data search'
        ],
        next_action: 'Shortlist the top five servers whose most valuable tool already burns compute or premium data.'
      },
      {
        lead_id: 'mcp-observability',
        segment: 'mcp',
        target: 'Observability and debugging MCP servers with expensive backend calls',
        fit_score: 84,
        source_channels: ['github', 'mcp directories'],
        why_now: 'They sell high-signal operational context where pay-per-call pricing is easier to justify.',
        pitch: 'Wrap the costly inspect or analyze actions with x402 and affiliate routing.',
        discovery_queries: [
          'site:github.com \"mcp\" observability',
          'site:github.com \"mcp server\" logs metrics traces'
        ],
        next_action: 'Check whether the server already distinguishes cheap metadata tools from expensive analysis tools.'
      }
    ],
    'agent-frameworks': [
      {
        lead_id: 'framework-plugin-marketplace',
        segment: 'agent-frameworks',
        target: 'Agent frameworks with plugin or tool marketplaces',
        fit_score: 88,
        source_channels: ['github', 'docs sites', 'marketplace pages'],
        why_now: 'The framework already owns tool discovery, so Pyrimid can become the payment and affiliate layer.',
        pitch: 'Embed Pyrimid as the default recommendation resolver for paid tools and APIs.',
        discovery_queries: [
          'site:github.com agent framework marketplace tools',
          'site:github.com \"MCP\" framework plugins'
        ],
        next_action: 'Prioritize frameworks where tool discovery is centralized rather than fully ad hoc.'
      }
    ],
    'api-tools': [
      {
        lead_id: 'usage-priced-apis',
        segment: 'api-tools',
        target: 'AI APIs with existing per-call cost or quota limits',
        fit_score: 86,
        source_channels: ['github', 'docs', 'pricing pages'],
        why_now: 'They already think in usage units, so x402 is a packaging change rather than a pricing rewrite.',
        pitch: 'Sell premium endpoints directly to agents with Base USDC settlement and affiliate distribution.',
        discovery_queries: [
          'site:github.com api ai pricing usage-based',
          'site:docs.* \"per request\" ai api'
        ],
        next_action: 'Filter for APIs whose premium value is concentrated in a few high-cost endpoints.'
      }
    ]
  };

  const leads = leadSets[normalized] || leadSets.mcp;
  return {
    output_version: '2',
    segment: normalized,
    lead_count: leads.length,
    scoring_legend: {
      '90+': 'Immediate outreach target',
      '80-89': 'Good target if the team already experiments with MCP or x402',
      'below 80': 'Needs a stronger custom distribution story'
    },
    leads,
    recommended_workflow: [
      'Pick one segment and run the discovery queries.',
      'Score vendors by whether they already expose tool-shaped interfaces.',
      'Pitch the smallest paid route first, not a whole-platform rewrite.'
    ]
  };
}

function normalizeAuditUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl);
    return {
      original: rawUrl,
      origin: parsed.origin,
      hostname: parsed.hostname,
      pathname: parsed.pathname,
      protocol: parsed.protocol.replace(':', '')
    };
  } catch {
    return {
      original: rawUrl,
      origin: null,
      hostname: null,
      pathname: null,
      protocol: null
    };
  }
}

function buildMcpServerAudit(url: string) {
  return {
    audit_version: '2',
    normalized_target: normalizeAuditUrl(url),
    paid_tool_candidates: [
      {
        tool: 'search',
        fit_score: 90,
        reason: 'Search is easy to preview for free and monetize for full result sets or enrichment.'
      },
      {
        tool: 'enrich',
        fit_score: 94,
        reason: 'Enrichment usually burns the most third-party API cost and is the cleanest x402 candidate.'
      },
      {
        tool: 'export',
        fit_score: 82,
        reason: 'Export is often a natural premium boundary when results become operational artifacts.'
      },
      {
        tool: 'analyze',
        fit_score: 88,
        reason: 'Analysis tools are defensible to price when they invoke model or compute-heavy workflows.'
      }
    ],
    pricing_ladder: [
      { tier: 'preview', price_usdc: 0, pattern: 'free schema, sample output, and buy path' },
      { tier: 'standard', price_usdc: 50000, pattern: '$0.05 for lightweight lookup or search' },
      { tier: 'premium', price_usdc: 250000, pattern: '$0.25 for enrichment or analysis with real compute/data cost' }
    ],
    payment_contract: {
      required_headers: ['X-PAYMENT', 'X-PAYMENT-TX'],
      required_402_fields: ['vendorId', 'productId', 'asset', 'network', 'maxAmountRequired', 'resource'],
      route_shape: 'Return HTTP 402 until the buyer retries with verifiable payment proof.'
    },
    catalog_metadata_template: {
      vendor_id: 'your-mcp-server',
      product_id: 'paid_search',
      category: 'devtools',
      affiliate_bps: 3000,
      network: 'base',
      asset: 'USDC'
    },
    integration_steps: [
      'Add a free preview tool and a paid execution tool.',
      'Return x402 accepts[] metadata in the 402 response.',
      'Register the vendor and product in the Pyrimid catalog.',
      'Publish MCP discovery artifacts so buyer agents can find the server before purchase.'
    ],
    risk_notes: [
      'Do not paywall every tool. Keep discovery and lightweight previews free.',
      'Do not force the buyer to infer output shape after paying.',
      'Separate expensive third-party API calls from cheap metadata lookups.'
    ],
    success_criteria: [
      'A buyer can discover the tool before purchase.',
      'The paid route returns a machine-readable 402 contract.',
      'The post-payment payload is deterministic and matches the advertised schema.'
    ]
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
      return { lead_discovery: buildVendorLeadDiscovery(segment) };
    }
    case 'mcp-server-audit': {
      const url = query.url || 'https://example.com/mcp';
      return { audit: buildMcpServerAudit(url) };
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
