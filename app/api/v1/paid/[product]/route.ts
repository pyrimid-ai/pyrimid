import { NextRequest, NextResponse } from 'next/server';
import { getSeedProduct, paymentRequirement } from '@/lib/seed-products';
import { verifyPyrimidPaymentTx } from '@/lib/payment-verification';

type TextInspection = {
  ok: boolean;
  status?: number;
  contentType?: string;
  finalUrl: string;
  bytesSampled: number;
  text: string;
  error?: string;
};

const PAID_TOOL_LIBRARY = [
  {
    id: 'semantic-search',
    triggers: ['search', 'query', 'retrieval', 'rag', 'index'],
    price: '$0.03-$0.08',
    route: 'GET /api/paid/search?q={query}',
    valueMeter: 'per successful query with cited results',
    outputSchema: { results: 'array', citations: 'array', routed_by: 'pyrimid' },
  },
  {
    id: 'record-enrichment',
    triggers: ['enrich', 'profile', 'metadata', 'lookup', 'resolve'],
    price: '$0.05-$0.15',
    route: 'GET /api/paid/enrich?id={id}',
    valueMeter: 'per enriched record',
    outputSchema: { entity: 'object', sources: 'array', confidence: 'number' },
  },
  {
    id: 'structured-export',
    triggers: ['export', 'csv', 'json', 'download', 'dataset'],
    price: '$0.10-$0.25',
    route: 'POST /api/paid/export',
    valueMeter: 'per generated export file or signed URL',
    outputSchema: { file_url: 'string', rows: 'number', expires_at: 'string' },
  },
  {
    id: 'analysis-report',
    triggers: ['analyze', 'audit', 'score', 'report', 'recommend'],
    price: '$0.10-$0.50',
    route: 'POST /api/paid/analyze',
    valueMeter: 'per completed analysis report',
    outputSchema: { score: 'number', findings: 'array', recommendations: 'array' },
  },
  {
    id: 'monitoring-alert',
    triggers: ['monitor', 'watch', 'alert', 'webhook', 'notify'],
    price: '$0.25-$1.00',
    route: 'POST /api/paid/monitor',
    valueMeter: 'per active monitor or alert bundle',
    outputSchema: { monitor_id: 'string', cadence: 'string', webhook: 'string' },
  },
];

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

function normalizeTargetUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    return parsed;
  } catch {
    return null;
  }
}

