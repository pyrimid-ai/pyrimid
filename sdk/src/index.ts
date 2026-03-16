/**
 * @pyrimid/sdk — Onchain monetization infrastructure for agent-to-agent commerce
 *
 * Three integration paths:
 *   1. PyrimidResolver  — Embed in agent frameworks for passive affiliate earnings
 *   2. MCP Server       — Deploy a catalog recommender agents can connect to
 *   3. Vendor Middleware — Add to your API to activate affiliate distribution
 *
 * @example Resolver (framework developers)
 *   import { PyrimidResolver } from '@pyrimid/sdk';
 *   const resolver = new PyrimidResolver({ affiliateId: 'af_your_id' });
 *   const product = await resolver.findProduct("trading signals");
 *
 * @example MCP Server (recommender operators)
 *   import { createPyrimidMcpServer } from '@pyrimid/sdk';
 *   const server = createPyrimidMcpServer({ affiliateId: 'af_your_id' });
 *
 * @example Vendor Middleware (product vendors)
 *   import { pyrimidMiddleware } from '@pyrimid/sdk';
 *   app.use(pyrimidMiddleware({ vendorId: 'vn_your_id', products: { ... } }));
 *
 * PROPRIETARY — All rights reserved.
 */

// Core types & constants
export {
  PYRIMID_ADDRESSES,
  ROUTER_ABI,
  REGISTRY_ABI,
  CATALOG_ABI,
  TREASURY_ABI,
} from './types.js';

export type {
  Network,
  PyrimidProduct,
  CatalogResponse,
  CatalogQueryParams,
  PurchaseResult,
  PaymentSplit,
  AffiliateStats,
  VendorStats,
  ProtocolStats,
  ResolverConfig,
  McpServerConfig,
  VendorMiddlewareConfig,
} from './types.js';

// Resolver — Path 1: Embedded distribution
export { PyrimidResolver } from './resolver.js';

// MCP Server — Path 2: Catalog recommender
export { createPyrimidMcpServer } from './mcp-server.js';

// Vendor Middleware — Path 3: Payment integration
export {
  pyrimidMiddleware,
  withPyrimid,
  calculateSplit,
} from './middleware.js';

export type { PaymentReceipt } from './middleware.js';
