# Pyrimid — Fluencr Fork Plan

**Date:** March 13, 2026  
**Based on:** Full code review of Fluencr contracts, protocol, server, and app repos  
**Purpose:** Map every Fluencr component to its Pyrimid equivalent, identify what to keep/modify/drop/build new

---

## 1. Code Review Summary

### What Fluencr Actually Is

Fluencr is a 2-tier affiliate system for human sellers on Polygon. The flow:

1. **Base.sol** — Free soulbound ERC-721 membership. Stores `referrals[address => address]` for one level of referral tracking. `mint()` for direct signup, `mintReferral(address)` to register with a referrer.

2. **Gold.sol** — Paid soulbound ERC-721 membership (DAI/USDC/USDT). Gold members get higher commission rates. Referral discount on mint price.

3. **Vendor.sol** — ERC-721 product NFTs. Admin adds products with `addToInventory(productId, price, url)`. On sale, buyer receives an NFT representing purchase. Implements `IFluencr` interface.

4. **Ebook.sol** — ERC-1155 product variant. Same pattern as Vendor but with supply tracking (multiple copies of same product).

5. **Affiliate.sol (AffiliateModule)** — The payment router. `buy(bytes calldata)` decodes the calldata to get contract address, seller, productId, and token type. Looks up seller's membership tier (Base vs Gold), splits payment between seller/referral/merchant/vaults.

6. **PayoutDistributioner.sol** — Abstract commission engine. Per-product distribution models (5-element arrays: baseKickback, goldKickback, baseReferral, goldReferral, merchantCommission). Calculates and transfers splits. Vault distribution for unclaimed referral share.

7. **Fluencr.sol (Protocol)** — Abstract contract + IFluencr interface. Defines `Product` struct (id, url, price). `sell()` with `onlyAffiliate` modifier ensures only the AffiliateModule can trigger sales.

### Key Architecture Patterns

- **Upgradeable proxies** throughout (OpenZeppelin Upgradeable)
- **Multi-stablecoin** support (DAI/USDC/USDT with decimal normalization)
- **ABI-encoded calldata** for the buy function (flexible product routing)
- **Per-product commission models** via `distributionModels[productId]`
- **Soulbound NFTs** with `eligbleTransfer` flag pattern
- **Whitelisted vendor contracts** (admin-gated)
- **Two vault addresses** for splitting unclaimed commissions (40/60 vault/merchant split)
- **Deployed on Polygon** with Hardhat + OpenZeppelin upgrades

### Commission Math (from deploy script)

```
payoutPercentages = [80, 160, 20, 80, 600]
percentageDenominator = 1000

Base member kickback:    80/1000  = 8%
Gold member kickback:    160/1000 = 16%  
Base referral kickback:  20/1000  = 2%
Gold referral kickback:  80/1000  = 8%
Merchant commission:     600/1000 = 60%

Remaining (to vaults):   varies (100% - merchant - seller - referral)
```

---

## 2. Fork Mapping: Fluencr → Pyrimid

### Contracts

| Fluencr | Pyrimid | Action | Notes |
|---------|---------|--------|-------|
| `Base.sol` | `PyrimidMembership.sol` | **FORK + SIMPLIFY** | Keep: free soulbound ERC-721, `mint()`, `mintReferral()`, referral mapping, soulbound transfer lock. Drop: admin transfer, burn. Add: affiliate ID generation (bytes16), vendor flag, discovery bonus tracking. |
| `Gold.sol` | **DROP** | **REMOVE** | No paid membership tiers in Pyrimid. All affiliates are equal. Volume-based tiers are tracked in the router, not via separate NFT contracts. Eliminates an entire contract + all Base/Gold branching logic. |
| `Affiliate.sol` | `PyrimidRouter.sol` | **FORK + MAJOR REWRITE** | Keep: `buy()` entry point pattern, multi-stablecoin support, whitelisted contracts, merchant address mapping. Drop: ALL Base/Gold branching (massive simplification), vault distribution. Rewrite: single-path commission split (1% platform + X% affiliate + remainder to vendor). Add: per-vendor commission rates (from catalog), discovery bonus logic, affiliate stats tracking. |
| `PayoutDistributioner.sol` | **INLINE INTO ROUTER** | **ABSORB** | The 5-element distribution model is over-engineered for one-layer. Replace with simple 3-way split: `platformFee + affiliateCommission + vendorShare = 100%`. No need for abstract class. |
| `Vendor.sol` | `PyrimidVendor.sol` | **FORK + ADAPT** | Keep: product inventory (id, price, url), `addToInventory()`, `getProduct()`, `listProducts()`. Drop: ERC-721 minting on purchase (Pyrimid serves API responses, not NFTs). Add: `affiliateBps` per product, vendor payout address, active/inactive toggle. Make vendor self-service (no admin gating). |
| `Ebook.sol` | **DROP** | **REMOVE** | Subsumed by PyrimidVendor. Digital products in Pyrimid are API responses, not ERC-1155 tokens. |
| `Fluencr.sol` (protocol) | `IPyrimid.sol` | **FORK + SIMPLIFY** | Keep: `Product` struct, `IFluencr` interface pattern. Modify: Add `affiliateBps` to Product struct. Rename. The `onlyAffiliate` modifier becomes `onlyRouter`. |
| — | `PyrimidTreasury.sol` | **NEW** | Simple contract: accumulates 1% platform fees, owner can withdraw. ~30 lines. |

