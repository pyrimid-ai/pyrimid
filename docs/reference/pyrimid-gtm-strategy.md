# Pyrimid — Go-To-Market Strategy

**Date:** March 13, 2026  
**Objective:** Launch with real volume. 100 affiliate agents + 3 vendors + live transactions on day one.  
**Timeline:** 6 weeks pre-launch prep → launch day → 90-day growth phase

---

## 1. The Cold Start Problem (And How We Solve It)

Pyrimid is a two-sided network. Affiliates need products to sell. Vendors need affiliates to drive sales. Neither shows up if the other side is empty.

The solution has three parts:

**Part A:** Rizz is Vendor #1 (Trading Brain). This is locked in. Zero coordination required.

**Part B:** Recruit Vendor #2 and #3 from the existing x402 ecosystem BEFORE launch. These are services already live on Bazaar, already accepting x402 payments, already serving agents. They just need to add the Pyrimid SDK to get an affiliate salesforce they don't currently have.

**Part C:** Seed the first 100 affiliate agents through a structured launch program — not by waiting for organic discovery, but by actively deploying and recruiting agent builders during the pre-launch window.

---

## 2. Vendor Recruitment (Pre-Launch: Weeks 1-4)

### Vendor #1: Trading Brain (Rizz)

Already built. Genesis product. Ships with the protocol.

Products: BTC signals ($0.25, 20% commission), indicators ($5, 20%), methodology ($2-$50, 20%), bundle ($200, 20%), subscription ($75/mo, 20% first month).

### Vendor #2 Target: Data/Intelligence API

From the x402 ecosystem, the best targets are services that sell data feeds agents already consume:

**Primary target: Prixe (stock price API)**
- Already on x402 Bazaar, already serving agents
- Their product (financial data) is complementary to Trading Brain signals — same buyer persona
- They get zero distribution help from Bazaar today — listing is passive
- Pitch: "Your API is already live on x402. Add 10 lines of our SDK and 50+ agent affiliates will actively promote it. You set the commission — we suggest 15%. You only pay when they deliver a buyer."

**Backup targets:**
- Moltbook intelligence feeds (community digests, GitHub trending, Polymarket data) — already on x402
- Web content fetching services (metadata/content extraction APIs) — already on x402
- Any AI-powered compliance/scoring APIs — already on x402

**Approach:** Direct DM to the builders on X/Discord. These are small teams building on x402 — they're accessible. The pitch is simple: free distribution. No cost unless it works.

### Vendor #3 Target: AI Tool/Generation Service

Target an image generation, video generation, or AI inference endpoint from the x402 ecosystem:

**Primary target:** One of the image/video gen services listed on x402.org/ecosystem
- These have high per-call margins (image gen is cheap to run, easy to charge $0.05-$0.50)
- Broad appeal — many different types of agents need image generation
- Diversifies the catalog beyond trading/finance

**Approach:** Same as Vendor #2 — direct outreach, "free distribution" pitch.

### Vendor Recruitment Timeline

| Week | Action |
|------|--------|
| Week 1 | Identify top 5 x402 services by transaction volume (use x402scan) |
| Week 1 | Draft vendor pitch deck (1-pager: what Pyrimid is, what they get, how to integrate) |
| Week 2 | DM/email top 5 vendors. Offer hands-on integration support. |
| Week 3 | Close Vendor #2. Begin SDK integration together. |
| Week 4 | Close Vendor #3. Both vendors tested on Base Sepolia. |
| Launch | All 3 vendors live with products in the catalog. |

### What Vendors Get (The Pitch)

1. **Access to Pyrimid's affiliate network** — agents actively looking for products to sell
2. **Hands-on integration support** — Rizz personally helps with SDK setup (for the first 3 vendors this is a white-glove experience)
3. **Featured placement** — first 3 vendors are genesis partners, permanently featured in the catalog
4. **Zero upfront cost** — they only pay commission when affiliates deliver real sales
5. **Data: proof of incremental revenue** — after 30 days, show them the split between direct sales (no affiliate) and affiliate-driven sales to prove Pyrimid's value

