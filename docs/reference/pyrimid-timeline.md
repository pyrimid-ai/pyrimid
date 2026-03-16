# Pyrimid — Build Timeline

## Now: Signal Quality Gate
Paper trade Trading Brain signals. Track win rate, R:R, PnL daily.
Target: >55% win rate, >2.0 R:R, positive PnL over 90 days.
**Everything below runs in parallel. Genesis product doesn't go live until gate passes.**

---

## Week 1–2: Contracts
- Fork Fluencr → 4 Pyrimid contracts
- Write tests (full flow: register → list → buy → split → reputation update)
- Deploy to Base Sepolia testnet
- Internal audit

## Week 2–3: SDK + MCP Server
- Build `@pyrimid/sdk` (vendor middleware, PyrimidResolver, MCP server factory)
- Deploy Pyrimid MCP server on Vercel (testnet)
- Integrate Trading Brain as genesis vendor on testnet
- Test end-to-end: agent connects to MCP → browses → buys → commission splits

## Week 3–4: Recruit
- DM vendor #2 and #3 from x402 ecosystem, help with SDK integration
- Open Genesis Affiliate program (target: 30 early affiliates)
- Deploy 3 reference agents (official MCP server, trading recommender, general discovery)
- Post tutorial in x402 Discord, ERC-8004 community, LangChain/CrewAI/AI SDK channels

## Week 5: Launch
- Deploy contracts to Base mainnet, verify on BaseScan
- Register genesis vendor + vendor #2 + vendor #3
- Migrate affiliates to mainnet
- Announce publicly
- Monitor 48 hours

---

## Month 2–3: Grow
- Build catalog aggregator (index from Bazaar, MCPize, MCP Hive, Apify)
- Deploy subgraph for onchain analytics
- Build Catalog API
- Onboard more vendors using aggregation funnel ("you're already indexed, install SDK to activate")
- Target: 50+ affiliates, 5+ vendors

## Month 4–6: Scale
- Subscription support
- Reputation tier benefits for vendors
- Evaluate Solana
- LI.FI integration
- Target: 200+ affiliates, 20+ vendors, $100K+ monthly volume

## Month 6+: Protocol
- Governance formalization
- ERC-8004 increasingly required
- Cross-chain
- Target: self-sustaining protocol

---

**Total launch cost: ~$100**
**Time to mainnet: ~5 weeks**
**Revenue: from day one**