async function inspectTextUrl(rawUrl: string): Promise<TextInspection> {
  const parsed = normalizeTargetUrl(rawUrl);
  if (!parsed) {
    return {
      ok: false,
      finalUrl: rawUrl,
      bytesSampled: 0,
      text: '',
      error: 'invalid_url',
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(parsed.toString(), {
      headers: {
        Accept: 'application/json, text/markdown, text/plain, application/yaml, */*',
        'User-Agent': 'Pyrimid-MCP-Audit/1.0',
      },
      signal: controller.signal,
      cache: 'no-store',
    });
    const text = (await response.text()).slice(0, 12000);
    return {
      ok: response.ok,
      status: response.status,
      contentType: response.headers.get('content-type') || undefined,
      finalUrl: response.url || parsed.toString(),
      bytesSampled: text.length,
      text,
    };
  } catch (error) {
    return {
      ok: false,
      finalUrl: parsed.toString(),
      bytesSampled: 0,
      text: '',
      error: error instanceof Error ? error.name : 'fetch_failed',
    };
  } finally {
    clearTimeout(timeout);
  }
}

function hasAny(text: string, terms: string[]) {
  const lower = text.toLowerCase();
  return terms.some((term) => lower.includes(term));
}

function scoreReadiness(text: string, inspection: TextInspection) {
  const discoverySignals = [
    hasAny(text, ['tools/list', 'inputschema', 'mcp server', 'server.json']),
    hasAny(text, ['llms.txt', 'agents.txt', '.well-known', 'agent.json']),
    hasAny(text, ['pricing', 'price', 'paid', 'x402', '402 payment']),
    hasAny(text, ['output_schema', 'schema', 'json', 'typescript']),
  ].filter(Boolean).length;

  return {
    fetchable: inspection.ok,
    discovery_readiness: Math.min(100, 25 + discoverySignals * 18 + (inspection.ok ? 10 : 0)),
    payment_readiness: hasAny(text, ['x402', 'usdc', '402', 'payment-required', 'payment required']) ? 75 : 30,
    productization_score: hasAny(text, ['tool', 'api', 'endpoint', 'schema']) ? 70 : 45,
  };
}

function buildPaidToolCandidates(text: string) {
  const matches = PAID_TOOL_LIBRARY.filter((candidate) => hasAny(text, candidate.triggers));
  const selected = matches.length ? matches : PAID_TOOL_LIBRARY.slice(0, 3);

  return selected.slice(0, 4).map((candidate, index) => ({
    priority: index + 1,
    tool_id: candidate.id,
    recommended_price: candidate.price,
    route_shape: candidate.route,
    value_meter: candidate.valueMeter,
    output_schema: candidate.outputSchema,
    why: matches.includes(candidate)
      ? `Matched target signals: ${candidate.triggers.filter((trigger) => text.toLowerCase().includes(trigger)).join(', ')}.`
      : 'Default monetizable MCP pattern when the target exposes generic tools but no pricing surface yet.',
  }));
}

function buildMcpAudit(query: Record<string, string>, inspection: TextInspection) {
  const url = query.url || 'https://example.com/mcp';
  const parsed = normalizeTargetUrl(url);
  const text = `${url}\n${inspection.text}`.toLowerCase();
  const targetHost = parsed?.host || 'unknown-host';
  const path = parsed?.pathname || '';
  const readiness = scoreReadiness(text, inspection);
  const paidTools = buildPaidToolCandidates(text);
  const missingDiscovery = !hasAny(text, ['llms.txt', 'agents.txt', '.well-known', 'agent.json', 'server.json']);
  const missingPayment = !hasAny(text, ['x402', 'usdc', '402', 'payment required', 'payment-required']);
  const missingSchema = !hasAny(text, ['inputschema', 'output_schema', 'json schema', 'tools/list']);

  return {
    audit: {
      url,
      target: {
        host: targetHost,
        path,
        type: path.includes('mcp') ? 'mcp-endpoint' : 'agent-or-api-service',
        fetch_status: inspection.status || null,
        content_type: inspection.contentType || null,
        bytes_sampled: inspection.bytesSampled,
        fetch_error: inspection.error || null,
      },
      readiness,
      recommended_paid_tools: paidTools,
      x402_route_shape: {
        unpaid_response: {
          status: 402,
          header: 'X-PAYMENT-REQUIRED',
          accepts_fields: ['x402Version', 'scheme', 'network', 'asset', 'maxAmountRequired', 'payTo', 'resource'],
        },
        paid_retry_headers: ['X-PAYMENT', 'X-PAYMENT-TX'],
        settlement_network: 'Base',
        settlement_asset: 'USDC',
      },
      pyrimid_catalog_metadata: {
        vendor_id: targetHost.replace(/[^a-z0-9-]/gi, '-').toLowerCase().slice(0, 32) || 'mcp-vendor',
        product_id: paidTools[0]?.tool_id || 'paid-mcp-tool',
        endpoint: parsed?.toString() || url,
        category: 'devtools',
        tags: ['mcp', 'x402', 'paid-tools', 'base-usdc'],
        affiliate_bps: 2000,
        output_schema: paidTools[0]?.output_schema || { result: 'object', routed_by: 'pyrimid' },
      },
      risk_notes: [
        ...(missingDiscovery ? ['No obvious llms.txt/agents.txt/.well-known discovery surface found in the sampled content.'] : []),
        ...(missingPayment ? ['No obvious x402/USDC payment language found; add a clear 402 preflight before launch.'] : []),
        ...(missingSchema ? ['No obvious MCP input/output schema found; publish schemas so buyer agents can decide before paying.'] : []),
        ...(inspection.ok ? [] : ['Target was not fetchable during audit; recommendations are based on URL and generic MCP patterns.']),
      ],
      launch_checklist: [
        'Choose one high-value tool and price it before gating the whole server.',
        'Return HTTP 402 with X-PAYMENT-REQUIRED before executing paid work.',
        'Retry paid requests only after verifying X-PAYMENT or X-PAYMENT-TX on Base.',
        'List the product in Pyrimid catalog with endpoint, schema, price, and affiliateBps.',
        'Publish llms.txt or agents.txt with free discovery routes and paid route examples.',
      ],
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
      const inspection = await inspectTextUrl(url);
      return buildMcpAudit(query, inspection);
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
