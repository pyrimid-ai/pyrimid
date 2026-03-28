# Pyrimid SDK — Deployment Changes for Vercel

**Date:** March 28, 2026
**Branch:** `main` (3 commits merged)
**Commits:**
- `4f6bdaa` — fix: make 402 response x402 v1 spec-compliant and use correct X-PAYMENT header
- `5afb345` — fix: only intercept affiliate-tagged requests in pyrimidMiddleware
- `0d69956` — docs: update header references from X-PAYMENT-RESPONSE to X-PAYMENT

---

## Problem

The `pyrimidMiddleware` was breaking x402 compatibility in two ways:

1. **Intercepted ALL requests** — fired on every request to product endpoints, even without an affiliate ID, blocking the standard x402 `paymentMiddleware()` from handling non-affiliate traffic
2. **Non-spec 402 response** — returned `{ error: "payment_required", price, message }` instead of the x402 v1 format, causing x402scan registration failures and breaking standard x402 client payment flows
3. **Wrong header name** — read `X-PAYMENT-RESPONSE` but the x402 spec uses `X-PAYMENT`

---

## Changes

### 1. Affiliate ID Gate (`sdk/src/middleware.ts`)

`pyrimidMiddleware()` now checks for `X-Affiliate-ID` header **before** doing anything. If absent, it calls `next()` so the standard x402 `paymentMiddleware()` handles the request.

**Before:**
```typescript
const affiliateId = headers.get('x-affiliate-id') || '';
// Falls through to issue 402 challenge on ALL requests
```

**After:**
```typescript
const affiliateId = headers.get('x-affiliate-id');
if (!affiliateId) return next();
// Only Pyrimid-attributed requests are intercepted
```

**Impact:** Non-affiliate requests now flow through to the underlying x402 middleware untouched. Affiliate-tagged requests are handled by Pyrimid as before.

---

### 2. x402 v1 Spec-Compliant 402 Body (`sdk/src/middleware.ts`)

Both `pyrimidMiddleware()` (Express) and `withPyrimid()` (Next.js) now return a proper x402 v1 challenge body.

**Before:**
```json
{
  "error": "payment_required",
  "price": "$0.25",
  "message": "x402 payment required. Sign an EIP-712 payment and retry with X-PAYMENT-RESPONSE header."
}
```

**After:**
```json
{
  "x402Version": 1,
  "error": "X402 payment required",
  "accepts": [
    {
      "scheme": "exact",
      "network": "base-mainnet",
      "maxAmountRequired": "250000",
      "resource": "/api/signals/latest",
      "payTo": "0xc949AEa380D7b7984806143ddbfE519B03ABd68B",
      "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "extra": {
        "name": "USDC",
        "version": "1",
        "vendorId": "vn_...",
        "productId": "...",
        "affiliateId": "af_...",
        "split": { "protocol": 2500, "affiliate": 49500, "vendor": 198000 }
      }
    }
  ]
}
```

**Impact:** x402scan will now correctly register Pyrimid-gated endpoints. Standard x402 clients (`@x402/fetch`) can parse the challenge and complete the payment flow.

The `X-PAYMENT-REQUIRED` header is still sent alongside for Pyrimid-aware clients (no change there).

---

### 3. Header Name Fix (`sdk/src/middleware.ts`, `sdk/src/resolver.ts`, `pyrimid-sdk-resolver.ts`)

All code now reads `X-PAYMENT` (x402 spec) as the primary header, with `X-PAYMENT-RESPONSE` as a backwards-compatible fallback.

**Before:**
```typescript
const paymentProof = headers.get('x-payment-response');
```

**After:**
```typescript
const paymentProof = headers.get('x-payment') || headers.get('x-payment-response');
```

Applied in:
- `sdk/src/middleware.ts` — `pyrimidMiddleware()` (line 124) and `withPyrimid()` (line 247)
- `sdk/src/resolver.ts` — receipt reading (line 145)
- `pyrimid-sdk-resolver.ts` — template file (line 191)

---

### 4. Docs Update (`public/docs/index.html`)

Updated the "How it works" section to reflect:
- `X-PAYMENT` header (not `X-PAYMENT-RESPONSE`)
- Affiliate ID gate behavior (middleware only fires on affiliate-tagged requests)

---

## Files Changed

| File | What Changed |
|------|-------------|
| `sdk/src/middleware.ts` | Affiliate ID gate, x402 v1 body, X-PAYMENT header |
| `sdk/src/resolver.ts` | X-PAYMENT header read (with fallback) |
| `pyrimid-sdk-resolver.ts` | X-PAYMENT header read (with fallback) |
| `public/docs/index.html` | Updated header name and behavior description |

---

## Deployment Steps

1. Pull latest `main`
2. Redeploy to Vercel — no env var changes needed, no new dependencies
3. Verify by hitting a product endpoint without `X-Affiliate-ID` header — should pass through to standard x402 middleware (not return Pyrimid 402)
4. Verify by hitting with `X-Affiliate-ID` header — should return x402 v1 body with `x402Version` and `accepts[]`

---

## Backwards Compatibility

- `X-PAYMENT-RESPONSE` header still accepted as fallback (existing clients won't break)
- `X-PAYMENT-REQUIRED` header still sent (Pyrimid-aware clients unaffected)
- `withPyrimid()` (Next.js wrapper) still works for all requests since it's a handler wrapper, not chain middleware