### Server

| Fluencr | Pyrimid | Action |
|---------|---------|--------|
| Apollo GraphQL + Firebase | **DROP** | Pyrimid doesn't need a centralized backend for MVP. The subgraph indexes onchain events. The catalog API reads from the subgraph or directly from contracts. If needed later, replace Firebase with Turso (already in Rizz's stack). |
| EIP-712 ticket signing | **DROP** | No gasless minting needed. Agents call contracts directly. |
| Account/Product services | **REPLACE** | The catalog API and affiliate dashboard read from the subgraph, not Firebase. |

### App

| Fluencr | Pyrimid | Action |
|---------|---------|--------|
| Next.js 12 frontend | **DROP for MVP** | Pyrimid Phase 1 doesn't need a dashboard. Affiliates and vendors interact via SDK + contracts. Phase 2 builds a minimal catalog browser + affiliate stats page. |
| Wallet connect + purchase flow | **DEFER** | Human-facing UI is Phase 2. Agents use the SDK. |

---

## 3. What Gets Dramatically Simpler

The single biggest win in forking Fluencr for Pyrimid is **eliminating the Base/Gold tier system**. This removes:

- `Gold.sol` entirely (374 lines)
- All `if (_sellerGoldMember > 0) { ... } else { ... }` branching in `Affiliate.sol` (most of the 405-line file)
- `distributeBase()`, `distributeGold()`, `distributeBaseReferral()`, `distributeGoldReferral()` — four separate distribution functions that differ only in which percentage index they read
- The 5-element distribution model array (replaced by a single `affiliateBps` per product)
- The vault split logic (40/60 split of unclaimed referral share)
- Gold membership purchase flow, discount calculations, referral discount logic

**Fluencr's `distributePayout()` is ~140 lines of branching.** Pyrimid's equivalent is ~20 lines:

```solidity
function routePayment(address buyer, bytes16 vendorId, string productId, bytes16 affiliateId) external {
    Product memory p = catalog.getProduct(vendorId, productId);
    uint256 amount = p.price;
    
    // 1. Platform fee (1%)
    uint256 fee = (amount * 100) / 10000;
    usdc.transferFrom(buyer, treasury, fee);
    
    // 2. Affiliate commission
    uint256 remaining = amount - fee;
    uint256 commission = 0;
    if (affiliateId != bytes16(0)) {
        commission = (remaining * p.affiliateBps) / 10000;
        usdc.transferFrom(buyer, affiliates[affiliateId].wallet, commission);
    }
    
    // 3. Vendor gets rest
    usdc.transferFrom(buyer, vendors[vendorId].payoutAddress, remaining - commission);
}
```

That's the entire commission engine. Everything else is registration, catalog management, and discovery bonus logic.

---

## 4. What's Genuinely New (Not in Fluencr)

