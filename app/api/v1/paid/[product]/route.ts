import { NextRequest, NextResponse } from 'next/server';
import { getSeedProduct, paymentRequirement } from '@/lib/seed-products';
import { verifyPyrimidPaymentTx } from '@/lib/payment-verification';

type GithubSearchItem = {
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  pushed_at: string;
  language: string | null;
  topics?: string[];
};

const SEGMENT_QUERIES: Record<string, string> = {
  mcp: 'mcp server tools in:name,description,readme stars:>5 pushed:>2026-01-01',
  'agent-frameworks': 'agent framework mcp marketplace in:name,description,readme stars:>10 pushed:>2026-01-01',
  'api-tools': 'api wrapper paid data service in:name,description,readme stars:>5 pushed:>2026-01-01',
  x402: 'x402 USDC API payment in:name,description,readme pushed:>2026-01-01',
};

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

function toLeadScore(item: GithubSearchItem, segment: string) {
  const text = `${item.full_name} ${item.description || ''} ${(item.topics || []).join(' ')}`.toLowerCase();
  const signals = [
    text.includes('mcp') ? 'mcp' : '',
    text.includes('x402') ? 'x402' : '',
    text.includes('api') ? 'api' : '',
    text.includes('agent') ? 'agent' : '',
    text.includes('tool') ? 'tool' : '',
    item.language ? `language:${item.language}` : '',
  ].filter((signal): signal is string => Boolean(signal));
  const starScore = Math.min(25, Math.floor(Math.log10(Math.max(1, item.stargazers_count)) * 10));
  const segmentScore = signals.includes(segment) || text.includes(segment.replace('-', ' ')) ? 20 : 0;
  const monetizationScore = text.includes('api') || text.includes('data') || text.includes('tool') ? 15 : 0;
  const score = Math.min(100, 35 + starScore + segmentScore + monetizationScore + Math.min(10, signals.length * 2));

  return {
    target: item.full_name,
    url: item.html_url,
    source: 'github_search',
    fit_score: score,
    fit: score >= 75 ? 'high' : score >= 55 ? 'medium' : 'exploratory',
    signals,
    reason: `Public repo with ${item.stargazers_count} stars, ${item.language || 'unknown'} code, and signals matching ${segment}.`,
    suggested_product: text.includes('search')
      ? 'paid semantic search endpoint'
      : text.includes('data') || text.includes('api')
        ? 'paid data/API enrichment endpoint'
        : 'paid MCP tool endpoint',
    pitch: 'Add a small x402-gated route, list it in Pyrimid catalog, and offer 20-40% affiliateBps so distribution agents have a reason to route buyers.',
    next_action: 'Open the repo docs/API surface and identify one endpoint with clear per-call value.',
    last_pushed: item.pushed_at,
  };
}

async function fetchGithubLeads(segment: string, limit: number) {
  const query = SEGMENT_QUERIES[segment] || `${segment} mcp api agent in:name,description,readme pushed:>2026-01-01`;
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=${Math.min(10, Math.max(3, limit))}`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Pyrimid-Vendor-Lead-Discovery/1.0',
      },
      cache: 'no-store',
    });
    if (!response.ok) {
      return { query, leads: [], error: `github_search_${response.status}` };
    }

    const data = await response.json() as { items?: GithubSearchItem[] };
    const leads = (data.items || []).slice(0, limit).map((item) => toLeadScore(item, segment));
    return { query, leads, error: null };
  } catch (error) {
    return {
      query,
      leads: [],
      error: error instanceof Error ? error.message : 'github_search_failed',
    };
  }
}

async function buildVendorLeadDiscovery(query: Record<string, string>) {
  const segment = query.segment || 'mcp';
  const limit = Math.min(8, Math.max(3, Number(query.limit || 5) || 5));
  const live = await fetchGithubLeads(segment, limit);
  const fallbackLeads = [
    { segment: 'mcp', target: 'MCP servers with paid/data-heavy tools', pitch: 'Add optional x402 payment gate + Pyrimid catalog listing.' },
    { segment: 'agent-frameworks', target: 'Agent frameworks with marketplace/plugin systems', pitch: 'Let builders sell tools to agents with Base USDC settlement.' },
    { segment: 'api-tools', target: 'AI API services with per-call cost', pitch: 'Turn API calls into agent-purchasable products.' },
  ].map((lead, index) => ({
    target: lead.target,
    url: null,
    source: 'fallback',
    fit_score: 60 - index * 5,
    fit: index === 0 ? 'medium' : 'exploratory',
    signals: [lead.segment],
    reason: `Seed segment pattern for ${lead.segment}.`,
    suggested_product: 'paid MCP/API endpoint',
    pitch: lead.pitch,
    next_action: 'Replace this fallback with a live repo/API target before outreach.',
  }));

  return {
    segment,
    generated_at: new Date().toISOString(),
    discovery_query: live.query,
    discovery_error: live.error,
    leads: live.leads.length ? live.leads : fallbackLeads,
    scoring_model: {
      base: 35,
      stars: 'up to 25 points from log-scaled GitHub stars',
      segment_match: '20 points for segment terms',
      monetization_surface: '15 points for API/data/tool language',
      signal_density: 'up to 10 points for multiple matched signals',
    },
    outreach_template: {
      subject: 'Add Base USDC payments to your agent/API endpoint',
      ask: 'Package one useful call as an x402 paid endpoint, then list it in Pyrimid with affiliateBps for distribution.',
      proof_to_request: ['endpoint URL', '402 preflight response', 'catalog product_id', 'first Base USDC tx hash'],
    },
    pyrimid_catalog_template: {
      vendor_id: '{vendor-slug}',
      product_id: '{paid-tool-slug}',
      endpoint: 'https://vendor.example/api/paid/tool',
      category: 'devtools',
      tags: ['mcp', 'x402', 'api', 'base-usdc'],
      price_usdc: 100000,
      affiliate_bps: 3000,
    },
  };
}

async function payload(productId: string, req: NextRequest, proof: string) {
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
      return buildVendorLeadDiscovery(query);
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
    ...(await payload(product.product_id, req, proof)),
    routed_by: 'pyrimid',
    links: {
      docs: 'https://pyrimid.ai/quickstart',
      proof: 'https://pyrimid.ai/proof',
      stats: 'https://pyrimid.ai/stats',
      catalog: 'https://pyrimid.ai/api/v1/catalog',
    },
  }, { headers: { 'Cache-Control': 'no-store' } });
}
