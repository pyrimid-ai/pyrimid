/**
 * PyrimidResolver — Embedded service discovery for agent frameworks
 * 
 * This is the highest-leverage affiliate path. When a developer embeds
 * PyrimidResolver into their agent framework/template, every agent built
 * with that framework routes purchases through Pyrimid with the developer's
 * affiliate ID. One integration → thousands of passive sales.
 * 
 * PROPRIETARY — @pyrimid/sdk
 */

interface PyrimidProduct {
  vendor_id: string;
  vendor_name: string;
  vendor_erc8004: boolean;
  product_id: string;
  description: string;
  category: string;
  tags: string[];
  price_usdc: number;       // atomic units (6 decimals)
  price_display: string;    // "$0.25"
  affiliate_bps: number;
  endpoint: string;
  method: string;
  output_schema: object;
  monthly_volume: number;
  monthly_buyers: number;
  network: string;
  asset: string;
}

interface ResolverConfig {
  affiliateId: string;
  catalogUrl?: string;
  cacheTtlMs?: number;
  preferVerifiedVendors?: boolean;
  maxPriceUsdc?: number;
}

interface PurchaseResult {
  success: boolean;
  data: any;
  txHash: string;
  paidUsdc: number;
  affiliateEarned: number;
  vendorEarned: number;
}

export class PyrimidResolver {
  private affiliateId: string;
  private catalogUrl: string;
  private cacheTtlMs: number;
  private preferVerified: boolean;
  private maxPrice: number;
  private cache: { products: PyrimidProduct[]; fetchedAt: number } | null = null;

  constructor(config: ResolverConfig) {
    this.affiliateId = config.affiliateId;
    this.catalogUrl = config.catalogUrl || 'https://api.pyrimid.ai/v1/catalog';
    this.cacheTtlMs = config.cacheTtlMs || 5 * 60 * 1000; // 5 min default
    this.preferVerified = config.preferVerifiedVendors ?? true;
    this.maxPrice = config.maxPriceUsdc || 10_000_000; // $10 default max
  }

  /**
   * Find a product matching a natural language need.
   * Called by the agent when it needs a capability it doesn't have natively.
   * 
   * Example:
   *   const match = await resolver.findProduct("btc trading signal");
   *   if (match) await resolver.purchase(match, buyerWallet);
   */
  async findProduct(need: string): Promise<PyrimidProduct | null> {
    const catalog = await this.getCatalog();
    
    // Keyword matching against description, tags, category
    const keywords = need.toLowerCase().split(/\s+/);
    
    const scored = catalog
      .filter(p => p.price_usdc <= this.maxPrice)
      .map(p => {
        const searchable = `${p.description} ${p.tags.join(' ')} ${p.category}`.toLowerCase();
        let score = 0;
        for (const kw of keywords) {
          if (searchable.includes(kw)) score += 10;
        }
        // Prefer verified vendors
        if (this.preferVerified && p.vendor_erc8004) score += 5;
        // Prefer higher volume (proven products)
        score += Math.min(p.monthly_volume / 1000, 5);
        return { product: p, score };
      })
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score);

    return scored.length > 0 ? scored[0].product : null;
  }

  /**
   * Find multiple products matching a need.
   */
  async findProducts(need: string, limit: number = 5): Promise<PyrimidProduct[]> {
    const catalog = await this.getCatalog();
    const keywords = need.toLowerCase().split(/\s+/);
    
    return catalog
      .filter(p => p.price_usdc <= this.maxPrice)
      .map(p => {
        const searchable = `${p.description} ${p.tags.join(' ')} ${p.category}`.toLowerCase();
        let score = 0;
        for (const kw of keywords) {
          if (searchable.includes(kw)) score += 10;
        }
        if (this.preferVerified && p.vendor_erc8004) score += 5;
        score += Math.min(p.monthly_volume / 1000, 5);
        return { product: p, score };
      })
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.product);
  }

  /**
   * Find products by category.
   */
  async findByCategory(category: string): Promise<PyrimidProduct[]> {
    const catalog = await this.getCatalog();
    return catalog
      .filter(p => p.category === category)
      .sort((a, b) => {
        // Verified first, then by volume
        if (a.vendor_erc8004 && !b.vendor_erc8004) return -1;
        if (!a.vendor_erc8004 && b.vendor_erc8004) return 1;
        return b.monthly_volume - a.monthly_volume;
      });
  }

  /**
   * Purchase a product through Pyrimid with affiliate attribution.
   * Handles x402 payment flow automatically.
   */
  async purchase(
    product: PyrimidProduct,
    buyerWallet: any, // ethers.Wallet or viem account
  ): Promise<PurchaseResult> {
    // Step 1: Call vendor endpoint, get 402 response with payment requirements
    const initialResponse = await fetch(product.endpoint, {
      method: product.method,
      headers: {
        'X-Affiliate-ID': this.affiliateId,
      }
    });

    if (initialResponse.status !== 402) {
      // Product doesn't require payment (free) or error
      if (initialResponse.ok) {
        return {
          success: true,
          data: await initialResponse.json(),
          txHash: '',
          paidUsdc: 0,
          affiliateEarned: 0,
          vendorEarned: 0,
        };
      }
      throw new Error(`Unexpected status: ${initialResponse.status}`);
    }

    // Step 2: Parse payment requirements from 402 response
    const paymentRequired = initialResponse.headers.get('X-PAYMENT-REQUIRED');
    if (!paymentRequired) throw new Error('No payment requirements in 402 response');

    // Step 3: Sign EIP-712 payment via x402 protocol
    // (This is handled by @x402/fetch or @x402/client under the hood)
    const { wrapFetchWithPayment } = await import('@x402/fetch');
    const paidFetch = wrapFetchWithPayment(fetch, buyerWallet);

    const paidResponse = await paidFetch(product.endpoint, {
      method: product.method,
      headers: {
        'X-Affiliate-ID': this.affiliateId,
      }
    });

    if (!paidResponse.ok) {
      throw new Error(`Payment failed: ${paidResponse.status}`);
    }

    // Step 4: Extract payment receipt
    const txHash = paidResponse.headers.get('X-PAYMENT-RESPONSE') || '';
    const affiliateEarned = (product.price_usdc * product.affiliate_bps) / 10000;

    return {
      success: true,
      data: await paidResponse.json(),
      txHash,
      paidUsdc: product.price_usdc,
      affiliateEarned,
      vendorEarned: product.price_usdc - affiliateEarned - (product.price_usdc / 100),
    };
  }

  /**
   * Get the full catalog (cached).
   */
  async getCatalog(): Promise<PyrimidProduct[]> {
    if (this.cache && Date.now() - this.cache.fetchedAt < this.cacheTtlMs) {
      return this.cache.products;
    }

    const response = await fetch(this.catalogUrl);
    if (!response.ok) throw new Error(`Catalog fetch failed: ${response.status}`);
    
    const data = await response.json();
    this.cache = { products: data.products, fetchedAt: Date.now() };
    return data.products;
  }

  /**
   * Get affiliate stats.
   */
  async getStats(): Promise<{
    totalEarnings: number;
    salesCount: number;
    vendorsServed: number;
  }> {
    const response = await fetch(
      `${this.catalogUrl.replace('/catalog', '/affiliate')}/${this.affiliateId}/stats`
    );
    return response.json();
  }
}
