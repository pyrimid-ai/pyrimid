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

function inspectMcpTarget(target: string) {
  const value = target.trim() || 'https://example.com/mcp';
  const lower = value.toLowerCase();
  let hostname = 'unknown';
  let pathname = '';

  try {
    const parsed = new URL(value);
    hostname = parsed.hostname;
    pathname = parsed.pathname;
  } catch {
    if (lower.includes('github.com')) {
      hostname = 'github.com';
      pathname = value.split('github.com').pop() || '';
    }
  }

  const targetType = hostname.includes('github.com')
    ? 'github_repo'
    : lower.includes('mcp')
      ? 'mcp_endpoint'
      : 'api_or_service';

  const signals = [
    hostname.includes('github.com') ? 'source repository available' : 'live endpoint or service URL',
    lower.includes('mcp') ? 'MCP-related naming detected' : 'no explicit MCP marker in URL',
    lower.includes('search') || lower.includes('data') ? 'likely data/search workload' : 'workload type not obvious from URL',
  ];

  return { input: value, hostname, pathname, targetType, signals };
}

function mcpServerAudit(target: string) {
  const inspection = inspectMcpTarget(target);

  const paidTools = [
    {
      name: 'preview_catalog_fit',
      access: 'free',
      reason: 'Let buyer agents inspect schema, sample output, price, and payment policy before spending.',
    },
    {
      name: 'buy_deep_search',
      access: 'paid',
      suggested_price_usdc: 0.05,
      reason: 'Search, scraping, or retrieval results map cleanly to per-call x402 payments.',
    },
    {
      name: 'buy_enrichment_report',
      access: 'paid',
      suggested_price_usdc: 0.1,
      reason: 'Enrichment and analysis outputs have clear value and limited marginal compute/data cost.',
    },
    {
      name: 'buy_export_bundle',
      access: 'paid',
      suggested_price_usdc: 0.25,
      reason: 'CSV/JSON exports can charge more when they aggregate many underlying calls.',
    },
  ];

  return {
    audit: {
      inspection,
      recommended_paid_tools: paidTools,
      pricing: {
        currency: 'USDC',
        network: 'base',
        tiers: [
          { label: 'preview', price_usdc: 0, use_case: 'schema, sample, and quote' },
          { label: 'single_call', price_usdc: 0.05, use_case: 'small search or classification result' },
          { label: 'analysis', price_usdc: 0.1, use_case: 'enrichment, audit, or plan output' },
          { label: 'batch_export', price_usdc: 0.25, use_case: 'multi-record JSON/CSV export' },
        ],
      },
      route_shape: {
        preview_tool: 'preview_* returns metadata without payment',
        paid_endpoint: 'GET or POST /api/paid/{tool} returns HTTP 402 until payment proof is supplied',
        payment_headers: ['X-PAYMENT', 'X-PAYMENT-TX'],
        success_response: 'JSON result includes product_id, vendor_id, payment_tx, paid output, and Pyrimid links',
      },
      catalog_metadata: {
        vendor_id: inspection.hostname.replace(/[^a-z0-9-]/gi, '-').toLowerCase() || 'mcp-vendor',
        product_id: `${inspection.targetType}-paid-tool`,
        category: inspection.targetType === 'github_repo' ? 'developer-tools' : 'data-api',
        tags: ['mcp', 'x402', 'base-usdc', 'paid-tools', inspection.targetType],
        endpoint: inspection.input,
        method: 'GET or POST',
        affiliate_bps: 3000,
        output_schema_required: ['product_id', 'payment_tx', 'result', 'routed_by'],
      },
      integration_steps: [
        'Add a free preview tool with schema, price, sample output, and payment terms.',
        'Wrap the paid route with a 402 response containing x402 accepts[] metadata.',
        'Verify X-PAYMENT or X-PAYMENT-TX against the PyrimidRouter PaymentRouted event.',
        'Publish product metadata in the Pyrimid catalog plus llms.txt, agents.txt, and MCP server card.',
        'Expose receipts or transaction hashes so buyer agents can audit payment and settlement.',
      ],
      risk_notes: [
        'Do not charge for outputs that cannot be produced deterministically or verified after payment.',
        'Avoid private-key, seed-phrase, login-cookie, CAPTCHA, or account-access workflows.',
        'Rate-limit expensive tools and define refund behavior for failed upstream dependencies.',
        'Keep preview output useful enough for buyer agents to decide whether payment is worthwhile.',
      ],
    },
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
      const target = query.url || query.repo || 'https://example.com/mcp';
      return mcpServerAudit(target);
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
