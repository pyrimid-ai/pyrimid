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
  name: string;
  url: string;
  segment: string;
  fit_score: number;
  signals: string[];
  suggested_pitch: string;
};

function scoreLead(repo: any, segment: string): VendorLead {
  const text = `${repo.name || ''} ${repo.description || ''} ${(repo.topics || []).join(' ')}`.toLowerCase();
  const stars = Number(repo.stargazers_count || 0);
  const signals = [
    /mcp|model context protocol/.test(text) ? 'mentions MCP' : '',
    /x402|payment|paid|billing|monetiz/.test(text) ? 'payment/monetization language' : '',
    /api|server|tool|agent/.test(text) ? 'agent/API/tool surface' : '',
    stars >= 100 ? '100+ GitHub stars' : '',
    repo.pushed_at ? `active repo, last pushed ${repo.pushed_at.slice(0, 10)}` : '',
  ].filter(Boolean);
  const fit_score = Math.min(100,
    35 +
    (signals.length * 12) +
    Math.min(20, Math.floor(Math.log10(Math.max(stars, 1)) * 8))
  );

  return {
    name: repo.full_name || repo.name || 'unknown',
    url: repo.html_url || '',
    segment,
    fit_score,
    signals,
    suggested_pitch: 'Package one high-value API/tool call behind x402, list it in Pyrimid, and set affiliateBps so agents have a reason to distribute it.',
  };
}

async function githubLeadSearch(segment: string): Promise<VendorLead[]> {
  const queries: Record<string, string> = {
    mcp: 'mcp server agent tools in:name,description,topics stars:>10',
    'agent-frameworks': 'ai agent framework tools api in:name,description,topics stars:>50',
    'api-tools': 'paid api data tool in:name,description,topics stars:>20',
    x402: 'x402 usdc api in:name,description,topics',
  };
  const query = queries[segment] || queries.mcp;
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=8`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (!response.ok) throw new Error(`GitHub search failed: ${response.status}`);
    const data = await response.json();
    return (data.items || []).map((repo: any) => scoreLead(repo, segment));
  } catch {
    return [];
  }
}

async function buildVendorLeadDiscovery(segment: string) {
  const liveLeads = await githubLeadSearch(segment);
  const fallbackLeads: VendorLead[] = [
    {
      segment: 'mcp',
      name: 'MCP servers with paid/data-heavy tools',
      url: 'https://github.com/search?q=mcp+server+agent+tools&type=repositories',
      fit_score: 76,
      signals: ['tool interface already exists', 'easy to add paid execution tools'],
      suggested_pitch: 'Keep discovery free, gate expensive tools with x402, and list the product in Pyrimid catalog.',
    },
    {
      segment: 'agent-frameworks',
      name: 'Agent frameworks with plugin marketplaces',
      url: 'https://github.com/search?q=ai+agent+framework+tools&type=repositories',
      fit_score: 72,
      signals: ['agent distribution channel', 'reusable tool resolution layer'],
      suggested_pitch: 'Add Pyrimid as the paid-tool resolver so builders can sell agent capabilities in USDC.',
    },
    {
      segment: 'api-tools',
      name: 'AI API wrappers with per-call cost',
      url: 'https://github.com/search?q=ai+api+tool+paid&type=repositories',
      fit_score: 68,
      signals: ['per-call cost maps to x402', 'clean catalog metadata possible'],
      suggested_pitch: 'Expose one paid endpoint, return 402 accepts[] metadata, and offer affiliateBps for distribution agents.',
    },
  ];

  const leads = liveLeads.length ? liveLeads : fallbackLeads.filter((lead) => lead.segment === segment || segment === 'all');

  return {
    segment,
    source: liveLeads.length ? 'github-search' : 'fallback',
    generated_at: new Date().toISOString(),
    leads,
    scoring: {
      fit_score: '0-100 based on MCP/x402/payment/API signals, repo freshness, and stars',
      priority: 'Start with leads above 75, then ask for one paid endpoint with catalog metadata.',
    },
    outreach_fields: ['name', 'url', 'fit_score', 'signals', 'suggested_pitch'],
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
      const segment = query.segment || 'mcp';
      return {
        vendor_lead_discovery: await buildVendorLeadDiscovery(segment),
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
