export function buildVendorLeadDiscovery(segment = 'mcp') {
  const normalizedSegment = String(segment || 'mcp').toLowerCase();
  const segmentProfiles = {
    mcp: {
      buyerPain: 'MCP servers with useful tools often lack a simple per-call payment path for autonomous buyers.',
      githubTerms: ['mcp server', 'modelcontextprotocol server', 'mcp tools pricing'],
      categories: ['developer-tools', 'data-enrichment', 'agent-discovery'],
    },
    api: {
      buyerPain: 'AI API wrappers pay infra costs per call but often monetize only through manual subscriptions.',
      githubTerms: ['ai api wrapper', 'llm api tool', 'agent api endpoint'],
      categories: ['api-tools', 'developer-tools', 'automation'],
    },
    data: {
      buyerPain: 'Data products are naturally usage based and can be packaged as small paid agent calls.',
      githubTerms: ['market data api', 'scraper api', 'data enrichment api'],
      categories: ['growth-data', 'trading-data', 'enrichment'],
    },
  };
  const profile = segmentProfiles[normalizedSegment] || segmentProfiles.mcp;

  const leadBlueprints = [
    {
      target: 'Open-source MCP servers exposing search, scrape, or enrichment tools',
      score: 94,
      fitSignals: ['already tool-shaped', 'clear per-call value', 'developer audience', 'easy catalog metadata'],
      product: 'paid-tool-audit',
      price: '$0.05-$0.15',
    },
    {
      target: 'Hosted AI API wrappers with demo endpoints and rate limits',
      score: 88,
      fitSignals: ['usage-based cost', 'simple HTTP surface', 'agent buyers can retry with proof'],
      product: 'premium-api-call',
      price: '$0.10-$0.25',
    },
    {
      target: 'Data-heavy agent utilities such as lead finders, SEO audits, and market snapshots',
      score: 84,
      fitSignals: ['fresh data matters', 'output is JSON-friendly', 'affiliate distribution can drive volume'],
      product: 'data-snapshot',
      price: '$0.05-$0.50',
    },
    {
      target: 'Agent directories and marketplaces with vendor traffic',
      score: 77,
      fitSignals: ['distribution surface', 'vendor intent', 'natural affiliate loop'],
      product: 'listing-enrichment',
      price: '$0.05-$0.10',
    },
  ];

  return {
    segment: normalizedSegment,
    generated_at: new Date(0).toISOString(),
    scoring_model: {
      max_score: 100,
      factors: ['tool/API readiness', 'per-call value', 'agent buyer fit', 'x402 integration effort', 'affiliate upside'],
    },
    discovery_queries: {
      github: profile.githubTerms.map((term) => `${term} language:TypeScript OR language:Python`),
      mcp_directories: [
        'https://glama.ai/mcp/servers?query=' + encodeURIComponent(normalizedSegment),
        'https://github.com/topics/model-context-protocol',
        'https://smithery.ai/search?q=' + encodeURIComponent(normalizedSegment),
      ],
      x402_targets: [
        'site:github.com x402 payment required API',
        'site:github.com "402" "USDC" "Base"',
      ],
    },
    leads: leadBlueprints.map((lead, index) => ({
      rank: index + 1,
      segment: normalizedSegment,
      target: lead.target,
      score: lead.score,
      score_reason: `${profile.buyerPain} This target has ${lead.fitSignals.join(', ')}.`,
      github_query: `${profile.githubTerms[index % profile.githubTerms.length]} ${lead.product}`,
      fit_signals: lead.fitSignals,
      x402_opportunity: 'Add an unauthenticated HTTP 402 response with accepts[] metadata, then unlock JSON output after X-PAYMENT or X-PAYMENT-TX verification.',
      recommended_product: {
        product_id: lead.product,
        category: profile.categories[index % profile.categories.length],
        price_display: lead.price,
        affiliate_bps: index === 0 ? 4000 : 2500,
      },
      outreach: {
        subject: `Add Pyrimid x402 payments to your ${normalizedSegment} tool`,
        message: `Your ${lead.target.toLowerCase()} looks suitable for a paid agent-call product. Pyrimid can list it in an agent-readable catalog, return x402 payment requirements, and route Base USDC with affiliate splits.`,
      },
    })),
    next_actions: [
      'Run the GitHub queries and keep only repos with recent commits or hosted docs.',
      'Probe each candidate for an HTTP API, MCP server card, llms.txt, or agents.txt.',
      'Score integration effort before outreach; avoid targets with no public endpoint.',
      'Offer a minimal $0.05-$0.25 paid endpoint first to reduce buyer friction.',
    ],
  };
}

