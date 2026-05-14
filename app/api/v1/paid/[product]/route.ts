import { NextRequest, NextResponse } from 'next/server';
import { getSeedProduct, paymentRequirement } from '@/lib/seed-products';
import { verifyPyrimidPaymentTx } from '@/lib/payment-verification';
import { CONTRACTS } from '@/lib/contracts';

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
  segment: string;
  target: string;
  url: string;
  source: string;
  score: number;
  fit: 'high' | 'medium' | 'low';
  reason: string;
  pitch: string;
  evidence: string[];
  suggested_product_id: string;
  suggested_price_usdc: string;
  contact_path: string;
};

type FetchEvidence = {
  url: string;
  status: number | 'error';
  ok: boolean;
  content_type?: string | null;
  bytes?: number;
  error?: string;
  signals?: string[];
};

const DEFAULT_VENDOR_LEADS: VendorLead[] = [
  {
    segment: 'mcp',
    target: 'MCP servers with paid/data-heavy tools',
    url: 'https://github.com/modelcontextprotocol/servers',
    source: 'seed',
    score: 82,
    fit: 'high',
    reason: 'MCP servers already expose callable tools; paid search, enrichment, export, and analytics tools map cleanly to x402 per-call pricing.',
    pitch: 'Add a free preview tool plus a paid x402 endpoint, then list the product in Pyrimid so buyer agents can discover and purchase it.',
    evidence: ['tool interface exists', 'usage-based cost is easy to meter', 'agent buyers can consume JSON output'],
    suggested_product_id: 'mcp_paid_tool',
    suggested_price_usdc: '$0.05-$0.25',
    contact_path: 'Open a GitHub issue or PR with a paid-tool example and catalog metadata.',
  },
  {
    segment: 'agent-frameworks',
    target: 'Agent frameworks with marketplace/plugin systems',
    url: 'https://github.com/search?q=agent+framework+tools+marketplace&type=repositories&s=updated&o=desc',
    source: 'seed',
    score: 76,
    fit: 'high',
    reason: 'Framework maintainers can embed Pyrimid as a default resolver and route every paid tool lookup through affiliate attribution.',
    pitch: 'Offer a resolver plugin that turns framework tool discovery into paid x402 purchases with transparent Base USDC settlement.',
    evidence: ['framework distribution channel', 'repeat buyer-agent traffic', 'affiliate revenue share creates ongoing incentive'],
    suggested_product_id: 'agent_tool_resolver',
    suggested_price_usdc: '$0.02-$0.10',
    contact_path: 'Send a short integration PR or plugin proposal.',
  },
  {
    segment: 'api-tools',
    target: 'AI API services with per-call cost',
    url: 'https://github.com/search?q=AI+API+wrapper+usage+based&type=repositories&s=updated&o=desc',
    source: 'seed',
    score: 70,
    fit: 'medium',
    reason: 'APIs with paid upstream calls can protect margins by charging buyer agents per request through x402.',
    pitch: 'Wrap the most expensive endpoint with an x402 402 response and publish catalog metadata for agent discovery.',
    evidence: ['usage-based endpoint', 'clear unit economics', 'JSON response can be resold to agents'],
    suggested_product_id: 'paid_api_call',
    suggested_price_usdc: '$0.01-$0.50',
    contact_path: 'Contact docs/support or submit a sample integration issue.',
  },
];

function withTimeout(ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { controller, done: () => clearTimeout(timer) };
}

async function fetchJson(url: string, timeoutMs = 4500): Promise<{ data?: unknown; evidence: FetchEvidence }> {
  const { controller, done } = withTimeout(timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { accept: 'application/json, text/plain;q=0.9' },
      signal: controller.signal,
      next: { revalidate: 900 },
    });
    const text = await res.text();
    const contentType = res.headers.get('content-type');
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    return {
      data,
      evidence: {
        url,
        status: res.status,
        ok: res.ok,
        content_type: contentType,
        bytes: text.length,
        signals: extractSignals(text),
      },
    };
  } catch (err) {
    return {
      evidence: {
        url,
        status: 'error',
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
    };
  } finally {
    done();
  }
}

async function fetchText(url: string, timeoutMs = 4500): Promise<{ text: string; evidence: FetchEvidence }> {
  const { controller, done } = withTimeout(timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { accept: 'text/plain, application/json;q=0.9, text/html;q=0.8' },
      signal: controller.signal,
      next: { revalidate: 900 },
    });
    const text = await res.text();
    return {
      text: text.slice(0, 24000),
      evidence: {
        url,
        status: res.status,
        ok: res.ok,
        content_type: res.headers.get('content-type'),
        bytes: text.length,
        signals: extractSignals(text),
      },
    };
  } catch (err) {
    return {
      text: '',
      evidence: {
        url,
        status: 'error',
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
    };
  } finally {
    done();
  }
}

