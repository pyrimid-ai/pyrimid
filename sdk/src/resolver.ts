/**
 * PyrimidResolver — Embedded service discovery for agent frameworks
 *
 * Highest-leverage affiliate path. Embed this in your agent framework
 * and every agent built on your stack routes purchases through Pyrimid
 * with your affiliate ID. One integration → thousands of passive sales.
 *
 * PROPRIETARY — @pyrimid/sdk
 */

import type { PyrimidProduct, ResolverConfig, PurchaseResult } from './types.js';

export class PyrimidResolver {
  private affiliateId: string;
  private catalogUrl: string;
  private cacheTtlMs: number;
  private preferVerified: boolean;
  private maxPrice: number;
  private cache: { products: PyrimidProduct[]; fetchedAt: number } | null = null;

  constructor(config: ResolverConfig) {
    this.affiliateId = config.affiliateId;
    this.catalogUrl = config.catalogUrl || 'https://pyrimid.ai/api/v1/catalog';
    this.cacheTtlMs = config.cacheTtlMs || 5 * 60 * 1000;
    this.preferVerified = config.preferVerifiedVendors ?? true;
    this.maxPrice = config.maxPriceUsdc || 10_000_000; // $10 default
  }

  /**
   * Find a single product matching a natural language need.
   *
   * @example
   *   const signal = await resolver.findProduct("btc trading signal");
   *   if (signal) await resolver.purchase(signal, wallet);
   */
  async findProduct(need: string): Promise<PyrimidProduct | null> {
    const catalog = await this.getCatalog();
    const keywords = need.toLowerCase().split(/\s+/);

    const scored = catalog
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
      .sort((a, b) => b.score - a.score);

    return scored.length > 0 ? scored[0].product : null;
  }

  /**
   * Find multiple products matching a need, sorted by relevance + trust.
   */
  async findProducts(need: string, limit = 5): Promise<PyrimidProduct[]> {
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
   * Find products by category. Verified vendors first, then by volume.
   */
  async findByCategory(category: string): Promise<PyrimidProduct[]> {
    const catalog = await this.getCatalog();
    return catalog
      .filter(p => p.category === category)
      .sort((a, b) => {
        if (a.vendor_erc8004 && !b.vendor_erc8004) return -1;
        if (!a.vendor_erc8004 && b.vendor_erc8004) return 1;
        return b.monthly_volume - a.monthly_volume;
      });
  }

  /**
   * Purchase a product through Pyrimid with affiliate attribution.
   * Handles the full x402 payment flow automatically.
   */
  async purchase(
    product: PyrimidProduct,
    buyerWallet: any, // ethers.Wallet or viem account
    options?: { maxPriceUsdc?: number },
  ): Promise<PurchaseResult> {
    // Step 1: Hit vendor endpoint → get 402 with payment requirements
    const initialResponse = await fetch(product.endpoint, {
      method: product.method,
      headers: { 'X-Affiliate-ID': this.affiliateId },
    });

    if (initialResponse.status !== 402) {
      if (initialResponse.ok) {
        return {
          success: true,
          data: await initialResponse.json(),
          tx_hash: '',
          paid_usdc: 0,
          affiliate_earned: 0,
          vendor_earned: 0,
          protocol_fee: 0,
        };
      }
      throw new Error(`Unexpected status: ${initialResponse.status}`);
    }

    // Step 2: Parse x402 payment requirements
    const paymentRequired = initialResponse.headers.get('X-PAYMENT-REQUIRED');
    if (!paymentRequired) throw new Error('No payment requirements in 402 response');

    // Step 3: Sign EIP-712 payment via x402 client
    const { wrapFetchWithPayment } = await import('@x402/fetch');
    const paidFetch = wrapFetchWithPayment(fetch, buyerWallet);

    const paidResponse = await paidFetch(product.endpoint, {
      method: product.method,
      headers: { 'X-Affiliate-ID': this.affiliateId },
    });

    if (!paidResponse.ok) {
      throw new Error(`Payment failed: ${paidResponse.status}`);
    }

    // Step 4: Build receipt
    const txHash = paidResponse.headers.get('X-PAYMENT-RESPONSE') || '';
    const protocolFee = Math.floor(product.price_usdc / 100);
    const remaining = product.price_usdc - protocolFee;
    const affiliateEarned = Math.floor((remaining * product.affiliate_bps) / 10_000);

    return {
      success: true,
      data: await paidResponse.json(),
      tx_hash: txHash,
      paid_usdc: product.price_usdc,
      affiliate_earned: affiliateEarned,
      vendor_earned: remaining - affiliateEarned,
      protocol_fee: protocolFee,
    };
  }

  /**
   * Get the full catalog (cached with configurable TTL).
   */
  async getCatalog(): Promise<PyrimidProduct[]> {
    if (this.cache && Date.now() - this.cache.fetchedAt < this.cacheTtlMs) {
      return this.cache.products;
    }

    const allProducts: PyrimidProduct[] = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const sep = this.catalogUrl.includes('?') ? '&' : '?';
      const url = `${this.catalogUrl}${sep}limit=${limit}&offset=${offset}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Catalog fetch failed: ${response.status}`);

      const data = await response.json();
      allProducts.push(...data.products);

      if (allProducts.length >= data.total || data.products.length < limit) break;
      offset += limit;
    }

    this.cache = { products: allProducts, fetchedAt: Date.now() };
    return allProducts;
  }

  /**
   * Get affiliate performance stats.
   */
  async getStats() {
    const baseUrl = this.catalogUrl.replace('/catalog', '/stats');
    const response = await fetch(
      `${baseUrl}?type=affiliate&id=${encodeURIComponent(this.affiliateId)}`
    );
    if (response.status === 404) {
      return {
        affiliate_id: this.affiliateId,
        registered: false,
        total_earnings_usdc: 0,
        sales_count: 0,
        unique_buyers: 0,
        vendors_served: 0,
        reputation_score: 0,
      };
    }
    if (!response.ok) throw new Error(`Stats fetch failed: ${response.status}`);
    return response.json();
  }
}