export function buildMcpServerAudit(url = 'https://example.com/mcp') {
  const normalizedUrl = String(url || 'https://example.com/mcp');
  const host = safeHost(normalizedUrl);

  return {
    url: normalizedUrl,
    summary: `Monetization audit for ${host}. Package the highest-value MCP tools as low-price paid calls and expose x402/Pyrimid metadata for buyer agents.`,
    recommended_paid_tools: [
      {
        name: 'premium_search',
        reason: 'Search/scrape calls have direct marginal cost and clear buyer value.',
        pricing: { price_display: '$0.05', price_usdc: 50000 },
        output_contract: { result: 'array', citations: 'array', routed_by: 'pyrimid' },
      },
      {
        name: 'deep_enrichment',
        reason: 'Enrichment combines multiple upstream calls and is easy to sell per request.',
        pricing: { price_display: '$0.10', price_usdc: 100000 },
        output_contract: { enrichment: 'object', confidence: 'number', routed_by: 'pyrimid' },
      },
      {
        name: 'export_report',
        reason: 'Report generation is a finished artifact that agents can buy for workflows.',
        pricing: { price_display: '$0.15', price_usdc: 150000 },
        output_contract: { report_url: 'string', summary: 'string', routed_by: 'pyrimid' },
      },
      {
        name: 'batch_analyze',
        reason: 'Batch operations create higher compute cost and justify a premium per call.',
        pricing: { price_display: '$0.25', price_usdc: 250000 },
        output_contract: { items: 'array', risk_notes: 'array', routed_by: 'pyrimid' },
      },
    ],
    route_shape: {
      unauthenticated_response: {
        status: 402,
        body_keys: ['error', 'message', 'accepts', 'docs', 'catalog'],
        accepts_required_fields: ['x402Version', 'scheme', 'network', 'asset', 'maxAmountRequired', 'payTo', 'resource', 'vendorId', 'productId', 'affiliateBps'],
      },
      paid_retry: {
        method: 'GET or POST',
        headers: ['X-PAYMENT', 'X-PAYMENT-TX'],
        success_body: ['product_id', 'vendor_id', 'payment_tx', 'routed_by', 'links'],
      },
    },
    catalog_metadata: {
      vendor_id: slugify(host),
      vendor_name: host,
      product_id: 'mcp-premium-search',
      description: `Paid MCP tool access for ${host} with x402/Base USDC settlement through Pyrimid.`,
      category: 'devtools',
      tags: ['mcp', 'x402', 'paid-tools', 'agent-commerce'],
      price_display: '$0.05',
      price_usdc: 50000,
      affiliate_bps: 2500,
      endpoint: `${normalizedUrl.replace(/\/$/, '')}/paid/premium_search`,
      method: 'GET',
      network: 'base',
      asset: 'USDC',
      output_schema: {
        type: 'object',
        properties: {
          result: { type: 'array' },
          routed_by: { const: 'pyrimid' },
        },
      },
    },
    risk_notes: [
      { severity: 'high', note: 'Prevent replay by storing consumed transaction hashes or x402 nonces.' },
      { severity: 'high', note: 'Verify Base USDC recipient, amount, chain, and resource before returning paid data.' },
      { severity: 'medium', note: 'Keep product_id stable so catalog entries and affiliate links do not break.' },
      { severity: 'medium', note: 'Return deterministic JSON schemas so buyer-agents can evaluate paid output.' },
    ],
    integration_checklist: [
      'Choose one tool with obvious per-call value.',
      'Add a 402 branch that returns accepts[] metadata before payment.',
      'Verify X-PAYMENT or X-PAYMENT-TX against Base USDC settlement.',
      'Publish Pyrimid-compatible catalog metadata.',
      'Set affiliateBps to motivate distribution agents.',
      'Add docs, llms.txt, or agents.txt links for crawler discovery.',
    ],
  };
}

function safeHost(value) {
  try {
    return new URL(value).host || 'example.com';
  } catch {
    return 'example.com';
  }
}

function slugify(value) {
  return String(value || 'vendor')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'vendor';
}