| Component | Effort | Priority |
|-----------|--------|----------|
| **Vendor self-registration** | 1 day | Phase 1 — vendors register permissionlessly, no admin whitelisting |
| **Per-product affiliate commission (affiliateBps)** | 0.5 day | Phase 1 — each product has its own commission rate set by vendor |
| **Discovery bonus logic** | 1 day | Phase 1 — $5 one-time bonus on referred affiliate's first sale |
| **Affiliate ID system (bytes16)** | 0.5 day | Phase 1 — deterministic ID generation from wallet + counter |
| **x402 middleware integration** | 2-3 days | Phase 1 — `@x402/express` wrapping vendor endpoints, routing through PyrimidRouter |
| **Pyrimid SDK (@pyrimid/sdk)** | 3-4 days | Phase 1 — vendor middleware + affiliate agent tools |
| **MCP server** | 2 days | Phase 3 — paid tools wrapping vendor products |
| **Subgraph** | 2 days | Phase 2 — index SaleCompleted, AffiliateRegistered, VendorRegistered events |
| **Catalog API** | 1-2 days | Phase 2 — REST API reading from subgraph |
| **Platform site + dashboard** | 5-7 days | Phase 2 — minimal catalog browser, affiliate stats |

---

## 5. Concrete File-by-File Fork Plan

### Step 1: New repo structure

```
pyrimid/
├── contracts/
│   ├── PyrimidMembership.sol    ← fork Base.sol
│   ├── PyrimidRouter.sol        ← fork Affiliate.sol (major rewrite)
│   ├── PyrimidVendor.sol        ← fork Vendor.sol  
│   ├── PyrimidTreasury.sol      ← new
│   ├── interfaces/
│   │   └── IPyrimid.sol         ← fork IFluencr.sol
│   └── test/
│       ├── PyrimidRouter.test.js
│       ├── PyrimidMembership.test.js
│       └── PyrimidVendor.test.js
├── sdk/
│   ├── src/
│   │   ├── vendor.ts            ← vendor integration middleware
│   │   ├── affiliate.ts         ← affiliate agent SDK
│   │   ├── catalog.ts           ← catalog query client
│   │   └── index.ts
│   └── package.json
├── subgraph/
│   ├── schema.graphql
│   ├── subgraph.yaml
│   └── src/mapping.ts
├── deploy/
│   └── 00_deploy_pyrimid.js
├── hardhat.config.js
└── package.json
```

### Step 2: Contract modifications (detailed)

**PyrimidMembership.sol (from Base.sol):**
```
KEEP:   ERC721EnumerableUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable
KEEP:   mapping(address => bool) users (prevent double registration)
KEEP:   mapping(address => address) referrals (one-level referral tracking)  
KEEP:   mint() — free registration, soulbound
KEEP:   mintReferral(address) — registration with referrer
KEEP:   Soulbound _beforeTokenTransfer pattern
KEEP:   mintGasless() for admin-sponsored signups
DROP:   burn(), transferToken() (not needed for Pyrimid)
ADD:    mapping(address => bytes16) walletToId
ADD:    mapping(bytes16 => AffiliateData) affiliateData (wallet, referredBy, totalSales, discoveryBonusPaid)
ADD:    mapping(address => VendorData) vendorData (payoutAddress, name, baseUrl, active)
ADD:    registerVendor() function
ADD:    isVendor()/isAffiliate() view functions
RENAME: BaseMember → PyrimidMembership, "BASE"/"BASE" → "PYRIMID"/"PYR"
```

**PyrimidRouter.sol (from Affiliate.sol — major rewrite):**
```
KEEP:   ReentrancyGuardUpgradeable, OwnableUpgradeable
KEEP:   IERC20Upgradeable for USDC
KEEP:   buy() entry point pattern (but simplified calldata)
KEEP:   checkWhitelisted() pattern → but make it check vendor registry instead
KEEP:   mapping(address => bool) admins + onlyAdmin modifier
DROP:   GoldMember interface + all gold-related logic
DROP:   BaseMember interface (membership check moves to registry)
DROP:   StableCoin enum (Pyrimid is USDC-only on Base)
DROP:   PayoutDistributioner inheritance (inline the simple 3-way split)
DROP:   distributionModels mapping (replaced by per-product affiliateBps)
DROP:   distributeBase(), distributeGold(), distributeBaseReferral(), distributeGoldReferral()
DROP:   vaultDistribution() (no vaults in Pyrimid)
DROP:   tokenDecimals array (USDC is always 6 decimals on Base)
ADD:    routePayment() — single function: 1% platform + X% affiliate + rest to vendor
ADD:    Discovery bonus check + payout
ADD:    Anti-sybil checks (buyer != affiliate, buyer != referrer)
ADD:    Affiliate stats recording (totalSales, totalCommission)
ADD:    Reference to PyrimidTreasury for fee accumulation
```

