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
  createPublicClient,
  http,
  toEventSelector,
  type Hex,
} from 'viem';
import { base } from 'viem/chains';
import {
  PYRIMID_ADDRESSES,
  ROUTER_ABI,
  type VendorMiddlewareConfig,
  type PaymentSplit,
} from './types.js';

// ═══════════════════════════════════════════════════════════
//                   PAYMENT SPLIT CALCULATOR
// ═══════════════════════════════════════════════════════════

export function calculateSplit(priceUsdc: number | bigint, affiliateBps: number | bigint): PaymentSplit {
  // Handle BigInt inputs from web3 libraries (viem/ethers)
  if (typeof priceUsdc === 'bigint' || typeof affiliateBps === 'bigint') {
    const price = BigInt(priceUsdc);
    const bps = BigInt(affiliateBps);
    const protocolFee = price / 100n;
    const remaining = price - protocolFee;
    const affiliateCommission = (remaining * bps) / 10_000n;
    const vendorShare = remaining - affiliateCommission;
    return {
      total_usdc: Number(price),
      protocol_fee: Number(protocolFee),
      affiliate_commission: Number(affiliateCommission),
      vendor_share: Number(vendorShare),
      affiliate_bps: Number(bps),
    };
  }

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
    const affiliateId = headers.get('x-affiliate-id');

    // No affiliate ID — pass through to underlying x402 paymentMiddleware
    if (!affiliateId) return next();

    // Check for x402 payment proof (X-PAYMENT per x402 spec)
    const paymentProof = headers.get('x-payment') || headers.get('x-payment-response');

    if (!paymentProof) {
      // No payment — return 402 with x402 v1 spec-compliant challenge
      const split = calculateSplit(productConfig.price, productConfig.affiliateBps);
      const resource = req.url || pathname;

      res.status(402);
      res.setHeader('X-PAYMENT-REQUIRED', JSON.stringify({
        protocol: 'x402',
        network: 'base',
        asset: addresses.USDC,
        amount: productConfig.price.toString(),
        max_price: productConfig.price.toString(),
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
        x402Version: 1,
        error: 'X402 payment required',
        accepts: [
          {
            scheme: 'exact',
            network: 'base-mainnet',
            maxAmountRequired: productConfig.price.toString(),
            resource,
            payTo: addresses.ROUTER,
            asset: addresses.USDC,
            extra: {
              name: 'USDC',
              version: '1',
              vendorId,
              productId: productConfig.productId,
              affiliateId: affiliateId || 'af_treasury',
              split: {
                protocol: split.protocol_fee,
                affiliate: split.affiliate_commission,
                vendor: split.vendor_share,
              },
            },
          },
        ],
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
    const paymentProof = req.headers.get('x-payment') || req.headers.get('x-payment-response');

    if (!paymentProof) {
      const split = calculateSplit(product.price, product.affiliateBps);
      const resource = req.url;
      return new Response(JSON.stringify({
        x402Version: 1,
        error: 'X402 payment required',
        accepts: [
          {
            scheme: 'exact',
            network: 'base-mainnet',
            maxAmountRequired: product.price.toString(),
            resource,
            payTo: addresses.ROUTER,
            asset: addresses.USDC,
            extra: {
              name: 'USDC',
              version: '1',
              vendorId: product.vendorId,
              productId: product.productId,
              affiliateId,
              split: {
                protocol: split.protocol_fee,
                affiliate: split.affiliate_commission,
                vendor: split.vendor_share,
              },
            },
          },
        ],
      }), {
        status: 402,
        headers: {
          'Content-Type': 'application/json',
          'X-PAYMENT-REQUIRED': JSON.stringify({
            protocol: 'x402',
            network: 'base',
            asset: addresses.USDC,
            amount: product.price.toString(),
            max_price: product.price.toString(),
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

const PAYMENT_ROUTED_TOPIC = toEventSelector(
  'PaymentRouted(bytes16,uint256,bytes16,address,uint256,uint256,uint256,uint256)'
);

const TRANSFER_TOPIC = toEventSelector(
  'Transfer(address,address,uint256)'
);

const MAX_PROOF_AGE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Verify an x402 payment was routed through the CommissionRouter.
 * Checks onchain for the PaymentRouted event, falling back to
 * a standard USDC transfer if no router event is found.
 */
async function verifyPayment(
  proof: string,
  input: VerifyPaymentInput,
): Promise<VerifyPaymentResult> {
  // Validate proof looks like a tx hash
  if (!proof || !/^0x[0-9a-fA-F]{64}$/.test(proof)) {
    return { valid: false, reason: 'Invalid transaction hash format' };
  }

  const txHash = proof as Hex;

  const client = createPublicClient({
    chain: base,
    transport: http('https://mainnet.base.org'),
  });

  // Fetch the transaction receipt
  let receipt;
  try {
    receipt = await client.getTransactionReceipt({ hash: txHash });
  } catch {
    return { valid: false, reason: 'Transaction not found' };
  }

  if (!receipt || receipt.status === 'reverted') {
    return { valid: false, reason: 'Transaction reverted or not found' };
  }

  // Check transaction age
  let block;
  try {
    block = await client.getBlock({ blockNumber: receipt.blockNumber });
  } catch {
    return { valid: false, reason: 'Could not fetch block timestamp' };
  }

  const txAgeMs = Date.now() - Number(block.timestamp) * 1000;
  if (txAgeMs > MAX_PROOF_AGE_MS) {
    return { valid: false, reason: 'Payment proof expired (older than 5 minutes)' };
  }

  // Check for PaymentRouted event from the Router contract
  const routerAddress = input.routerAddress.toLowerCase();
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== routerAddress) continue;

    if (log.topics[0] === PAYMENT_ROUTED_TOPIC) {
      return { valid: true, txHash: proof };
    }
  }

  // Fallback: check for standard USDC transfer to vendor
  // (for direct payments not routed through CommissionRouter)
  const usdcAddress = PYRIMID_ADDRESSES.base.USDC.toLowerCase();
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== usdcAddress) continue;

    if (log.topics[0] === TRANSFER_TOPIC && log.topics.length >= 3) {
      // ERC20 Transfer: topics[1]=from, topics[2]=to, data=value
      try {
        const value = BigInt(log.data);
        if (value >= BigInt(input.price)) {
          return { valid: true, txHash: proof };
        }
      } catch {
        // data parse failed, skip
      }
    }
  }

  return { valid: false, reason: 'No PaymentRouted event or valid USDC transfer found in transaction' };
}

export type { PaymentReceipt };
