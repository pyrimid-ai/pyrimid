import { CONTRACTS } from '@/lib/contracts';

export type SeedProduct = {
  vendor_id: string;
  vendor_name: string;
  vendor_erc8004: boolean;
  product_id: string;
  description: string;
  category: string;
  tags: string[];
  price_usdc: number;
  price_display: string;
  affiliate_bps: number;
  endpoint: string;
  method: 'GET' | 'POST';
  output_schema: object;
  monthly_volume: number;
  monthly_buyers: number;
  network: string;
  asset: string;
  source: 'pyrimid-seed';
  sdk_integrated: boolean;
  indexed_at: string;
};

export const SEED_PRODUCT_BASE = 'https://pyrimid.ai/api/v1/paid';

export const SEED_PRODUCTS: Omit<SeedProduct, 'indexed_at'>[] = [
  {
    vendor_id: 'pragma-trading',
    vendor_name: 'pragma.trading',
    vendor_erc8004: false,
    product_id: 'pragma-signal-snapshot',
    description: 'Paid BTC derivatives signal snapshot endpoint. Seed x402 product for buyer-agent testing and affiliate routing.',
    category: 'trading-data',
    tags: ['btc', 'perps', 'signals', 'x402', 'base', 'agent-api'],
    price_usdc: 250000,
    price_display: '$0.25',
    affiliate_bps: 5000,
    endpoint: `${SEED_PRODUCT_BASE}/signals`,
    method: 'GET',
    output_schema: { type: 'object', properties: { signal: { type: 'object' }, routed_by: { const: 'pyrimid' } } },
    monthly_volume: 0,
    monthly_buyers: 0,
    network: 'base',
    asset: 'USDC',
    source: 'pyrimid-seed',
    sdk_integrated: true,
  },
  {
    vendor_id: 'agentzone',
    vendor_name: 'AgentZone',
    vendor_erc8004: true,
    product_id: 'agentzone-trust-search',
    description: 'Paid trusted-agent search over AgentZone identity, reputation, and x402 discovery data.',
    category: 'agent-discovery',
    tags: ['agentzone', 'agent-search', 'erc8004', 'reputation', 'x402', 'base'],
    price_usdc: 50000,
    price_display: '$0.05',
    affiliate_bps: 2500,
    endpoint: `${SEED_PRODUCT_BASE}/agentzone-search?q=agent-commerce`,
    method: 'GET',
    output_schema: { type: 'object', properties: { result: { type: 'object' }, routed_by: { const: 'pyrimid' } } },
    monthly_volume: 0,
    monthly_buyers: 0,
    network: 'base',
    asset: 'USDC',
    source: 'pyrimid-seed',
    sdk_integrated: true,
  },
  {
    vendor_id: 'mya-launchpad',
    vendor_name: 'MYA Launchpad',
    vendor_erc8004: false,
    product_id: 'mya-agent-enrichment',
    description: 'Paid agent listing enrichment: category, monetization angle, agent-readable summary, and suggested paid-tool CTA.',
    category: 'agent-discovery',
    tags: ['mya', 'agent-directory', 'enrichment', 'monetization', 'x402', 'mcp'],
    price_usdc: 100000,
    price_display: '$0.10',
    affiliate_bps: 3000,
    endpoint: `${SEED_PRODUCT_BASE}/mya-agent-enrichment?agent=demo`,
    method: 'GET',
    output_schema: { type: 'object', properties: { enrichment: { type: 'object' }, routed_by: { const: 'pyrimid' } } },
    monthly_volume: 0,
    monthly_buyers: 0,
    network: 'base',
    asset: 'USDC',
    source: 'pyrimid-seed',
    sdk_integrated: true,
  },
  {
    vendor_id: 'mya-launchpad',
    vendor_name: 'MYA Launchpad',
    vendor_erc8004: false,
    product_id: 'mya-category-scout',
    description: 'Paid category scout for buyer agents: discover monetizable agents and vendors in a requested MYA category.',
    category: 'agent-discovery',
    tags: ['mya', 'category-search', 'agent-scouting', 'buyer-agent', 'x402'],
    price_usdc: 50000,
    price_display: '$0.05',
    affiliate_bps: 3000,
    endpoint: `${SEED_PRODUCT_BASE}/mya-category-scout?category=developer-tools`,
    method: 'GET',
    output_schema: { type: 'object', properties: { agents: { type: 'array' }, routed_by: { const: 'pyrimid' } } },
    monthly_volume: 0,
    monthly_buyers: 0,
    network: 'base',
    asset: 'USDC',
    source: 'pyrimid-seed',
    sdk_integrated: true,
  },
  {
    vendor_id: 'pyrimid-growth',
    vendor_name: 'Pyrimid Growth',
    vendor_erc8004: false,
    product_id: 'vendor-lead-discovery',
    description: 'Paid vendor lead discovery for agents: returns high-fit AI agent/API vendors to contact for x402 monetization.',
    category: 'growth-data',
    tags: ['vendor-discovery', 'lead-gen', 'ai-api', 'agent-frameworks', 'x402'],
    price_usdc: 250000,
    price_display: '$0.25',
    affiliate_bps: 4000,
    endpoint: `${SEED_PRODUCT_BASE}/vendor-lead-discovery?segment=mcp&limit=5`,
    method: 'GET',
    output_schema: {
      type: 'object',
      required: ['vendor_lead_discovery', 'routed_by', 'payment_tx'],
      properties: {
        vendor_lead_discovery: {
          type: 'object',
          required: ['segment', 'query', 'source', 'leads', 'scoring', 'outreach_sequence'],
          properties: {
            segment: { type: 'string', enum: ['mcp', 'x402', 'agent-frameworks', 'api-tools'] },
            query: { type: 'string' },
            source: { type: 'string', description: 'github_search when live search succeeds, otherwise fallback_search_templates' },
            leads: {
              type: 'array',
              items: {
                type: 'object',
                required: ['name', 'url', 'score', 'priority', 'fit_reason', 'outreach_pitch', 'suggested_product'],
                properties: {
                  name: { type: 'string' },
                  url: { type: 'string' },
                  homepage: { type: ['string', 'null'] },
                  description: { type: ['string', 'null'] },
                  language: { type: ['string', 'null'] },
                  stars: { type: 'number' },
                  open_issues: { type: 'number' },
                  last_pushed_at: { type: 'string' },
                  topics: { type: 'array', items: { type: 'string' } },
                  score: { type: 'number' },
                  priority: { type: 'string', enum: ['high', 'medium', 'low'] },
                  signals: { type: 'array', items: { type: 'string' } },
                  fit_reason: { type: 'string' },
                  outreach_pitch: { type: 'string' },
                  suggested_product: { type: 'string' },
                  pricing_hint: { type: 'string' },
                },
              },
            },
            scoring: { type: 'object' },
            outreach_sequence: { type: 'array', items: { type: 'string' } },
          },
        },
        routed_by: { const: 'pyrimid' },
        payment_tx: { type: 'string' },
      },
    },
    monthly_volume: 0,
    monthly_buyers: 0,
    network: 'base',
    asset: 'USDC',
    source: 'pyrimid-seed',
    sdk_integrated: true,
  },
  {
    vendor_id: 'pyrimid-growth',
    vendor_name: 'Pyrimid Growth',
    vendor_erc8004: false,
    product_id: 'mcp-server-audit',
    description: 'Paid MCP monetization audit: tells an MCP server how to add paid tools, x402 pricing, and affiliate routing.',
    category: 'devtools',
    tags: ['mcp', 'audit', 'monetization', 'paid-tools', 'x402', 'developer-tools'],
    price_usdc: 100000,
    price_display: '$0.10',
    affiliate_bps: 4000,
    endpoint: `${SEED_PRODUCT_BASE}/mcp-server-audit?repo=modelcontextprotocol/servers`,
    method: 'GET',
    output_schema: {
      type: 'object',
      required: ['audit', 'routed_by', 'payment_tx'],
      properties: {
        audit: {
          type: 'object',
          required: [
            'target',
            'monetization_score',
            'readiness',
            'recommended_paid_tools',
            'x402_route_shape',
            'catalog_metadata',
            'pricing',
            'risk_notes',
            'implementation_steps',
          ],
          properties: {
            target: { type: 'object' },
            monetization_score: { type: 'number' },
            readiness: {
              type: 'string',
              enum: [
                'ready_for_paid_tool_pilot',
                'needs_catalog_and_payment_work',
                'needs_mcp_or_tool_surface_validation',
              ],
            },
            recommended_paid_tools: {
              type: 'array',
              items: {
                type: 'object',
                required: ['name', 'paid_route', 'mcp_tool_name', 'price_usdc', 'rationale', 'output_schema'],
                properties: {
                  name: { type: 'string' },
                  paid_route: { type: 'string' },
                  mcp_tool_name: { type: 'string' },
                  price_usdc: { type: 'string' },
                  rationale: { type: 'string' },
                  output_schema: { type: 'object' },
                },
              },
            },
            x402_route_shape: { type: 'object' },
            catalog_metadata: { type: 'object' },
            pricing: { type: 'object' },
            risk_notes: { type: 'array', items: { type: 'string' } },
            implementation_steps: { type: 'array', items: { type: 'string' } },
          },
        },
        routed_by: { const: 'pyrimid' },
        payment_tx: { type: 'string' },
      },
    },
    monthly_volume: 0,
    monthly_buyers: 0,
    network: 'base',
    asset: 'USDC',
    source: 'pyrimid-seed',
    sdk_integrated: true,
  },
  {
    vendor_id: 'pyrimid-growth',
    vendor_name: 'Pyrimid Growth',
    vendor_erc8004: false,
    product_id: 'x402-integration-plan',
    description: 'Paid x402 integration plan for vendors: pricing, route shape, payment headers, and Pyrimid catalog metadata.',
    category: 'devtools',
    tags: ['x402', 'integration', 'sdk', 'vendor-onboarding', 'base-usdc', 'payments'],
    price_usdc: 100000,
    price_display: '$0.10',
    affiliate_bps: 4000,
    endpoint: `${SEED_PRODUCT_BASE}/x402-integration-plan?service=agent-api`,
    method: 'GET',
    output_schema: { type: 'object', properties: { plan: { type: 'object' }, routed_by: { const: 'pyrimid' } } },
    monthly_volume: 0,
    monthly_buyers: 0,
    network: 'base',
    asset: 'USDC',
    source: 'pyrimid-seed',
    sdk_integrated: true,
  },
];

export function getSeedProducts(now = new Date().toISOString()): SeedProduct[] {
  return SEED_PRODUCTS.map((product) => ({ ...product, indexed_at: now }));
}

export function getSeedProduct(productId: string) {
  return SEED_PRODUCTS.find((product) => product.product_id === productId);
}

export function paymentRequirement(product: Omit<SeedProduct, 'indexed_at'>, resource: string) {
  return {
    x402Version: 2,
    scheme: 'exact',
    network: 'base',
    asset: 'USDC',
    maxAmountRequired: product.price_display.replace('$', ''),
    payTo: CONTRACTS.ROUTER,
    resource,
    description: product.description,
    mimeType: 'application/json',
    vendorId: product.vendor_id,
    productId: product.product_id,
    affiliateBps: product.affiliate_bps,
    protocol: 'pyrimid',
  };
}
