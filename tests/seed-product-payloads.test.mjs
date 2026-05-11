import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildMcpServerAudit,
  buildVendorLeadDiscovery,
} from '../lib/seed-product-payloads.mjs';

test('vendor lead discovery returns scored leads with discovery sources and outreach payloads', () => {
  const result = buildVendorLeadDiscovery('mcp');

  assert.equal(result.segment, 'mcp');
  assert.ok(result.generated_at);
  assert.ok(result.discovery_queries.github.length >= 3);
  assert.ok(result.discovery_queries.mcp_directories.length >= 2);
  assert.ok(result.leads.length >= 3);

  const [topLead] = result.leads;
  assert.equal(topLead.rank, 1);
  assert.ok(topLead.score >= 80);
  assert.ok(topLead.github_query.includes('mcp'));
  assert.ok(topLead.fit_signals.length >= 3);
  assert.ok(topLead.x402_opportunity.includes('402'));
  assert.ok(topLead.recommended_product.price_display.startsWith('$'));
  assert.ok(topLead.outreach.subject.includes('Pyrimid'));
});

test('mcp server audit returns concrete paid tools, pricing, route shape, catalog metadata, and risk notes', () => {
  const result = buildMcpServerAudit('https://example.com/mcp');

  assert.equal(result.url, 'https://example.com/mcp');
  assert.ok(result.recommended_paid_tools.length >= 4);
  assert.ok(result.recommended_paid_tools[0].pricing.price_display.startsWith('$'));
  assert.ok(result.route_shape.unauthenticated_response.status, 402);
  assert.ok(result.route_shape.paid_retry.headers.includes('X-PAYMENT-TX'));
  assert.equal(result.catalog_metadata.network, 'base');
  assert.equal(result.catalog_metadata.asset, 'USDC');
  assert.ok(result.risk_notes.some((note) => note.severity === 'high'));
  assert.ok(result.integration_checklist.length >= 5);
});