**PyrimidVendor.sol (from Vendor.sol):**
```
KEEP:   Product struct (id, url, price)
KEEP:   mapping(uint256 => Product) inventory
KEEP:   addToInventory(), getProduct(), listProducts()
KEEP:   onlyAdmin modifier for product management
DROP:   ERC721 inheritance entirely (no NFT minting on purchase)
DROP:   _sell() override (products are served off-chain via x402, not as NFTs)
ADD:    affiliateBps per product (uint16, basis points)
ADD:    vendorPayoutAddress
ADD:    updatePrice(), updateAffiliateCommission()
ADD:    deactivateProduct()
MODIFY: Make it a standalone contract per vendor (factory pattern) OR a single shared catalog contract
```

### Step 3: Deploy configuration

```javascript
// deploy/00_deploy_pyrimid.js

// Chain: Base mainnet (not Polygon)
// USDC on Base: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const PLATFORM_FEE_BPS = 100;  // 1%
const MIN_AFFILIATE_BPS = 500;  // 5% minimum commission
const MAX_AFFILIATE_BPS = 5000; // 50% maximum commission
const DISCOVERY_BONUS = 5_000_000; // $5 USDC (6 decimals)

// 1. Deploy PyrimidMembership (affiliate + vendor registry)
// 2. Deploy PyrimidTreasury
// 3. Deploy PyrimidRouter (references membership + treasury + USDC)
// 4. Register genesis vendor (Trading Brain)
// 5. List genesis products (signals, indicators, methodology)
```

---

## 6. Effort Estimate

| Task | Days | Notes |
|------|------|-------|
| Fork + strip Fluencr contracts | 2 | Remove Gold, simplify payout, rename |
| Write PyrimidRouter (new commission logic) | 2 | Simple 3-way split + discovery bonus |
| Write PyrimidTreasury | 0.5 | Accumulator + withdraw |
| Vendor self-registration + catalog | 1 | From Vendor.sol pattern |
| Write tests (Hardhat) | 2 | Full flow: register → list → buy → split |
| Deploy to Base Sepolia testnet | 0.5 | |
| Build @pyrimid/sdk (vendor middleware) | 3 | x402 integration + commission routing |
| Build @pyrimid/sdk (affiliate tools) | 2 | Register, getCatalog, proxyPurchase |
| Integrate with Trading Brain (genesis) | 2 | x402 middleware on existing Next.js |
| Deploy to Base mainnet | 0.5 | |
| **Total Phase 1** | **~16 days** | 3-4 weeks with buffer |

---

## 7. Key Decisions Confirmed by Code Review

1. **USDC only.** Fluencr's multi-stablecoin pattern (DAI/USDC/USDT with different decimals) adds complexity. Base ecosystem is USDC-native. Drop DAI/USDT support.

2. **No membership tiers.** Fluencr's Base/Gold system is for human social dynamics (status, exclusivity). Agents don't care about status. All affiliates equal. Volume-based benefits tracked in router stats, not via separate NFT contracts.

3. **No NFT products.** Fluencr mints ERC-721/ERC-1155 tokens on purchase. Pyrimid serves API responses via x402. Product delivery is the vendor's responsibility, not the contract's.

4. **Vendor self-service.** Fluencr requires admin whitelisting of vendor contracts. Pyrimid is permissionless — any vendor registers and lists products. This is critical for platform growth.

5. **Base, not Polygon.** Fluencr deployed on Polygon. Pyrimid deploys on Base for x402 ecosystem alignment, lower fees, and Coinbase infrastructure (Agentic Wallets, Bazaar, facilitator).

6. **No upgradeable proxies for MVP.** Fluencr uses OpenZeppelin Upgradeable throughout. For Pyrimid v1, deploy immutable contracts (simpler, more trust from agents who can verify the code won't change). Add upgradeability in v2 if needed.

---

*This document is the technical bridge between the Pyrimid v0.1 spec and the actual implementation. Next step: write the contracts.*
