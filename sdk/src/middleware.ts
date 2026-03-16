/**
 * Pyrimid Vendor Middleware — 10-line x402 integration
 *
 * Drop this into any Express/Hono/Next.js server to activate
 * affiliate-attributed commission splitting on your products.
 *
 * Usage:
 *   import { pyrimidMiddleware } from '@pyrimid/sdk';
 *   app.use(pyrimidMiddleware({
 *     vendorId: 'vn_your_id',
 *     products: {
 *       '/api/signals/latest': { productId: 'signals_latest', price: 250000, affiliateBps: 2000 }
 *     }
 *   }));
 *
 * PROPRIETARY — @pyrimid/sdk
 */

import {
  PYRIMID_ADDRESSES,
  ROUTER_ABI,
  type VendorMiddlewareConfig,
  type PaymentSplit,
} from './types.js';

// ═══════════════════════════════════════════════════════════
//                   PAYMENT SPLIT CALCULATOR
// ═══════════════════════════════════════════════════════════

export function calculateSplit(priceUsdc: number, affiliateBps: number): PaymentSplit {
  const protocolFee = Math.floor(priceUsdc / 100); // 1%
  const remaining = priceUsdc - protocolFee;
  const affiliateCommission = Math.floor((remaining * affiliateBps) / 10_000);
  const vendorShare = remaining - affiliateCommission;

  return {
    total_usdc: priceUsdc,
    protocol_fee: protocolFee,
    affiliate_commission: affiliateCommission,
    vendor_share: vendorShare,
    affiliate_bps: affiliateBps,
  };
}

// ═══════════════════════════════════════════════════════════
//              GENERIC MIDDLEWARE (Framework-agnostic)
// ═══════════════════════════════════════════════════════════

interface MiddlewareRequest {
  url?: string;
  path?: string;
  method?: string;
  headers: Record<string, string | string[] | undefined> | Headers;
}

interface MiddlewareResponse {
  status: (code: number) => MiddlewareResponse;
  setHeader: (key: string, value: string) => MiddlewareResponse;
  json: (body: unknown) => void;
}

/**
 * Express/Connect-compatible middleware.
 *
 * Intercepts requests to configured product endpoints, checks for x402
 * payment, verifies via the CommissionRouter, and either returns a 402
 * with payment requirements or passes through to the next handler.
 */
