import { NextRequest, NextResponse } from 'next/server';
import { getSeedProduct, paymentRequirement } from '@/lib/seed-products';
import { verifyPyrimidPaymentTx } from '@/lib/payment-verification';

type GitHubRepo = {
  full_name: string;
  html_url: string;
  description: string | null;
  homepage: string | null;
  stargazers_count: number;
  open_issues_count: number;
  language: string | null;
  pushed_at: string;
  topics?: string[];
  archived?: boolean;
};

type GitHubSearchResponse = {
  items?: GitHubRepo[];
};

const GITHUB_HEADERS = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'pyrimid-seed-products',
};

const LEAD_QUERIES: Record<string, string> = {
  mcp: '"model context protocol" pushed:>2025-01-01',
  x402: 'x402 payment pushed:>2025-01-01',
  'agent-frameworks': 'agent framework plugin pushed:>2025-01-01',
  'api-tools': 'AI API wrapper pushed:>2025-01-01',
};

const FALLBACK_LEADS = [
  {
    name: 'MCP tool servers with paid data sources',
    url: 'https://github.com/search?q=%22mcp+server%22+tools&type=repositories',
    description: 'Servers that already expose agent-callable tools and can add optional paid tiers for costly data or compute.',
    signals: ['mcp', 'tool schema', 'agent-callable API'],
    score: 72,
  },
  {
    name: 'x402 examples and payment-enabled APIs',
    url: 'https://github.com/search?q=x402+payment&type=repositories',
    description: 'Projects already experimenting with HTTP 402 flows and likely to understand per-call Base USDC pricing.',
    signals: ['x402', 'HTTP 402', 'USDC settlement'],
    score: 68,
  },
  {
    name: 'Agent plugin marketplaces',
    url: 'https://github.com/search?q=agent+plugin+marketplace&type=repositories',
    description: 'Directories and plugin systems that can route buyer-agent traffic into Pyrimid catalog listings.',
    signals: ['agent marketplace', 'plugins', 'distribution'],
    score: 61,
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

function safeLimit(value: string | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(10, Math.trunc(parsed)));
}

function cleanToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json() as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchText(url: string, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.text()).slice(0, 18000);
  } finally {
    clearTimeout(timeout);
  }
}

function repoLeadScore(repo: GitHubRepo, segment: string) {
  const text = `${repo.full_name} ${repo.description || ''} ${(repo.topics || []).join(' ')}`.toLowerCase();
  const segmentHits = {
    mcp: ['mcp', 'model context protocol', 'tool'],
    x402: ['x402', '402', 'payment', 'usdc'],
    'agent-frameworks': ['agent', 'framework', 'plugin', 'marketplace'],
    'api-tools': ['api', 'data', 'wrapper', 'sdk'],
  }[segment] || ['agent', 'api', 'tool'];

  const signalScore = segmentHits.filter((signal) => text.includes(signal)).length * 14;
  const starScore = Math.min(24, Math.log10(repo.stargazers_count + 1) * 8);
  const issueScore = Math.min(8, repo.open_issues_count / 10);
  const recencyScore = repo.pushed_at > '2026-01-01' ? 16 : repo.pushed_at > '2025-01-01' ? 9 : 0;
  const archivedPenalty = repo.archived ? 30 : 0;

  return Math.max(1, Math.round(28 + signalScore + starScore + issueScore + recencyScore - archivedPenalty));
}

function leadReason(repo: GitHubRepo, segment: string) {
  const topics = repo.topics?.slice(0, 4).join(', ') || 'no topics';
  return `${repo.full_name} is a ${repo.language || 'multi-language'} project with ${repo.stargazers_count} stars, ${topics}, and recent activity on ${repo.pushed_at.slice(0, 10)}. That makes it a credible ${segment} outreach target for paid agent-callable tools.`;
}

