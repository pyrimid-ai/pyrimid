/**
 * @pyrimid/sdk — Core type definitions
 *
 * PROPRIETARY — All rights reserved.
 */

// ═══════════════════════════════════════════════════════════
//                      CONTRACT ADDRESSES
// ═══════════════════════════════════════════════════════════

export const PYRIMID_ADDRESSES = {
  /** Base Mainnet */
  base: {
    REGISTRY: '0x2263852363Bce16791A059c6F6fBb590f0b98c89',
    CATALOG:  '0x1ae8EbbFf7c5A15a155c9bcF9fF7984e7C8e0E74',
    ROUTER:   '0x6594A6B2785b1f8505b291bDc50E017b5599aFC8',
    TREASURY: '0xdF29F94EA8053cC0cb1567D0A8Ac8dd3d1E00908',
    USDC:     '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    ERC_8004: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
  },
} as const;

export type Network = keyof typeof PYRIMID_ADDRESSES;

// ═══════════════════════════════════════════════════════════
//                      CATALOG TYPES
// ═══════════════════════════════════════════════════════════

export interface PyrimidProduct {
  vendor_id: string;
  vendor_name: string;
  vendor_erc8004: boolean;
  product_id: string;
  description: string;
  category: string;
  tags: string[];
  price_usdc: number;        // atomic units (6 decimals)
  price_display: string;     // "$0.25"
  affiliate_bps: number;     // basis points (500 = 5%)
  endpoint: string;
  method: string;
  output_schema: object;
  monthly_volume: number;
  monthly_buyers: number;
  network: string;
  asset: string;
}

export interface CatalogResponse {
  products: PyrimidProduct[];
  total: number;
  updated_at: string;
  sources: string[];
}

export interface CatalogQueryParams {
  query?: string;
  category?: string;
  max_price_usd?: number;
  verified_only?: boolean;
  limit?: number;
  offset?: number;
  sort_by?: 'relevance' | 'price_asc' | 'price_desc' | 'volume' | 'newest';
}

// ═══════════════════════════════════════════════════════════
//                      PURCHASE TYPES
// ═══════════════════════════════════════════════════════════

export interface PurchaseResult {
  success: boolean;
  data: unknown;
  tx_hash: string;
  paid_usdc: number;
  affiliate_earned: number;
  vendor_earned: number;
  protocol_fee: number;
}

export interface PaymentSplit {
  total_usdc: number;
  protocol_fee: number;
  affiliate_commission: number;
  vendor_share: number;
  affiliate_bps: number;
}

// ═══════════════════════════════════════════════════════════
//                    AFFILIATE / VENDOR TYPES
// ═══════════════════════════════════════════════════════════

export interface AffiliateStats {
  affiliate_id: string;
  total_earnings_usdc: number;
  sales_count: number;
  unique_buyers: number;
  vendors_served: number;
  reputation_score: number;
  erc8004_linked: boolean;
  registered_at: string;
}

export interface VendorStats {
  vendor_id: string;
  total_volume_usdc: number;
  total_sales: number;
  products_listed: number;
  products_active: number;
  affiliate_payouts_usdc: number;
  unique_affiliates: number;
  registered_at: string;
}

export interface ProtocolStats {
  total_volume_usdc: number;
  total_transactions: number;
  total_vendors: number;
  total_affiliates: number;
  total_products: number;
  treasury_balance_usdc: number;
  categories: Record<string, number>;
  sources: Record<string, number>;
  updated_at: string;
}

// ═══════════════════════════════════════════════════════════
//                      CONFIG TYPES
// ═══════════════════════════════════════════════════════════

export interface ResolverConfig {
  affiliateId: string;
  catalogUrl?: string;
  cacheTtlMs?: number;
  preferVerifiedVendors?: boolean;
  maxPriceUsdc?: number;
}

export interface McpServerConfig {
  affiliateId?: string;
  catalogUrl?: string;
  serverName?: string;
  refreshIntervalMs?: number;
}

export interface VendorMiddlewareConfig {
  vendorId: string;
  routerAddress?: string;
  usdcAddress?: string;
  network?: Network;
  products: Record<string, {
    productId: string;
    price: number;          // atomic USDC (6 decimals)
    affiliateBps: number;   // 500–5000
  }>;
}

// ═══════════════════════════════════════════════════════════
//                       ABI FRAGMENTS
// ═══════════════════════════════════════════════════════════

export const ROUTER_ABI = [
  'function routePayment(uint256 vendorId, bytes32 productId, uint256 affiliateId, address buyer) external',
  'event PaymentRouted(uint256 indexed vendorId, bytes32 indexed productId, uint256 indexed affiliateId, address buyer, uint256 total, uint256 platformFee, uint256 affiliateCommission, uint256 vendorShare)',
] as const;

export const REGISTRY_ABI = [
  'function registerAffiliate() external returns (uint256)',
  'function registerAffiliateWithReferral(uint256 referrerId) external returns (uint256)',
  'function registerVendor(string name, string baseUrl, address payoutAddress) external returns (uint256)',
  'function linkERC8004Identity(uint256 agentId) external',
  'function getAffiliate(uint256 id) external view returns (address wallet, uint256 reputation, bool erc8004Linked, uint256 salesCount, uint256 totalVolume)',
  'function getVendor(uint256 id) external view returns (string name, string baseUrl, address payoutAddress, bool active)',
  'event AffiliateRegistered(uint256 indexed affiliateId, address indexed wallet)',
  'event VendorRegistered(uint256 indexed vendorId, address indexed wallet)',
] as const;

export const CATALOG_ABI = [
  'function listProduct(bytes32 productId, string endpoint, string description, uint256 priceUsdc, uint256 affiliateBps) external',
  'function updateProduct(bytes32 productId, string endpoint, string description, uint256 priceUsdc, uint256 affiliateBps) external',
  'function deactivateProduct(bytes32 productId) external',
  'function getProduct(uint256 vendorId, bytes32 productId) external view returns (string endpoint, string description, uint256 priceUsdc, uint256 affiliateBps, bool active)',
  'function listVendorProducts(uint256 vendorId) external view returns (bytes32[])',
  'event ProductListed(uint256 indexed vendorId, bytes32 indexed productId, uint256 priceUsdc, uint256 affiliateBps)',
] as const;

export const TREASURY_ABI = [
  'function allocate(address to, uint256 amount, string purpose) external',
  'function balance() external view returns (uint256)',
  'event Allocation(address indexed to, uint256 amount, string purpose)',
] as const;
