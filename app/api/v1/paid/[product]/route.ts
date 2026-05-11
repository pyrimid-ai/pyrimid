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

function asString(value: string | undefined, fallback: string) {
  return value && value.trim() ? value.trim() : fallback;
}

function words(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function leadScore(lead: { name: string; category: string; signals: string[] }, segment: string) {
  const haystack = words(`${lead.name} ${lead.category} ${lead.signals.join(' ')}`);
  const query = new Set(words(segment));
  let score = 48;

  if (haystack.includes('mcp')) score += 14;
  if (haystack.includes('x402')) score += 14;
  if (haystack.includes('api')) score += 8;
  if (haystack.includes('github')) score += 7;
  if (haystack.includes('paid') || haystack.includes('pricing')) score += 6;
  for (const token of query) {
    if (haystack.includes(token)) score += 5;
  }

  return clampScore(score);
}

function priority(score: number) {
  if (score >= 85) return 'high';
  if (score >= 70) return 'medium';
  return 'low';
}

function routeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'paid-tool';
}

function inferMcpCapabilities(target: string) {
  const text = target.toLowerCase();
  const capabilities = new Set<string>();
  if (text.includes('search') || text.includes('crawl')) capabilities.add('search');
  if (text.includes('repo') || text.includes('github')) capabilities.add('repo-analysis');
  if (text.includes('data') || text.includes('api')) capabilities.add('data-enrichment');
  if (text.includes('audit') || text.includes('security')) capabilities.add('security-audit');
  if (text.includes('mcp')) capabilities.add('tool-routing');
  if (!capabilities.size) {
    capabilities.add('search');
    capabilities.add('enrich');
    capabilities.add('analyze');
  }
  return Array.from(capabilities);
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
      const segment = asString(query.segment, 'mcp');
      const requestedLimit = Math.min(parseInt(query.limit || '8', 10) || 8, 25);
      const seedLeads = [
        {
          name: 'MCP servers with search, scrape, or data-heavy tools',
          category: 'mcp',
          target_url: 'https://github.com/search?q=mcp+server+search+api&type=repositories',
          signals: ['mcp', 'github', 'tool-schema', 'usage-based-compute'],
          why_now: 'These projects already expose callable tools; adding a paid variant is a small packaging change.',
        },
        {
          name: 'x402-compatible APIs listed in discovery catalogs',
          category: 'x402',
          target_url: 'https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources',
          signals: ['x402', 'api', 'price-metadata', 'payment-required'],
          why_now: 'They already understand payment-required flows and can add affiliate bps without changing product delivery.',
        },
        {
          name: 'AI API wrappers with per-call upstream cost',
          category: 'ai-api',
          target_url: 'https://github.com/search?q=AI+API+wrapper+pricing&type=repositories',
          signals: ['api', 'per-call-cost', 'pricing', 'developer-tool'],
          why_now: 'Per-call costs map cleanly to exact USDC pricing and transparent x402 challenge metadata.',
        },
        {
          name: 'Agent directories and registries',
          category: 'agent-discovery',
          target_url: 'https://github.com/search?q=agent+directory+mcp&type=repositories',
          signals: ['agent-discovery', 'directory', 'lead-gen', 'mcp'],
          why_now: 'Directories can resell richer search, enrichment, and trust scoring as paid tools.',
        },
        {
          name: 'Security scanners for MCP and agent tools',
          category: 'security',
          target_url: 'https://github.com/search?q=mcp+security+scanner&type=repositories',
          signals: ['security', 'audit', 'repo-analysis', 'paid-report'],
          why_now: 'Security output has obvious buyer value and can be priced above commodity data endpoints.',
        },
        {
          name: 'Trading signal and market-data endpoints',
          category: 'trading-data',
          target_url: 'https://github.com/search?q=trading+signals+api&type=repositories',
          signals: ['trading', 'api', 'data-feed', 'high-affiliate-fit'],
          why_now: 'Time-sensitive data supports repeat buying and higher affiliate incentives.',
        },
      ];
      const leads = seedLeads
        .map((lead) => {
          const fit_score = leadScore(lead, segment);
          const slug = routeSlug(lead.name);
          return {
            ...lead,
            fit_score,
            priority: priority(fit_score),
            recommended_product: `${slug}-snapshot`,
            suggested_price_usdc: fit_score >= 85 ? '$0.10-$0.25' : '$0.02-$0.10',
            suggested_affiliate_bps: fit_score >= 85 ? 4000 : 2500,
            outreach_angle: `${lead.name} can expose one paid endpoint first, then list it in Pyrimid with affiliate distribution enabled.`,
            catalog_metadata: {
              category: lead.category,
              tags: [...new Set([...lead.signals, 'base-usdc', 'pyrimid'])],
              method: 'GET',
              output_schema_hint: { type: 'object', properties: { result: { type: 'object' }, routed_by: { const: 'pyrimid' } } },
            },
          };
        })
        .sort((a, b) => b.fit_score - a.fit_score)
        .slice(0, requestedLimit);
      return {
        segment,
        generated_at: new Date().toISOString(),
        scoring_model: {
          high_priority: '85-100',
          medium_priority: '70-84',
          factors: ['mcp/x402 readiness', 'API surface', 'existing pricing intent', 'segment match', 'affiliate fit'],
        },
        leads,
        next_actions: [
          'Open the target URL and shortlist maintained projects with public endpoints or clear tool schemas.',
          'Pitch one paid endpoint with exact x402 pricing and 25-40% affiliate bps.',
          'Ask for a Pyrimid catalog entry containing product_id, endpoint, output_schema, price_usdc, and affiliate_bps.',
        ],
      };
    }
    case 'mcp-server-audit': {
      const url = asString(query.url, 'https://example.com/mcp');
      const capabilities = inferMcpCapabilities(url);
      const slug = routeSlug(url);
      const paidTools = capabilities.map((capability, index) => {
        const price = capability === 'security-audit' || capability === 'repo-analysis' ? '$0.10-$0.25' : '$0.01-$0.05';
        return {
          tool: capability,
          route: `/api/paid/${slug}/${capability}`,
          price_usdc: price,
          affiliate_bps: index === 0 ? 4000 : 2500,
          value_metric: capability === 'search' ? 'fresh result set' : capability === 'repo-analysis' ? 'repository analyzed' : 'completed tool call',
        };
      });
      return {
        audit: {
          url,
          monetization_score: clampScore(55 + capabilities.length * 8 + (url.includes('mcp') ? 12 : 0) + (url.includes('github') ? 8 : 0)),
          detected_capabilities: capabilities,
          recommended_paid_tools: paidTools,
          route_shape: {
            unpaid: 'Return HTTP 402 with accepts[] metadata, productId, vendorId, price, network, and payTo.',
            paid: 'Verify X-PAYMENT or X-PAYMENT-TX, then return JSON with result payload, payment_tx, buyer, and routed_by.',
          },
          catalog_metadata: paidTools.map((tool) => ({
            vendor_id: slug,
            product_id: tool.tool,
            description: `Paid ${tool.tool} tool for ${url}`,
            category: tool.tool.includes('security') ? 'security' : 'devtools',
            tags: ['mcp', tool.tool, 'x402', 'base-usdc', 'pyrimid'],
            endpoint: tool.route,
            method: 'POST',
            price_display: tool.price_usdc,
            affiliate_bps: tool.affiliate_bps,
            output_schema: { type: 'object', properties: { result: { type: 'object' }, routed_by: { const: 'pyrimid' } } },
          })),
          implementation_steps: [
            'Publish the paid route beside the free MCP tool so existing users keep working.',
            'Use exact Base USDC pricing in the 402 challenge and keep response schemas deterministic.',
            'Add the paid product to the Pyrimid catalog with affiliateBps high enough to motivate distributors.',
            'Expose the paid tool in server-card metadata, llms.txt, and agents.txt for machine discovery.',
          ],
          risk_notes: [
            'Do not charge for data that the tool cannot legally redistribute.',
            'Keep free health/discovery endpoints outside the payment gate so buyers can inspect before paying.',
            'Cap variable-cost tools with maxAmountRequired and return deterministic errors for unsupported inputs.',
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