function productSuggestion(segment: string) {
  if (segment === 'mcp') return 'Package the highest-cost MCP tool as a paid endpoint with a free metadata route and paid execution route.';
  if (segment === 'x402') return 'List an existing 402-gated API call in Pyrimid and add affiliateBps so buyer agents can distribute it.';
  if (segment === 'agent-frameworks') return 'Add a Pyrimid catalog adapter so framework plugins can become Base USDC paid products.';
  return 'Expose the most valuable API call as a per-call product priced by data, compute, or rate-limit cost.';
}

async function discoverVendorLeads(segment: string, requestedQuery: string | null, limit: number) {
  const normalizedSegment = LEAD_QUERIES[segment] ? segment : 'mcp';
  const query = requestedQuery?.trim() || LEAD_QUERIES[normalizedSegment];
  const url = new URL('https://api.github.com/search/repositories');
  url.searchParams.set('q', query);
  url.searchParams.set('sort', 'updated');
  url.searchParams.set('order', 'desc');
  url.searchParams.set('per_page', String(limit));

  try {
    const data = await fetchJson<GitHubSearchResponse>(url.toString(), { headers: GITHUB_HEADERS });
    const items = data.items || [];

    return {
      segment: normalizedSegment,
      query,
      source: 'github_search',
      leads: items.map((repo) => {
        const score = repoLeadScore(repo, normalizedSegment);
        return {
          name: repo.full_name,
          url: repo.html_url,
          homepage: repo.homepage,
          description: repo.description,
          language: repo.language,
          stars: repo.stargazers_count,
          open_issues: repo.open_issues_count,
          last_pushed_at: repo.pushed_at,
          topics: repo.topics || [],
          score,
          priority: score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low',
          signals: [
            ...(repo.topics || []).slice(0, 5),
            repo.language ? `${repo.language.toLowerCase()} implementation` : 'implementation language unknown',
            repo.pushed_at > '2026-01-01' ? 'active in 2026' : 'active since 2025',
          ],
          fit_reason: leadReason(repo, normalizedSegment),
          outreach_pitch: `Pyrimid can turn one ${normalizedSegment} capability into a Base USDC paid product without changing the free discovery surface.`,
          suggested_product: productSuggestion(normalizedSegment),
          pricing_hint: '$0.01-$0.25 per call, with affiliateBps for distribution agents',
        };
      }),
    };
  } catch (error) {
    return {
      segment: normalizedSegment,
      query,
      source: 'fallback_search_templates',
      live_discovery_error: error instanceof Error ? error.message : 'unknown_error',
      leads: FALLBACK_LEADS.slice(0, limit).map((lead) => ({
        ...lead,
        priority: lead.score >= 70 ? 'high' : 'medium',
        fit_reason: `${lead.name} matches the ${normalizedSegment} segment and should be validated with GitHub search before outreach.`,
        outreach_pitch: 'List one paid tool in Pyrimid, return 402 for paid execution, and let buyer agents route purchases through Base USDC.',
        suggested_product: productSuggestion(normalizedSegment),
        pricing_hint: '$0.01-$0.25 per call',
      })),
    };
  }
}

function parseGitHubRepo(input: string) {
  const shorthand = input.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (shorthand) return { owner: shorthand[1], repo: shorthand[2].replace(/\.git$/, '') };

  try {
    const url = new URL(input);
    if (!url.hostname.endsWith('github.com')) return null;
    const [owner, repo] = url.pathname.split('/').filter(Boolean);
    if (!owner || !repo) return null;
    return { owner, repo: repo.replace(/\.git$/, '') };
  } catch {
    return null;
  }
}

