# Pyrimid v0.2 — Master Specification

**Author:** Rizz  
**Date:** March 13, 2026  
**Status:** v0.2 — Consolidated architecture, hybrid aggregation model, agent-to-agent exclusive  
**Supersedes:** AAN v0.1, AAN v0.2, Pyrimid v0.1, all intermediate working documents

---

## 1. What Pyrimid Is

Pyrimid is onchain monetization infrastructure for agent-to-agent commerce.

It is a protocol on Base where any vendor can list any digital product or service, any AI agent can register as an affiliate to distribute those products programmatically, and the protocol takes a 1% fee on every transaction. Commission splits settle instantly in USDC via smart contracts.

Pyrimid is **not** a marketplace. It is **not** a hosting platform. It is **not** multi-level marketing. It is a one-layer affiliate distribution protocol that aggregates product discovery from across the agent commerce ecosystem and adds the incentive layer that makes agents actively distribute products rather than passively list them.

**Positioning:** The monetization layer that agent-to-agent commerce is missing.

**Target user:** Agent framework developers and MCP server builders who want their agents (or their users' agents) to earn USDC by distributing digital products programmatically.

---

## 2. Core Architecture: Hybrid Aggregation Model

Pyrimid operates at two layers:

### 2.1 Discovery Layer (Aggregation — Read-Only)

The Pyrimid MCP server aggregates product listings from multiple sources into a single machine-readable catalog:

- x402 Bazaar (Coinbase's discovery layer, 251+ services)
- MCPize (MCP marketplace, 350+ servers)
- MCP Hive (transaction-based MCP marketplace)
- Apify (MCP server hosting with pay-per-event)
- Direct vendor registrations on the Pyrimid contract

This aggregation is read-only indexing. Pyrimid scrapes/queries existing registries and presents a unified catalog. Agents connect to one MCP server and discover products from everywhere.

Products from external registries appear in the Pyrimid catalog automatically, before the vendor does anything. This creates a natural vendor funnel:

**Before SDK install:** Product is indexed. Agents discover it through Pyrimid. Vendor sees attribution data — how many agents found their product through the Pyrimid catalog.

**After SDK install:** Vendor adds 10 lines of Pyrimid middleware to their existing server. Now every purchase through an affiliate triggers onchain commission splitting. Discovery converts to incentivized, distributed sales.

### 2.2 Transaction Layer (Onchain — Commission Splitting)

When an agent buys a product, the payment goes directly to the vendor's endpoint (not through a proxy). The vendor's server, with the Pyrimid SDK installed, routes the USDC payment through the PyrimidRouter contract on Base. The contract splits the payment in a single transaction:

```
1% → Protocol treasury (operations fund)
X% → Affiliate agent (5-50%, set by vendor per product)
Remainder → Vendor
```

If no affiliate is attributed to the sale, the vendor receives 99% and the protocol receives 1%. Vendors never pay for distribution they don't use.

### 2.3 Key Design Principle

**Pyrimid never touches product delivery.** Discovery is aggregated. Payments are onchain. Vendors serve products directly to buyers from their own infrastructure. No proxy. No middleware in the delivery path. No single point of failure.

---

## 3. Why Not Multi-Level

This decision has been extensively analyzed and is final for v1.0.

AI agents are rational economic actors. Multi-tier commission structures (agents earning from sub-agents' sales) create incentives to defect — an agent will always prefer registering directly for a higher commission share. The referral tree flattens itself because agents have no social loyalty, no sunk-cost bias, and can calculate expected value instantly.

One-layer affiliate provides 90%+ of the distribution benefit with none of the enforcement complexity, legal risk, or price inflation that multi-tier structures introduce.

**Structure:** One layer of sales commission per transaction. No cascading commissions. No depth. No downlines. Referral data (`referredBy`) is stored for network growth analytics but carries no payment.

---

## 4. Smart Contracts (Base Mainnet)

Four contracts, all Solidity 0.8.24, deployed on Base. Forked from Fluencr contracts with major simplifications (Gold tier system removed, multi-stablecoin reduced to USDC-only, NFT-on-purchase removed, vault distribution removed, vendor self-service added, ERC-8004 integration added, reputation engine added).

### 4.1 PyrimidRegistry.sol

**Forked from:** Fluencr `Base.sol` + `Affiliate.sol`

Unified registry for affiliates and vendors. Key features:

- **Affiliate registration:** Free, permissionless. Soulbound ERC-721 membership NFT. Optional referral tracking (`referredBy` field).
- **Vendor registration:** Free, permissionless. Stores payout address, name, base URL.
- **ERC-8004 identity linking:** Optional. Affiliates and vendors can link their ERC-8004 agent identity (`linkERC8004Identity(agentId)`). Verified agents get +2000 reputation points and priority in catalog discovery.
- **Reputation engine:** Onchain score (0-10,000) updated on every sale. Factors: sales count (3000 pts), unique buyers (2500 pts), vendor diversity (1500 pts), ERC-8004 verified (2000 pts), volume bonus (1000 pts). Higher reputation = better commission offers from vendors.
- **Router-only state updates:** Only the CommissionRouter can modify affiliate stats, ensuring data integrity.

Constructor takes ERC-8004 Identity Registry address on Base (`0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`).

### 4.2 PyrimidCatalog.sol

**Forked from:** Fluencr `Vendor.sol`

Product listings with per-product pricing and affiliate commission rates. Key features:

- Products keyed by `keccak256(vendorId, productId)` — composite key enabling multi-vendor catalog in one contract
- Each product stores: endpoint URL, description, price (USDC atomic units), affiliate commission (basis points), active flag
- Commission range enforced: minimum 500 bps (5%), maximum 5000 bps (50%)
- Vendor self-service: vendors list, update, deactivate their own products without admin approval
- Enumeration: `listVendorProducts(vendorId)` returns all products for a vendor

### 4.3 PyrimidRouter.sol

**Forked from:** Fluencr `Affiliate.sol` + `PayoutDistributioner.sol`

The commission splitting engine. Fluencr's equivalent was ~140 lines across 4 distribution functions handling Base/Gold tier branching. PyrimidRouter is ~40 lines, one path.

```
routePayment(vendorId, productId, affiliateId, buyer):
  1. Validate vendor active + product active
  2. Calculate: platformFee (1%) + affiliateCommission (X%) + vendorShare (remainder)
  3. Transfer USDC: buyer → treasury, buyer → affiliate, buyer → vendor
  4. Record affiliate stats + update reputation
  5. Emit PaymentRouted event
```

Anti-sybil checks:
- Buyer cannot be the affiliate (`SelfPurchaseNotAllowed`)

### 4.4 PyrimidTreasury.sol

**New contract (not forked)**

Protocol operations fund. Accumulates 1% fee from every sale. Funds protocol operations — infrastructure, development, growth.

- `allocate(to, amount, purpose)` — every allocation logged onchain with purpose string
- `balance()` — check available funds
- Governance: v1 owner-controlled, future DAO

### 4.5 IPyrimid.sol

Protocol interface defining the `Product` struct: id, endpoint, description, priceUsdc, affiliateBps, active. Vendors implement this interface.

### 4.6 Deployment

```
Chain: Base mainnet
USDC: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
ERC-8004 Identity Registry: 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432

Deploy order:
1. PyrimidRegistry(erc8004RegistryAddress)
2. PyrimidCatalog(registryAddress)
3. PyrimidTreasury(usdcAddress)
4. PyrimidRouter(usdcAddress, registryAddress, catalogAddress, treasuryAddress)
5. registry.setRouter(routerAddress)
```

---

## 5. Proprietary SDK (`@pyrimid/sdk`)

**Not open-source.** The SDK is the competitive moat. Contracts are visible on BaseScan; the SDK is what makes them usable.

### 5.1 PyrimidResolver (Path 1: Embedded Distribution)

Highest leverage integration. Developer embeds this as the default service resolution layer in their agent framework. Every agent on their stack routes purchases through the Pyrimid catalog with the developer's affiliate ID.

```typescript
const resolver = new PyrimidResolver({ affiliateId: 'af_dev_id' });
const match = await resolver.findProduct("trading signals");
if (match) await resolver.purchase(match, agentWallet);
```

Features:
- `findProduct(need)` — keyword matching against catalog descriptions, tags, categories
- `findProducts(need, limit)` — multiple results, sorted by relevance + trust
- `findByCategory(category)` — category-based filtering
- `purchase(product, wallet)` — handles full x402 payment flow with affiliate attribution
- `getCatalog()` — cached catalog with configurable TTL
- Prefers ERC-8004 verified vendors by default
- Configurable max price filter

### 5.2 Pyrimid MCP Server (Path 2: MCP Recommender)

Factory function for deploying MCP servers wrapping the Pyrimid catalog. Three deployment modes:

```typescript
// Mode 1: Official (treasury affiliate)
const server = createPyrimidMcpServer();

// Mode 2: Custom affiliate (your earnings)
const server = createPyrimidMcpServer({ affiliateId: 'af_your_id' });

// Mode 3: Specialized vertical
const server = createPyrimidMcpServer({
  affiliateId: 'af_your_id',
  serverName: 'trading-recommender',
});
```

MCP tools exposed:
- `pyrimid_browse` — search catalog by query, price, verified status
- `pyrimid_buy` — purchase a product with x402 payment
- `pyrimid_preview` — preview payment split without buying
- `pyrimid_categories` — list all product categories with counts
- `pyrimid_register_affiliate` — register as an affiliate

### 5.3 Vendor Middleware

10-line integration for vendors to activate affiliate distribution:

```typescript
import { pyrimidMiddleware } from '@pyrimid/sdk';
app.use(pyrimidMiddleware({
  vendorId: 'vn_your_id',
  products: {
    'your-endpoint': { price: 250000, affiliateBps: 2000 }
  }
}));
```

Handles: x402 402 response, payment verification via CommissionRouter, affiliate ID extraction from `X-Affiliate-ID` header, commission splitting, content serving after verified payment.

---

## 6. Programmatic Distribution Model

All distribution is agent-to-agent via MCP and SDK. No social media. No human funnels. No content marketing.

### 6.1 Path 1: Embedded Resolver (Highest Leverage)

Developer includes `PyrimidResolver` in their agent framework as the default service resolution layer. Every agent built on that framework routes purchases through Pyrimid with the developer's affiliate ID. One integration → thousands of passive attributed purchases.

**Target frameworks:**
1. LangChain / LangGraph (34.5M monthly downloads, 400+ companies in production)
2. CrewAI (multi-agent teams, visual workflow builder)
3. Vercel AI SDK / Mastra (20M+ downloads, native x402-mcp support)
4. Dify (129K GitHub stars, low-code tool addition via UI)
5. AutoGen (Microsoft, multi-agent collaboration)
6. n8n (open-source automation, 400+ integrations)
7. LlamaIndex (RAG-focused, data-heavy agents)
8. OpenClaw (Rizz's own framework, first reference implementation)
9. Semantic Kernel (Microsoft enterprise SDK)
10. AutoGPT / AgentGPT (prototyping community)

**This is the primary affiliate recruitment strategy.** The "affiliate" is a developer. The "sales" happen through their agents automatically.

### 6.2 Path 2: MCP Recommender (Medium Leverage)

Deploy an MCP server wrapping the Pyrimid catalog. Other agents connect as a tool, browse, buy — affiliate ID on every transaction. Specialization wins: curate for a vertical (trading, data, AI tools) to outperform the generic catalog.

**Competition is:** whose MCP server do agents connect to for discovery? The official Pyrimid server, or a specialized third-party one with better curation?

### 6.3 Path 3: Composable Wrapper (Niche Leverage)

Buy raw products, enhance with own logic, resell enhanced version on Pyrimid. Both buyer and vendor. Creates composable commerce — products built on products. Deferred to Phase 2.

### 6.4 The Pyrimid MCP Server as Primary Distribution

The official Pyrimid MCP server (hosted on Vercel) is itself the biggest distribution channel. It aggregates the entire catalog and exposes it as MCP tools. Default affiliate attribution goes to the protocol treasury. Third-party affiliates compete by deploying their own MCP servers with their own affiliate IDs.

**Competitive landscape:** MCPize, MCP Hive, Apify, and Masumi all solve vendor monetization (how vendors get paid). None solve vendor distribution (how vendors get MORE agents buying). Pyrimid adds the distribution incentive layer on top of existing monetization infrastructure. They are complementary, not competitive.

---

## 7. Products on the Platform

Pyrimid is product-agnostic. Anything delivered over HTTP and priced in USDC can be listed. Vendors set their own prices ($0.001 to $1,000+) and commission rates (5-50%).

**Categories observed in the x402/MCP ecosystem:**
Trading signals, data feeds, AI generation (image/video/text/code), search and scraping, security and compliance, compute and inference, research and reports, blockchain tools, developer APIs, content and media, analytics, NLP and embeddings, monitoring, testing and QA, storage and retrieval.

### 7.1 Genesis Product: Trading Brain Signals

Rizz's proprietary BTC perpetual futures trading signals are the first product on the platform. This bootstraps the network with real transactions from day one. Rizz is both the protocol operator AND the first vendor — zero cold-start coordination required.

**Genesis products:**
- Signals API ($0.25/call, 20% commission)
- Indicator downloads ($5.00/each, 20%)
- Methodology modules ($2.00-$50.00, 20%)
- Complete bundle ($200, 20%)
- Monthly subscription ($75/mo, 20% first month only)

**Signal quality gate (MANDATORY — DO NOT SKIP):** Signals must demonstrate >55% win rate, >2.0 average R:R, and positive PnL over 90 consecutive days of paper trading before the genesis product goes live.

### 7.2 Vendor Recruitment Targets

Vendor #2 and #3 recruited from the existing x402 ecosystem before launch:
- Data/intelligence API (e.g. Prixe stock price API, Moltbook intelligence feeds)
- AI generation service (image gen, video gen endpoints already on x402)

Pitch: "Your product is already indexed in the Pyrimid catalog from Bazaar. Install the SDK and agents will actively promote it — you only pay when they deliver a sale."

---

## 8. Affiliate System

### 8.1 Registration

Permissionless. Any agent calls `registerAffiliate()`. Free (gas only, ~$0.01 on Base). Receives soulbound ERC-721 NFT + unique affiliate ID. Optional: pass `referredBy` to credit an existing affiliate.

### 8.2 Commission

Per-product, set by vendor. Range: 5-50% (enforced by contract). Different products from different vendors pay different rates. Affiliate earns across all vendors with one ID.

### 8.3 Reputation

Onchain score (0-10,000) updated on every sale:
- Sales count: 30 pts per sale, max 3,000
- Unique buyers: 50 pts per buyer, max 2,500
- Vendor diversity: 300 pts per vendor served, max 1,500
- ERC-8004 verified: flat 2,000
- Volume bonus: 1 pt per $10 volume, max 1,000

Higher reputation → priority in catalog discovery → vendors offer better commissions to top-ranked agents → compounding advantage.

### 8.4 ERC-8004 Identity

Optional but strongly incentivized. Agents link their ERC-8004 agentId via `linkERC8004Identity(agentId)`. Benefits:
- +2,000 reputation points
- Priority placement in catalog discovery
- Vendors can filter for verified-only affiliates
- Portable reputation across the agent ecosystem
- Composable identity — Pyrimid performance enriches the 8004 profile

Roadmap: Optional at launch → increasingly advantageous → eventually required for affiliate registration as the agent economy matures.

---

## 9. Revenue Model

### 9.1 Protocol Revenue

1% of every transaction. Examples at scale:

| Monthly Volume | Protocol Revenue |
|---------------|-----------------|
| $10,000 | $100 |
| $100,000 | $1,000 |
| $1,000,000 | $10,000 |

### 9.2 Genesis Vendor Revenue (Trading Brain)

Rizz earns from both sides — protocol treasury (1%) + vendor share (~79%) on his own products.

| Daily Signal Volume | Monthly Gross | Net to Rizz (after 20% affiliate + 1% protocol) |
|--------------------|--------------|------------------------------------------------|
| 100 calls | $750 | $593 |
| 1,000 calls | $7,500 | $5,925 |
| 10,000 calls | $75,000 | $59,250 |

### 9.3 Affiliate Revenue

Varies by product and vendor commission rates. An affiliate embedded in a popular framework generating 1,000 attributed purchases per month across products averaging $0.50 with 20% commission = $100/month passive income from one integration.

---

## 10. Technical Stack

### 10.1 Protocol (Onchain)

| Component | Chain | Source |
|-----------|-------|--------|
| PyrimidRegistry.sol | Base mainnet | Fork Fluencr Base.sol |
| PyrimidCatalog.sol | Base mainnet | Fork Fluencr Vendor.sol |
| PyrimidRouter.sol | Base mainnet | Fork Fluencr Affiliate.sol (major rewrite) |
| PyrimidTreasury.sol | Base mainnet | New |
| Settlement | USDC on Base | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |

### 10.2 Platform Services (Proprietary)

| Component | Tech | Notes |
|-----------|------|-------|
| `@pyrimid/sdk` | TypeScript (npm) | Vendor middleware + PyrimidResolver + MCP server factory |
| Pyrimid MCP Server | Vercel | Official catalog, all products as paid MCP tools |
| Catalog API | Vercel (Next.js) | REST endpoint aggregating from subgraph + external registries |
| Subgraph | The Graph (Base) | Indexes all contract events |
| Catalog Aggregator | Cron service | Indexes products from Bazaar, MCPize, MCP Hive, Apify |

### 10.3 Genesis Vendor (Trading Brain)

| Component | Tech | Notes |
|-----------|------|-------|
| Product Gateway | Next.js on Vercel | Existing infrastructure |
| x402 + Pyrimid Middleware | `@x402/express` + `@pyrimid/sdk` | Payment routing through CommissionRouter |
| Signal Source | TradingView webhooks → Turso | Existing pipeline |
| Domain | brain.perpetuals.trading | Existing |

---

## 11. Anti-Gaming

### Wash Trading
- Each buyer wallet attributed to max one affiliate per product per 30-day window
- Affiliates need 5+ unique buyer wallets for reputation tier benefits
- Velocity checks: >50% of sales from <3 wallets → flagged

### Signal-Specific (Genesis Product)
- Signed responses with wallet-specific nonce
- Watermarked payloads with wallet identifiers
- `expires_at` timestamps (stale data worthless)
- Rate limiting per wallet

---

## 12. Build Phases

### Phase 0: Signal Quality Gate (CURRENT)
- Trading Brain must pass: >55% win rate, >2.0 avg R:R, positive PnL over 90 days
- Protocol development can proceed in parallel, but genesis product does not go live until gate passes

### Phase 1: Genesis Launch (4-5 weeks)

**Weeks 1-2: Contracts + Testing**
- Fork Fluencr → PyrimidRegistry, PyrimidCatalog, PyrimidRouter, PyrimidTreasury
- Deploy on Base Sepolia testnet
- Write tests (Hardhat/Foundry): full flow from registration → listing → purchase → split
- Internal audit

**Weeks 2-3: SDK + Integration**
- Build `@pyrimid/sdk`: vendor middleware, PyrimidResolver, MCP server factory
- Integrate Trading Brain as genesis vendor on testnet
- Deploy Pyrimid MCP server on Vercel (testnet)
- Begin vendor #2/#3 outreach

**Weeks 3-4: Affiliate Recruitment**
- Deploy reference affiliate agents (Rizz's own agents)
- Open "Genesis Affiliate" program — first 30 affiliates get priority status
- Target x402 builders, ERC-8004 registered agents, framework developers
- Close vendor #2 and #3 SDK integration

**Week 5: Mainnet Launch**
- Deploy contracts to Base mainnet, verify on BaseScan
- Register Trading Brain + vendor #2 + vendor #3
- Migrate Genesis Affiliates to mainnet
- Announce: x402 Discord, ERC-8004 community, framework communities
- Monitor first 48 hours

### Phase 2: Growth (Months 2-3)
- Build catalog aggregator (index from Bazaar, MCPize, MCP Hive, Apify)
- Deploy subgraph for onchain analytics
- Build Catalog API (REST, aggregated from subgraph + external registries)
- Onboard 2-3 additional vendors using aggregation funnel
- Target: 50+ affiliates, 5+ SDK-integrated vendors, 200+ indexed products

### Phase 3: Scale (Months 4-6)
- Subscription product support (x402 V2 session-based access)
- Volume-based reputation tiers with vendor-side benefits
- Evaluate Solana expansion
- LI.FI integration for multi-venue trading agent architecture
- Target: 200+ affiliates, 20+ vendors, $100K+ monthly volume

### Phase 4: Protocol Maturity (Month 6+)
- Governance formalization (fee parameters, commission ranges)
- ERC-8004 identity increasingly required
- Cross-chain deployment
- Consider token (only if clear utility)

---

## 13. Go-To-Market Strategy

### 13.1 Vendor Recruitment

**Genesis vendor (Rizz):** Locked in. Zero coordination.

**Vendor #2/#3:** Recruited from x402 ecosystem before launch. Direct DM to builders. White-glove integration support. Pitch: "Your product is already indexed in Pyrimid. Install the SDK and agents will actively promote it."

### 13.2 Affiliate Recruitment (100 agents at launch)

All programmatic channels. No social media marketing.

| Channel | Target | Mechanism |
|---------|--------|-----------|
| Framework developers (embed SDK) | 30 | PyrimidResolver as default service layer |
| MCP recommender operators | 10 | Deploy custom MCP servers with affiliate IDs |
| ERC-8004 verified agents | 20 | Link identity, get priority |
| x402 ecosystem builders | 20 | Already understand agent payments |
| Organic (reputation + catalog growth) | 20 | Network effects as catalog and volume grow |

### 13.3 Three Reference Agents at Launch

**Agent 1: Pyrimid Official MCP Server** — Canonical catalog. All products as paid tools. Default affiliate → treasury. Hosted on Vercel.

**Agent 2: Trading-Focused Recommender** — Specialized vertical MCP server. Rizz's personal affiliate ID. Proves third-party affiliate model works.

**Agent 3: General Discovery Agent** — Curated recommender competing with raw catalog. Tests whether curation adds measurable value. Separate affiliate ID.

### 13.4 Success Criteria

**Launch successful (30 days):**
- 1+ vendor beyond Trading Brain live with affiliate-driven sales
- 20+ unique affiliate wallets earning commissions
- 100+ unique buyer wallets purchasing products
- $50+ in protocol treasury (implies $5,000+ volume)

**Product-market fit (90 days):**
- Vendors report affiliate sales as incremental
- New vendors requesting to join without outbound recruitment
- New affiliates registering organically (reputation system drives growth)
- Affiliate-attributed sales >50% of total volume

---

## 14. Legal

- **Not MLM.** One-layer affiliate. Commission from product sales only. No recruitment income. No depth.
- **UAE/VARA.** Genesis product (trading signals) framed as data/information, not investment advice. Consult VARA lawyer before launch.
- **Platform liability.** Pyrimid routes payments, doesn't host products. Vendors responsible for delivery and quality.
- **Affiliate disclosure.** Registration terms require disclosure of commercial relationship.
- **SDK licensing.** Source-available, non-commercial. Contracts on BaseScan are public (unavoidable). SDK, MCP server, Catalog API, and aggregation logic are proprietary.

---

## 15. Competitive Landscape

| | Pyrimid | x402 Bazaar | MCPize | MCP Hive | Apify |
|---|---|---|---|---|---|
| **What it does** | Distribution + commissions | Discovery | Hosting + billing | Marketplace | Hosting + billing |
| **Affiliate layer** | Yes (onchain) | No | No | No | No |
| **Aggregates others** | Yes | No | No | No | No |
| **Agent-native** | MCP + SDK | MCP | MCP | MCP | MCP |
| **Fee model** | 1% protocol | Facilitator fee | 15% take rate | Per-transaction | Per-event |
| **Commission splitting** | Onchain, instant | N/A | N/A | N/A | N/A |
| **Reputation** | Onchain (ERC-8004) | N/A | Ratings | N/A | Ratings |

**Pyrimid's unique position:** The affiliate/distribution layer that sits on top of all existing agent commerce infrastructure. Not competing on hosting, billing, or discovery — adding the incentive layer that makes agents actively distribute rather than passively list.

---

## 16. Budget

| Item | Cost |
|------|------|
| Base mainnet deployment gas | ~$50 |
| Domain | ~$30 |
| Vercel hosting | $0-$20/mo |
| Marketing | $0 (organic) |
| **Total launch** | **~$100** |

Revenue from day one (1% of volume + genesis vendor earnings) funds ongoing operations.

---

## 17. File Inventory

### Contracts (public on BaseScan after deploy)
- `PyrimidRegistry.sol` — Affiliate + vendor registration, ERC-8004, reputation
- `PyrimidCatalog.sol` — Product listings, pricing, commission rates
- `PyrimidRouter.sol` — Commission splitting engine
- `PyrimidTreasury.sol` — Protocol operations fund
- `IPyrimid.sol` — Protocol interface

### SDK (proprietary)
- `resolver.ts` — PyrimidResolver for embedded framework distribution
- `mcp-server.ts` — MCP server factory for recommender deployment
- Vendor middleware (to be built in Phase 1)

### Documentation
- `pyrimid-spec-v0.2.md` — This document (master spec)
- `pyrimid-fluencr-fork-plan.md` — Detailed contract fork plan from Fluencr
- `pyrimid-gtm-strategy.md` — Go-to-market (to be updated with this spec)
- `pyrimid-agent-distribution.md` — Programmatic distribution architecture
- `pyrimid-landing-v6.html` — Landing page (current version)

---

## 18. Open Questions for v0.3

1. **Contract audit:** Budget and timeline? Community audit via Genesis Affiliates, or professional?
2. **Domain:** pyrimid.xyz? pyrimid.io? Secure before public launch.
3. **Catalog aggregator implementation:** Cron job scraping registries, or real-time API queries? Rate limits from external registries?
4. **Subgraph hosting:** The Graph hosted service vs. self-hosted? Cost at scale?
5. **Vendor approval for aggregation:** Can we index products from MCPize/Bazaar without explicit vendor consent? Legal/ethical implications?
6. **Token:** Is there ever a utility case? Governance token for fee parameter control? Staking for premium catalog placement? Likely too early — revisit at $100K+ monthly volume.
7. **Proxy (deferred):** At what scale does the zero-integration proxy path for vendors become worth building? What's the trigger?
8. **Cross-chain:** When does Solana support ship? Depends on x402 V2 Solana tooling maturity.

---

*This is the single source of truth for Pyrimid. All previous AAN and Pyrimid documents are superseded. v0.3 will incorporate contract audit results, domain selection, and aggregator implementation details.*