function extractSignals(text: string): string[] {
  const lower = text.toLowerCase();
  const signals = [
    ['mcp', 'mentions MCP'],
    ['modelcontextprotocol', 'mentions Model Context Protocol'],
    ['x402', 'mentions x402'],
    ['payment_required', 'has payment-required marker'],
    ['accepts', 'has x402 accepts-like metadata'],
    ['tool', 'mentions tools'],
    ['llms.txt', 'mentions llms.txt'],
    ['agents.txt', 'mentions agents.txt'],
    ['openapi', 'mentions OpenAPI'],
    ['api', 'mentions API'],
  ];
  return signals.filter(([needle]) => lower.includes(needle)).map(([, label]) => label);
}

function arrayFromUnknown(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  const obj = data as Record<string, unknown>;
  for (const key of ['resources', 'items', 'catalog', 'products', 'data', 'repositories']) {
    if (Array.isArray(obj[key])) return obj[key] as unknown[];
  }
  return [];
}

function textField(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function numberField(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function slug(input: string) {
  return input.toLowerCase().replace(/https?:\/\//, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'paid-tool';
}

function scoreLead(name: string, url: string, description: string, segment: string, signals: string[] = []) {
  const haystack = `${name} ${url} ${description} ${signals.join(' ')}`.toLowerCase();
  let score = 35;
  if (haystack.includes('mcp') || haystack.includes('modelcontextprotocol')) score += 25;
  if (haystack.includes('x402') || haystack.includes('payment')) score += 20;
  if (haystack.includes('api') || haystack.includes('tool')) score += 12;
  if (haystack.includes('search') || haystack.includes('data') || haystack.includes('enrich')) score += 8;
  if (segment && haystack.includes(segment.toLowerCase())) score += 5;
  return Math.min(score, 100);
}

function leadFit(score: number): VendorLead['fit'] {
  if (score >= 75) return 'high';
  if (score >= 55) return 'medium';
  return 'low';
}

function mapDiscoveryLead(item: unknown, segment: string, source: string): VendorLead | null {
  if (!item || typeof item !== 'object') return null;
  const obj = item as Record<string, unknown>;
  const accepts = Array.isArray(obj.accepts) ? (obj.accepts[0] as Record<string, unknown> | undefined) : undefined;
  const resource = textField(obj.resource) || textField(obj.url) || textField(obj.endpoint) || textField(accepts?.resource);
  if (!resource) return null;
  const description = textField(obj.description) || textField(obj.name) || textField(accepts?.description) || 'x402-discoverable paid API resource';
  const name = textField(obj.name) || textField(obj.title) || new URL(resource, 'https://example.com').hostname;
  const signals = extractSignals(`${name} ${description} ${resource}`);
  const score = scoreLead(name, resource, description, segment, signals);
  return {
    segment,
    target: name,
    url: resource,
    source,
    score,
    fit: leadFit(score),
    reason: 'Already appears in an x402 discovery surface, so it has payment-aware metadata and can be routed into Pyrimid catalog discovery.',
    pitch: 'List this resource in Pyrimid with affiliateBps, output_schema, and a short buyer-agent description so agents can discover it before purchase.',
    evidence: [...new Set(['x402 discovery resource', ...signals])],
    suggested_product_id: slug(name),
    suggested_price_usdc: textField(obj.price) || textField(accepts?.maxAmountRequired) || '$0.01-$0.25',
    contact_path: 'Use the resource host documentation or repository to propose Pyrimid catalog metadata.',
  };
}

function mapGitHubRepoLead(item: unknown, segment: string): VendorLead | null {
  if (!item || typeof item !== 'object') return null;
  const obj = item as Record<string, unknown>;
  const url = textField(obj.html_url);
  const name = textField(obj.full_name) || textField(obj.name);
  if (!url || !name) return null;
  const description = textField(obj.description, 'No description provided');
  const signals = extractSignals(`${name} ${description} ${(obj.topics as string[] | undefined)?.join(' ') || ''}`);
  const score = Math.min(scoreLead(name, url, description, segment, signals) + Math.min(Math.floor(numberField(obj.stargazers_count) / 100), 10), 100);
  return {
    segment,
    target: name,
    url,
    source: 'github-search',
    score,
    fit: leadFit(score),
    reason: 'Recently discoverable GitHub project with agent/MCP/API signals; maintainers can add one paid endpoint or list an existing paid API.',
    pitch: 'Open an issue or PR with a free preview route, paid route, x402 402 body, and Pyrimid catalog metadata.',
    evidence: [
      `stars=${numberField(obj.stargazers_count)}`,
      `updated=${textField(obj.updated_at)}`,
      ...signals,
    ],
    suggested_product_id: slug(name),
    suggested_price_usdc: '$0.02-$0.25',
    contact_path: `${url}/issues/new`,
  };
}

async function vendorLeadDiscovery(segment: string) {
  const discoveryUrls = [
    'https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources',
    'https://x402.org/facilitator/discovery/resources',
  ];
  const githubQueries = [
    `https://api.github.com/search/repositories?q=${encodeURIComponent('topic:mcp-server OR modelcontextprotocol stars:>5')}&sort=updated&order=desc&per_page=8`,
    `https://api.github.com/search/repositories?q=${encodeURIComponent('x402 api payment stars:>2')}&sort=updated&order=desc&per_page=8`,
  ];

  const [discoveryResults, githubResults] = await Promise.all([
    Promise.all(discoveryUrls.map((url) => fetchJson(url))),
    Promise.all(githubQueries.map((url) => fetchJson(url))),
  ]);

  const discoveryLeads = discoveryResults.flatMap((result) =>
    arrayFromUnknown(result.data)
      .map((item) => mapDiscoveryLead(item, segment, result.evidence.url))
      .filter((lead): lead is VendorLead => Boolean(lead))
  );
  const githubLeads = githubResults.flatMap((result) =>
    arrayFromUnknown(result.data)
      .map((item) => mapGitHubRepoLead(item, segment))
      .filter((lead): lead is VendorLead => Boolean(lead))
  );
  const seen = new Set<string>();
  const liveLeads = [...discoveryLeads, ...githubLeads]
    .filter((lead) => {
      const key = lead.url.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);

  const leads = liveLeads.length >= 4 ? liveLeads : [...liveLeads, ...DEFAULT_VENDOR_LEADS].slice(0, 12);
  return {
    segment,
    generated_at: new Date().toISOString(),
    sources: [...discoveryResults, ...githubResults].map((result) => result.evidence),
    scoring_model: {
      range: '0-100',
      weights: ['MCP/tool/API markers', 'x402/payment markers', 'usage-based data/search/enrichment fit', 'recency and public repo traction'],
      minimum_good_fit: 55,
    },
    leads,
    outreach_sequence: [
      'Confirm the project exposes a tool, API, dataset, search, enrichment, or analytics result with usage-based value.',
      'Propose one free preview route and one paid x402 route priced below the value of a manual lookup.',
      'Attach Pyrimid catalog metadata: vendor_id, product_id, endpoint, price_usdc, affiliate_bps, output_schema, tags.',
      'Ask maintainers to publish llms.txt or agents.txt so buyer agents can discover the paid product.',
    ],
    catalog_metadata_template: {
      vendor_id: 'vendor-slug',
      product_id: 'paid-tool-slug',
      endpoint: 'https://vendor.example/api/paid/tool',
      method: 'GET',
      network: 'base',
      asset: 'USDC',
      affiliate_bps: 2500,
      output_schema: { type: 'object', required: ['result'], properties: { result: { type: 'object' } } },
    },
  };
}

function relatedUrls(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    const origin = url.origin;
    const urls = [rawUrl];
    for (const path of ['/.well-known/mcp.json', '/mcp', '/llms.txt', '/agents.txt', '/openapi.json']) {
      const next = `${origin}${path}`;
      if (!urls.includes(next)) urls.push(next);
    }
    return urls.slice(0, 6);
  } catch {
    return [rawUrl];
  }
}

function githubApiUrls(rawUrl: string) {
  const match = rawUrl.match(/^https:\/\/github\.com\/([^/]+)\/([^/#?]+)/);
  if (!match) return [];
  const [, owner, repo] = match;
  const cleanRepo = repo.replace(/\.git$/, '');
  return [
    `https://api.github.com/repos/${owner}/${cleanRepo}`,
    `https://raw.githubusercontent.com/${owner}/${cleanRepo}/HEAD/README.md`,
    `https://raw.githubusercontent.com/${owner}/${cleanRepo}/HEAD/package.json`,
    `https://raw.githubusercontent.com/${owner}/${cleanRepo}/HEAD/server.json`,
  ];
}

async function inspectMcpTarget(url: string) {
  const urls = [...relatedUrls(url), ...githubApiUrls(url)].slice(0, 10);
  const results = await Promise.all(urls.map((candidate) => fetchText(candidate)));
  const corpus = results.map((result) => result.text).join('\n').toLowerCase();
  const tools = [...new Set((corpus.match(/"name"\s*:\s*"([^"]+)"/g) || []).slice(0, 12).map((match) => match.split('"')[3]).filter(Boolean))];
  const hasMcp = corpus.includes('mcp') || corpus.includes('modelcontextprotocol') || corpus.includes('tools/list');
  const hasTools = corpus.includes('tools') || corpus.includes('tool') || tools.length > 0;
  const hasPayment = corpus.includes('x402') || corpus.includes('payment_required') || corpus.includes('usdc') || corpus.includes('402');
  const hasDiscovery = corpus.includes('llms.txt') || corpus.includes('agents.txt') || corpus.includes('server.json') || corpus.includes('mcp.json');

  return {
    evidence: results.map((result) => result.evidence),
    detected: {
      mcp_markers: hasMcp,
      tools_schema: hasTools,
      payment_markers: hasPayment,
      discovery_files: hasDiscovery,
      candidate_tools: tools.slice(0, 8),
    },
    corpus_signals: extractSignals(corpus),
  };
}

async function mcpServerAudit(url: string) {
  const inspection = await inspectMcpTarget(url);
  const readiness =
    (inspection.detected.mcp_markers ? 30 : 0) +
    (inspection.detected.tools_schema ? 25 : 0) +
    (inspection.detected.discovery_files ? 15 : 0) +
    (inspection.detected.payment_markers ? 20 : 0);
  const monetizationFit = Math.min(readiness + 15, 100);
  const recommendedTools = inspection.detected.candidate_tools.length
    ? inspection.detected.candidate_tools.slice(0, 4)
    : ['search', 'enrich', 'export', 'analyze'];

  return {
    audit: {
      url,
      inspected_at: new Date().toISOString(),
      detected: inspection.detected,
      score: {
        monetization_fit: monetizationFit,
        integration_readiness: readiness,
        interpretation:
          readiness >= 70
            ? 'Ready for a paid-tool wrapper and Pyrimid catalog listing.'
            : readiness >= 40
              ? 'Good candidate, but should publish clearer tool/payment discovery metadata.'
              : 'Needs a public MCP/tool schema before x402 monetization will be easy for buyer agents.',
      },
      recommended_paid_tools: recommendedTools.map((tool, index) => ({
        tool,
        free_preview: `preview_${tool}`,
        paid_tool: `buy_${tool}`,
        route_shape: `GET /api/paid/${slug(tool)}`,
        pricing_usdc: index === 0 ? '$0.05' : '$0.01-$0.10',
        why: index === 0 ? 'Best first paid tool because buyer agents can evaluate a free preview before purchase.' : 'Package as a low-friction paid add-on once the first route is live.',
      })),
      x402_route_shape: {
        free_preview: 'GET /api/preview/{tool} returns schema, sample rows, price, and payment requirements without charging.',
        paid_route: 'GET /api/paid/{tool} returns HTTP 402 until X-PAYMENT or X-PAYMENT-TX is supplied.',
        response_402: {
          error: 'payment_required',
          accepts: [{
            x402Version: 2,
            scheme: 'exact',
            network: 'base',
            asset: 'USDC',
            maxAmountRequired: '50000',
            payTo: CONTRACTS.ROUTER,
          }],
        },
        success_headers: ['X-Pyrimid-Vendor', 'X-Pyrimid-Product', 'Cache-Control: no-store'],
      },
      pyrimid_catalog_metadata: {
        vendor_id: slug(url.split('/')[2] || 'mcp-vendor'),
        product_id: slug(recommendedTools[0] || 'paid-tool'),
        description: `Paid MCP tool for ${url}`,
        category: 'mcp-tools',
        tags: ['mcp', 'x402', 'paid-tools', 'base-usdc'],
        price_usdc: 50000,
        affiliate_bps: 2500,
        endpoint: `${url.replace(/\/$/, '')}/api/paid/${slug(recommendedTools[0] || 'paid-tool')}`,
        output_schema: { type: 'object', required: ['result'], properties: { result: { type: 'object' }, routed_by: { const: 'pyrimid' } } },
      },
      implementation_plan: [
        'Publish a free preview tool so buyer agents can inspect output shape before paying.',
        'Add the paid route with a spec-compliant x402 accepts[] challenge and Base USDC amount.',
        'Verify X-PAYMENT or X-PAYMENT-TX before running the expensive operation.',
        'List the product in Pyrimid catalog with affiliate_bps and output_schema.',
        'Expose llms.txt, agents.txt, or server.json with links to the paid tool and catalog product.',
      ],
      risk_notes: [
        inspection.detected.payment_markers ? 'Existing payment markers found; check for duplicate or incompatible payment middleware.' : 'No payment markers found; add x402 handling before charging.',
        inspection.detected.discovery_files ? 'Discovery metadata exists; update it with paid route and catalog links.' : 'Discovery metadata not obvious; publish llms.txt or agents.txt for buyer-agent discovery.',
        'Keep paid results deterministic and JSON-shaped so downstream agents can evaluate value and route repeat purchases.',
      ],
      evidence: inspection.evidence,
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
      return vendorLeadDiscovery(segment);
    }
    case 'mcp-server-audit': {
      const url = query.url || 'https://example.com/mcp';
      return mcpServerAudit(url);
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