---

## 3. Affiliate Agent Recruitment (Pre-Launch: Weeks 3-6)

### Strategy: The "First 100" Program

Don't wait for agents to find Pyrimid organically. Run a structured pre-launch program that gets 100 agent wallets registered as affiliates before launch day.

### Channel 1: X3P0 / ClawdBot (Affiliates #1-3)

Deploy Rizz's own agents as the first affiliates. X3P0 (AOTM agent) and ClawdBot become the reference implementation — they register, browse the catalog, promote products on X/Telegram, and earn commissions. This creates:
- Proof that the system works end-to-end
- Real transaction data for the pitch to other agent builders
- Content (posts, tweets) that other builders see and want to replicate

### Channel 2: x402 Ecosystem Builders (Affiliates #4-30)

The x402 ecosystem has 251+ services built by developers who understand agent payments. Many of these builders also run their own agents. Target them directly:

**Where to find them:**
- x402 Discord (the core community)
- Base builder communities
- The x402-discovery-mcp GitHub repo contributors
- x402scan active sellers (they already have agent infrastructure)

**Pitch:** "You already build on x402. Now your agents can earn USDC by selling products in the Pyrimid catalog. Register takes one contract call. Start earning immediately."

**Incentive:** First 30 affiliates registered before launch get "Genesis Affiliate" status — permanent badge, priority in catalog discovery, direct Telegram group with Rizz for support.

### Channel 3: ERC-8004 Registered Agents (Affiliates #31-60)

There are 49,000+ ERC-8004 registered agents on EVM chains, with the Identity Registry live on Base. Target agent builders who have already registered their agents with ERC-8004 identity:

**Where to find them:**
- ERC-8004 Discord / community calls
- Chitin (ERC-8004 identity layer on Base) users
- AgentStore (open-source marketplace using ERC-8004 + x402) builders
- ERC-8004 GitHub contributors and early adopters

**Pitch:** "Your agent already has an onchain identity. Link it to Pyrimid and get priority placement — verified agents appear first in vendor selection. Start earning USDC selling digital products."

**Why this works:** These are the most sophisticated agent builders. They've already invested in agent identity infrastructure. Pyrimid gives their identity a monetization use case — verified agents earn more because vendors prefer them.

### Channel 4: Agent Framework Communities (Affiliates #61-100)

Target developers building agents with popular frameworks who want a monetization layer:

**Communities:**
- LangChain / LangGraph Discord (largest agent dev community)
- CrewAI community
- AutoGen/AG2 community  
- Vercel AI SDK builders (they already know x402-mcp)
- Swarms.world users

**Pitch:** "Your agents do tasks. Now they can also earn. Add 5 lines of Pyrimid SDK and your agent can sell any product in the catalog — signals, data feeds, AI tools. Commission in USDC, settled instantly on Base."

**Content strategy:** Write a tutorial — "How to Build an Agent That Earns USDC with Pyrimid" — and post it in these communities. Include working code. Make it a 10-minute integration. Developers follow tutorials; they don't follow pitch decks.

### Channel 5: Crypto Trading Communities (Affiliates for Trading Brain specifically)

For the genesis product specifically, target communities where people already discuss trading signals:

**Communities:**
- Hyperliquid Discord / Telegram
- Trading-focused X accounts that post analysis
- TradingView Pine Script developer community
- Crypto alpha groups on Telegram

**Pitch:** "Earn 20% commission ($0.05/signal) for every trader or trading bot you send to Trading Brain's signals API. Signals are x402-gated, commission is instant, onchain, in USDC."

This channel targets humans and human-operated bots rather than pure AI agents, but it drives real transaction volume that makes the protocol metrics attractive to future vendors and agent builders.

### Affiliate Recruitment Timeline

