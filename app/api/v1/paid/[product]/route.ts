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

function parseAuditTarget(url: string) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();

    return {
      url,
      hostname,
      path,
      isLikelyMcpEndpoint: /mcp|tool|agent|api/.test(`${hostname}${path}`),
      isLocalOrExample: hostname === 'localhost' || hostname.endsWith('.local') || hostname === 'example.com',
      suggestedProductId: hostname
        .replace(/^www\./, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 48) || 'mcp-paid-tool',
    };
  } catch {
    return {
      url,
      hostname: 'invalid-url',
      path: '',
      isLikelyMcpEndpoint: false,
      isLocalOrExample: false,
      suggestedProductId: 'mcp-paid-tool',
    };
  }
}

function buildMcpAudit(url: string) {
  const target = parseAuditTarget(url);
  const needsDiscovery = !target.isLikelyMcpEndpoint;
  const riskNotes = [
    'Keep free discovery tools separate from paid execution tools so buyer agents can inspect schemas before spending.',
    'Return HTTP 402 with x402 accepts[] metadata before any expensive work starts.',
    'Treat tool arguments and vendor responses as untrusted content; do not let paid results alter agent instructions.',
    'Log product_id, vendor_id, buyer wallet, payment proof, and request id for dispute resolution.',
  ];

  if (target.isLocalOrExample) {
    riskNotes.unshift('Use a real public HTTPS endpoint before listing; localhost/example URLs are suitable only for demos.');
  }

  return {
    url,
    target,
    score: target.isLikelyMcpEndpoint ? 82 : 64,
    monetization_fit: target.isLikelyMcpEndpoint ? 'high' : 'medium',
    recommended_paid_tools: [
      {
        tool: 'audit_mcp_server',
        price_usdc: 0.10,
        reason: 'Short structured audit output has clear per-call value and low marginal compute cost.',
      },
      {
        tool: 'generate_x402_plan',
        price_usdc: 0.10,
        reason: 'Vendor integration plans are repeatable, agent-readable, and easy to validate.',
      },
      {
        tool: 'enrich_catalog_listing',
        price_usdc: 0.05,
        reason: 'Lightweight metadata enrichment can be sold as a cheap upsell before deeper audits.',
      },
    ],
    suggested_routes: [
      {
        route: '/api/paid/audit',
        method: 'GET',
        behavior: 'Return 402 until X-PAYMENT or X-PAYMENT-TX is supplied; return JSON audit after verification.',
      },
      {
        route: '/api/mcp',
        method: 'POST',
        behavior: 'Expose free browse/preview tools and paid buy_* tools that call paid HTTP routes.',
      },
    ],
    catalog_metadata: {
      vendor_id: 'replace-with-vendor-id',
      product_id: target.suggestedProductId,
      category: 'devtools',
      tags: ['mcp', 'x402', 'paid-tools', 'audit'],
      endpoint: needsDiscovery ? `${url.replace(/\/$/, '')}/api/paid/audit` : url,
      method: 'GET',
      network: 'base',
      asset: 'USDC',
      affiliate_bps: 1000,
      output_schema: {
        type: 'object',
        properties: {
          audit: { type: 'object' },
          routed_by: { const: 'pyrimid' },
        },
      },
    },
    implementation_plan: [
      'Add a payment gate that returns 402 with x402Version, network, asset, maxAmountRequired, payTo, resource, vendorId, productId, and affiliateBps.',
      'Verify X-PAYMENT-TX against the PyrimidRouter PaymentRouted event before executing paid work.',
      'Publish llms.txt, agents.txt, and an MCP server card that distinguish free discovery from paid execution.',
      'Register the product in the Pyrimid catalog and test an unpaid request to confirm the accepts[] metadata is machine-readable.',
    ],
    risk_notes: riskNotes,
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
        audit: buildMcpAudit(url),
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