export function pyrimidMiddleware(config: VendorMiddlewareConfig) {
  const {
    vendorId,
    network = 'base',
    products,
  } = config;

  const addresses = PYRIMID_ADDRESSES[network];
  const productPaths = new Map(
    Object.entries(products).map(([path, p]) => [path, p])
  );

  return async function middleware(
    req: MiddlewareRequest,
    res: MiddlewareResponse,
    next: () => void,
  ) {
    const pathname = req.path || new URL(req.url || '/', 'http://localhost').pathname;
    const productConfig = productPaths.get(pathname);

    // Not a Pyrimid product endpoint — pass through
    if (!productConfig) return next();

    // Extract affiliate ID from header
    const headers = req.headers instanceof Headers ? req.headers : new Headers(req.headers as Record<string, string>);
    const affiliateId = headers.get('x-affiliate-id') || '';

    // Check for x402 payment proof
    const paymentProof = headers.get('x-payment-response');

    if (!paymentProof) {
      // No payment — return 402 with payment requirements
      const split = calculateSplit(productConfig.price, productConfig.affiliateBps);

      res.status(402);
      res.setHeader('X-PAYMENT-REQUIRED', JSON.stringify({
        protocol: 'x402',
        network: 'base',
        asset: addresses.USDC,
        amount: productConfig.price.toString(),
        recipient: addresses.ROUTER,
        router: addresses.ROUTER,
        vendor_id: vendorId,
        product_id: productConfig.productId,
        affiliate_id: affiliateId || 'af_treasury',
        split: {
          protocol: split.protocol_fee,
          affiliate: split.affiliate_commission,
          vendor: split.vendor_share,
        },
        expires: new Date(Date.now() + 5 * 60_000).toISOString(),
      }));
      res.json({
        error: 'payment_required',
        price: `$${(productConfig.price / 1_000_000).toFixed(2)}`,
        message: 'x402 payment required. Sign an EIP-712 payment and retry with X-PAYMENT-RESPONSE header.',
      });
      return;
    }

    // Payment proof present — verify it was routed through CommissionRouter
    // In production, this calls the router contract to verify the tx
    try {
      const verified = await verifyPayment(paymentProof, {
        vendorId,
        productId: productConfig.productId,
        price: productConfig.price,
        routerAddress: addresses.ROUTER,
      });

      if (!verified.valid) {
        res.status(403);
        res.json({ error: 'payment_invalid', message: verified.reason });
        return;
      }

      // Payment verified — attach receipt metadata and pass to product handler
      (req as any)._pyrimid = {
        verified: true,
        tx_hash: verified.txHash,
        affiliate_id: affiliateId,
        paid_usdc: productConfig.price,
        split: calculateSplit(productConfig.price, productConfig.affiliateBps),
      };

      return next();
    } catch (err) {
      res.status(500);
      res.json({
        error: 'payment_verification_failed',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  };
}

// ═══════════════════════════════════════════════════════════
//               NEXT.JS / EDGE HANDLER WRAPPER
// ═══════════════════════════════════════════════════════════

/**
 * Wraps a Next.js API route handler with Pyrimid payment verification.
 *
 * Usage (app router):
 *   import { withPyrimid } from '@pyrimid/sdk';
 *   export const GET = withPyrimid({
 *     vendorId: 'vn_your_id',
 *     productId: 'signals_latest',
 *     price: 250000,
 *     affiliateBps: 2000,
 *   }, async (req, paymentReceipt) => {
 *     return Response.json({ signal: '...' });
 *   });
 */
export function withPyrimid(
  product: {
    vendorId: string;
    productId: string;
    price: number;
    affiliateBps: number;
    network?: 'base';
  },
  handler: (req: Request, receipt: PaymentReceipt) => Promise<Response>,
) {
  const addresses = PYRIMID_ADDRESSES[product.network || 'base'];

  return async function pyrimidHandler(req: Request): Promise<Response> {
    const affiliateId = req.headers.get('x-affiliate-id') || 'af_treasury';
    const paymentProof = req.headers.get('x-payment-response');

    if (!paymentProof) {
      const split = calculateSplit(product.price, product.affiliateBps);
      return new Response(JSON.stringify({
        error: 'payment_required',
        price: `$${(product.price / 1_000_000).toFixed(2)}`,
        message: 'x402 payment required.',
      }), {
        status: 402,
        headers: {
          'Content-Type': 'application/json',
          'X-PAYMENT-REQUIRED': JSON.stringify({
            protocol: 'x402',
            network: 'base',
            asset: addresses.USDC,
            amount: product.price.toString(),
            recipient: addresses.ROUTER,
            vendor_id: product.vendorId,
            product_id: product.productId,
            affiliate_id: affiliateId,
            split: {
              protocol: split.protocol_fee,
              affiliate: split.affiliate_commission,
              vendor: split.vendor_share,
            },
          }),
        },
      });
    }

    const verified = await verifyPayment(paymentProof, {
      vendorId: product.vendorId,
      productId: product.productId,
      price: product.price,
      routerAddress: addresses.ROUTER,
    });

    if (!verified.valid) {
      return new Response(JSON.stringify({
        error: 'payment_invalid',
        message: verified.reason,
      }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    return handler(req, {
      verified: true,
      tx_hash: verified.txHash || '',
      affiliate_id: affiliateId,
      paid_usdc: product.price,
      split: calculateSplit(product.price, product.affiliateBps),
    });
  };
}

// ═══════════════════════════════════════════════════════════
//                PAYMENT VERIFICATION (STUB)
// ═══════════════════════════════════════════════════════════

interface VerifyPaymentInput {
  vendorId: string;
  productId: string;
  price: number;
  routerAddress: string;
}

interface VerifyPaymentResult {
  valid: boolean;
  reason?: string;
  txHash?: string;
}

interface PaymentReceipt {
  verified: boolean;
  tx_hash: string;
  affiliate_id: string;
  paid_usdc: number;
  split: PaymentSplit;
}

/**
 * Verify an x402 payment was routed through the CommissionRouter.
 * In production, this decodes the EIP-712 signature and checks the
 * onchain receipt via the PaymentRouted event.
 */
async function verifyPayment(
  proof: string,
  input: VerifyPaymentInput,
): Promise<VerifyPaymentResult> {
  // TODO: Implement onchain verification
  // 1. Decode x402 payment proof (EIP-712 signed receipt)
  // 2. Verify signature against buyer wallet
  // 3. Check PaymentRouted event on CommissionRouter
  // 4. Validate amounts match product price
  //
  // For testnet/development, accept all proofs:
  return { valid: true, txHash: proof };
}

export type { PaymentReceipt };
