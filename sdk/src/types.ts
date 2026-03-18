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
    REGISTRY: '0x34e22fc20D457095e2814CdFfad1e42980EEC389',
    CATALOG:  '0xC935d6B73034dDDb97AD2a1BbD2106F34A977908',
    ROUTER:   '0xc949AEa380D7b7984806143ddbfE519B03ABd68B',
    TREASURY: '0x74A512F4f3F64aD479dEc4554a12855Ce943E12C',
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
  'function routePayment(bytes16 vendorId, uint256 productId, bytes16 affiliateId, address buyer, uint256 maxPrice) external',
  'function previewSplit(bytes16 vendorId, uint256 productId) external view returns (uint256 total, uint256 platformFee, uint256 affiliateMax, uint256 vendorMin)',
  'event PaymentRouted(bytes16 indexed vendorId, uint256 indexed productId, bytes16 indexed affiliateId, address buyer, uint256 amount, uint256 platformFee, uint256 affiliateCommission, uint256 vendorShare)',
] as const;

export const REGISTRY_ABI = [
  'function registerAffiliate() external returns (bytes16)',
  'function registerAffiliateWithReferral(bytes16 referredBy) external returns (bytes16)',
  'function registerVendor(string name, string baseUrl, address payoutAddress) external returns (bytes16)',
  'function updateVendor(bytes16 vendorId, string name, string baseUrl, address payoutAddress) external',
  'function deactivateVendor(bytes16 vendorId) external',
  'function linkERC8004Identity(uint256 agentId) external',
  'function linkVendorERC8004Identity(uint256 agentId) external',
  'function getAffiliate(bytes16 affiliateId) external view returns (address wallet, uint256 reputation, bool erc8004Linked, uint256 salesCount, uint256 totalVolume)',
  'function getVendor(bytes16 vendorId) external view returns (string name, string baseUrl, address payoutAddress, bool active)',
  'function isAffiliate(address wallet) external view returns (bool)',
  'function isVendor(address wallet) external view returns (bool)',
  'event AffiliateRegistered(bytes16 indexed affiliateId, address indexed wallet, bytes16 referredBy)',
  'event VendorRegistered(bytes16 indexed vendorId, address indexed wallet, string name)',
  'event VendorUpdated(bytes16 indexed vendorId)',
  'event ERC8004Linked(bytes16 indexed affiliateOrVendorId, uint256 indexed agentId, address indexed wallet)',
] as const;

export const CATALOG_ABI = [
  'function listProduct(bytes16 vendorId, uint256 productId, string endpoint, string description, uint256 priceUsdc, uint16 affiliateBps) external',
  'function updatePrice(bytes16 vendorId, uint256 productId, uint256 newPrice) external',
  'function updateCommission(bytes16 vendorId, uint256 productId, uint16 newBps) external',
  'function updateProductMeta(bytes16 vendorId, uint256 productId, string endpoint, string description) external',
  'function deactivateProduct(bytes16 vendorId, uint256 productId) external',
  'function reactivateProduct(bytes16 vendorId, uint256 productId) external',
  'function getProductByVendor(bytes16 vendorId, uint256 productId) external view returns (uint256 id, string endpoint, string description, uint256 priceUsdc, uint16 affiliateBps, bool active)',
  'function getProductByKey(bytes32 key) external view returns (uint256 id, string endpoint, string description, uint256 priceUsdc, uint16 affiliateBps, bool active)',
  'function listVendorProducts(bytes16 vendorId) external view returns (uint256[] memory)',
  'function productKey(bytes16 vendorId, uint256 productId) external pure returns (bytes32)',
  'event ProductListed(bytes16 indexed vendorId, uint256 indexed productId, uint256 priceUsdc, uint16 affiliateBps, string endpoint)',
  'event ProductUpdated(bytes16 indexed vendorId, uint256 indexed productId)',
  'event ProductDeactivated(bytes16 indexed vendorId, uint256 indexed productId)',
] as const;

export const TREASURY_ABI = [
  'function allocate(address to, uint256 amount, string purpose) external',
  'function balance() external view returns (uint256)',
  'event FundsAllocated(address indexed to, uint256 amount, string purpose)',
] as const;