| Week | Action | Target |
|------|--------|--------|
| Week 3 | Deploy X3P0/ClawdBot as first affiliates | 3 affiliates |
| Week 3 | Post in x402 Discord, announce "First 100" program | 10 affiliates |
| Week 4 | DM top ERC-8004 builders, post in 8004 community | 20 affiliates |
| Week 4 | Publish tutorial in LangChain/CrewAI/AI SDK communities | 15 affiliates |
| Week 5 | Engage Hyperliquid/trading communities for genesis product | 20 affiliates |
| Week 5 | Run "Genesis Affiliate" registration push (X thread, Telegram) | 20 affiliates |
| Week 6 | Final push: DM stragglers, help with integrations | 12 affiliates |
| **Launch** | **100 registered affiliates, 30+ with ERC-8004 verification** | **100 total** |

---

## 4. Pre-Launch Sequence (6 Weeks)

### Week 1-2: Build

- Deploy contracts to Base Sepolia testnet
- Build SDK (vendor middleware + affiliate tools)
- Integrate Trading Brain as genesis vendor on testnet
- Begin vendor outreach (Vendor #2, #3)

### Week 3: Soft Announce

- Deploy X3P0/ClawdBot as test affiliates on Sepolia
- Run full flow: register → list → buy → split → verify on testnet
- Announce "First 100" program in x402 Discord
- Create Genesis Affiliate Telegram group
- Publish the tutorial: "Build an Agent That Earns with Pyrimid"

### Week 4: Recruit

- Close Vendor #2 and #3 integration
- Active DM campaign to ERC-8004 builders
- Post tutorial in agent framework communities
- Help early affiliates test on Sepolia
- Target: 50 registered affiliates on testnet

### Week 5: Mainnet Prep

- Deploy contracts to Base mainnet
- Audit contracts (internal review + community review via Genesis Affiliates)
- Register Trading Brain + Vendor #2 + Vendor #3 on mainnet
- Fund treasury with initial USDC for discovery bonuses ($500 = 100 bonuses)
- Run test transactions on mainnet with small amounts
- Engage trading communities for genesis product push

### Week 6: Launch Week

- Open mainnet registration for all affiliates
- Migrate Genesis Affiliates from testnet to mainnet
- X3P0/ClawdBot begin live affiliate promotion
- Announce publicly: X thread, x402 Discord, ERC-8004 community, agent framework channels
- Monitor first 48 hours of live transactions
- Be available 24/7 in Genesis Affiliate Telegram for support

---

## 5. Launch Day Checklist

**Contracts:**
- [ ] PyrimidRegistry deployed on Base mainnet, verified on BaseScan
- [ ] PyrimidCatalog deployed, verified
- [ ] PyrimidRouter deployed, verified
- [ ] PyrimidTreasury deployed, funded with $500 USDC for discovery bonuses
- [ ] Router address set in Registry
- [ ] Treasury approved Router for USDC spending

**Vendors:**
- [ ] Trading Brain registered as Vendor #1, all products listed
- [ ] Vendor #2 registered, products listed
- [ ] Vendor #3 registered, products listed
- [ ] All vendor x402 endpoints tested and live

**Affiliates:**
- [ ] 100 affiliates registered (wallets + affiliate IDs)
- [ ] 30+ with ERC-8004 identity linked
- [ ] X3P0/ClawdBot actively promoting
- [ ] Genesis Affiliate Telegram active

**Discovery:**
- [ ] All products auto-listed on x402 Bazaar
- [ ] Products registered on community discovery index
- [ ] MCP server live on Vercel with all products as paid tools
- [ ] Catalog API live and serving product data
- [ ] .well-known/x402.json hosted on all vendor domains

**Content:**
- [ ] Tutorial published and distributed
- [ ] X thread announcing launch
- [ ] SDK published on npm (private, invited access for first 100)

---

## 6. Post-Launch: 90-Day Growth Targets

### Month 1: Prove the Model

**Metrics:**
- 100+ active affiliates (at least 1 sale each)
- 3 vendors live
- $5,000+ in total platform volume
- $50+ in platform treasury (1%)
- 10+ affiliates earning >$10/month

**Actions:**
- Daily monitoring of transaction flow
- Weekly report to Genesis Affiliates (volume, commissions, top earners)
- Gather vendor feedback (is affiliate traffic incremental?)
- Fix any SDK bugs or integration issues
- Begin vendor #4-5 outreach using Month 1 data as proof

### Month 2: Scale Affiliates

**Metrics:**
- 300+ registered affiliates
- 5+ vendors
- $25,000+ monthly volume
- 50+ affiliates with ERC-8004 verification

**Actions:**
- Publish case study: "How Agent X earned $Y in Month 1 on Pyrimid"
- Open SDK access beyond invited Genesis Affiliates
- Launch referral push: discovery bonuses drive affiliate-to-affiliate recruitment
- Explore integration with Virtuals Protocol agent ecosystem (18,000+ agents on Base)
- Begin building the Pyrimid Catalog web interface (for humans who want to see what's available)

### Month 3: Protocol Traction

**Metrics:**
- 500+ affiliates
- 10+ vendors
- $100,000+ monthly volume
- $1,000+ monthly protocol revenue

**Actions:**
- Publish protocol metrics publicly (volume, vendors, affiliates, commissions)
- Approach x402 Foundation about integration/partnership
- Evaluate Solana expansion based on x402 V2 multi-chain tooling
- Begin governance discussion: who controls fee parameters?
- Consider token? (Only if clear utility — probably too early)

---

## 7. Budget

| Item | Cost | Notes |
|------|------|-------|
| Treasury seed (discovery bonuses) | $500 | 100 × $5 bonuses |
| Base mainnet deployment gas | ~$50 | 4 contracts + setup txs |
| Domain (pyrimid.xyz or similar) | ~$30 | Annual |
| Vercel hosting (MCP server + API) | $0-$20/mo | Free tier likely sufficient early |
| Marketing spend | $0 | All organic: DMs, community posts, tutorials |
| **Total launch cost** | **~$600** | |

This is intentionally lean. The protocol earns from day one (1% of volume). The genesis product earns from day one (79% of signal sales). There's no fundraise, no token, no runway concern. Revenue funds growth.

---

## 8. Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Can't close Vendor #2/#3 before launch | Medium | Medium | Launch with Trading Brain only. The protocol still works with one vendor. Vendor recruitment continues post-launch with real transaction data as proof. |
| <100 affiliates at launch | Medium | Low | Quality > quantity. Even 20 active affiliates with real sales is enough to prove the model. The "100" target is aspirational, not gating. |
| Signal quality gate not passed | High (currently) | Critical | DO NOT SKIP. If signals aren't proven profitable, don't launch the genesis product. Focus on contract deployment and vendor #2/#3 while continuing signal development. |
| Smart contract bug | Low | Critical | Testnet extensively. Internal audit. Community review via Genesis Affiliates. Start with small-value products ($0.25 signals). Treasury starts small ($500). |
| x402 ecosystem changes | Low | Medium | Pyrimid wraps x402, doesn't depend on specific x402 internals. If Bazaar changes, the SDK adapts. Contracts are independent. |
| Affiliate gaming (wash trades) | Medium | Medium | Anti-sybil rules in contracts. Manual monitoring in Month 1. Velocity checks. Minimum buyer diversity for tier upgrades. |

---

## 9. Success Criteria

**Launch is successful if, within 30 days:**
1. At least 1 vendor beyond Trading Brain is live and receiving affiliate-driven sales
2. At least 20 unique affiliate wallets have earned commissions
3. At least 100 unique buyer wallets have purchased products
4. The treasury has accumulated >$50 in protocol fees (implies $5,000+ volume)
5. Zero critical contract bugs or exploits

**The protocol has product-market fit if, within 90 days:**
1. Vendors report that affiliate-driven sales are incremental (not cannibalizing direct sales)
2. Affiliates are earning enough to justify their compute/operational costs
3. New vendors are requesting to join without outbound recruitment
4. New affiliates are registering via the discovery bonus mechanism (organic growth)

---

*This GTM strategy is the operational companion to the Pyrimid v0.1 spec. Execute in parallel with contract development and SDK build.*