async function readGitHubRepo(owner: string, repo: string) {
  const repoInfo = await fetchJson<GitHubRepo>(`https://api.github.com/repos/${owner}/${repo}`, { headers: GITHUB_HEADERS });
  let readme = '';

  try {
    const readmeResponse = await fetchJson<{ content?: string; encoding?: string }>(
      `https://api.github.com/repos/${owner}/${repo}/readme`,
      { headers: GITHUB_HEADERS }
    );
    if (readmeResponse.content && readmeResponse.encoding === 'base64') {
      readme = Buffer.from(readmeResponse.content, 'base64').toString('utf8').slice(0, 18000);
    }
  } catch {
    readme = '';
  }

  return {
    target_type: 'github_repo',
    url: repoInfo.html_url,
    name: repoInfo.full_name,
    summary: repoInfo.description || 'No repository description supplied.',
    language: repoInfo.language,
    stars: repoInfo.stargazers_count,
    topics: repoInfo.topics || [],
    text: `${repoInfo.full_name}\n${repoInfo.description || ''}\n${(repoInfo.topics || []).join(' ')}\n${readme}`,
  };
}

async function inspectTarget(target: string) {
  const repo = parseGitHubRepo(target);
  if (repo) return readGitHubRepo(repo.owner, repo.repo);

  const text = await fetchText(target, { headers: { 'User-Agent': 'pyrimid-seed-products' } });
  return {
    target_type: 'url',
    url: target,
    name: target,
    summary: text.replace(/\s+/g, ' ').slice(0, 240),
    language: null,
    stars: null,
    topics: [],
    text,
  };
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function inferToolCandidates(text: string) {
  const lower = text.toLowerCase();
  const candidates = [
    {
      tool: 'search',
      trigger: ['search', 'query', 'retrieve', 'lookup'],
      rationale: 'Search and retrieval calls are high-frequency, measurable, and easy to price per request.',
      price_usdc: '0.01-0.05',
    },
    {
      tool: 'enrich',
      trigger: ['enrich', 'profile', 'metadata', 'classify'],
      rationale: 'Enrichment calls create differentiated data and can support a higher paid tier.',
      price_usdc: '0.05-0.15',
    },
    {
      tool: 'analyze',
      trigger: ['analyze', 'analysis', 'summarize', 'score'],
      rationale: 'Analysis tools usually spend model or compute budget, which maps cleanly to x402 charging.',
      price_usdc: '0.05-0.25',
    },
    {
      tool: 'export',
      trigger: ['export', 'download', 'csv', 'json', 'report'],
      rationale: 'Exports are natural paid actions because they deliver a reusable artifact.',
      price_usdc: '0.03-0.10',
    },
  ];

  const matched = candidates.filter((candidate) => includesAny(lower, candidate.trigger));
  return (matched.length ? matched : candidates.slice(0, 2)).map((candidate) => ({
    name: candidate.tool,
    paid_route: `/api/paid/${cleanToken(candidate.tool)}`,
    mcp_tool_name: `paid_${cleanToken(candidate.tool).replace(/-/g, '_')}`,
    price_usdc: candidate.price_usdc,
    rationale: candidate.rationale,
    output_schema: {
      type: 'object',
      required: ['result', 'payment_tx', 'routed_by'],
      properties: {
        result: { type: 'object' },
        payment_tx: { type: 'string' },
        routed_by: { const: 'pyrimid' },
      },
    },
  }));
}

function buildRiskNotes(text: string) {
  const lower = text.toLowerCase();
  return [
    !includesAny(lower, ['402', 'x402', 'payment']) ? 'No obvious HTTP 402/x402 payment flow is documented yet.' : null,
    !includesAny(lower, ['price', 'pricing', 'usdc', '$']) ? 'No explicit per-call pricing is visible; add prices to catalog metadata before launch.' : null,
    !includesAny(lower, ['rate limit', 'quota', 'limit']) ? 'Rate limits are unclear; define free discovery limits and paid execution limits.' : null,
    !includesAny(lower, ['privacy', 'license', 'terms']) ? 'Legal/privacy terms are not obvious from the inspected text; verify data redistribution rights.' : null,
  ].filter(Boolean);
}

function buildMcpAudit(target: Awaited<ReturnType<typeof inspectTarget>>) {
  const lower = target.text.toLowerCase();
  const toolCandidates = inferToolCandidates(target.text);
  const hasMcpSignals = includesAny(lower, ['mcp', 'model context protocol', 'tools/list', 'tool']);
  const hasPaymentSignals = includesAny(lower, ['x402', '402', 'usdc', 'payment']);
  const score = Math.min(100, 35 + (hasMcpSignals ? 25 : 0) + (hasPaymentSignals ? 20 : 0) + (toolCandidates.length * 7));

  return {
    target: {
      type: target.target_type,
      name: target.name,
      url: target.url,
      summary: target.summary,
      language: target.language,
      stars: target.stars,
      topics: target.topics,
    },
    monetization_score: score,
    readiness: score >= 75 ? 'ready_for_paid_tool_pilot' : score >= 55 ? 'needs_catalog_and_payment_work' : 'needs_mcp_or_tool_surface_validation',
    recommended_paid_tools: toolCandidates,
    x402_route_shape: {
      unpaid_request: 'Return HTTP 402 with accepts[] metadata, productId, vendorId, payTo, maxAmountRequired, and Base USDC asset details.',
      paid_retry: 'Verify X-PAYMENT or X-PAYMENT-TX, execute the MCP/API tool, then return JSON with payment_tx and routed_by=pyrimid.',
      example: `GET ${toolCandidates[0]?.paid_route || '/api/paid/tool'} -> 402 -> retry with X-PAYMENT-TX`,
    },
    catalog_metadata: {
      vendor_id: cleanToken(target.name).slice(0, 48) || 'mcp-vendor',
      product_id: `${cleanToken(target.name).slice(0, 36) || 'mcp'}-${toolCandidates[0]?.name || 'tool'}`,
      category: 'mcp-paid-tools',
      tags: ['mcp', 'x402', 'base-usdc', 'paid-tools'],
      method: 'GET',
      endpoint: toolCandidates[0]?.paid_route || '/api/paid/tool',
      affiliate_bps: 2500,
      network: 'base',
      asset: 'USDC',
    },
    pricing: {
      discovery: 'Keep server card, catalog, and tool metadata free.',
      execution: 'Charge only high-value execution calls; start between $0.01 and $0.25 depending on compute, model, and data costs.',
      affiliate: 'Offer 20-40% affiliateBps for agents that route qualified buyers.',
    },
    risk_notes: buildRiskNotes(target.text),
    implementation_steps: [
      'Publish or update the MCP server card with free metadata for discoverability.',
      'Add one paid execution route per high-value tool and return a standards-compatible 402 response before payment.',
      'Verify Base USDC payment proof server-side before executing paid work.',
      'Register catalog metadata in Pyrimid with product_id, endpoint, output_schema, price, and affiliate_bps.',
      'Log payment_tx, buyer, product_id, and routed_by so buyer agents can prove purchase completion.',
    ],
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
      const limit = safeLimit(query.limit || null, 5);
      const discovery = await discoverVendorLeads(segment, query.q || null, limit);
      return {
        vendor_lead_discovery: {
          ...discovery,
          scoring: {
            high: '80+ means active repo, clear segment match, and strong paid-tool potential.',
            medium: '60-79 means useful target with at least one validation step before outreach.',
            low: '<60 means keep as a long-tail candidate.',
          },
          outreach_sequence: [
            'Confirm the project exposes agent-callable tools or paid API cost drivers.',
            'Propose one low-risk paid endpoint with free metadata and paid execution.',
            'List the product in Pyrimid with Base USDC pricing and affiliateBps.',
            'Ask the vendor to run one non-self buyer-agent transaction as proof.',
          ],
        },
      };
    }
    case 'mcp-server-audit': {
      const url = query.repo || query.url || 'https://github.com/modelcontextprotocol/servers';
      let inspection;
      try {
        inspection = await inspectTarget(url);
      } catch (error) {
        inspection = {
          target_type: 'unreachable',
          url,
          name: url,
          summary: 'Target could not be fetched; audit is based on a generic MCP paid-tool pattern.',
          language: null,
          stars: null,
          topics: [],
          text: `mcp tools search analyze export ${error instanceof Error ? error.message : ''}`,
        };
      }
      return {
        audit: buildMcpAudit(inspection),
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
