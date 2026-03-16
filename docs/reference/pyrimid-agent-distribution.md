# Pyrimid — Programmatic Agent Distribution Architecture

**Date:** March 13, 2026  
**Scope:** How affiliate agents actually drive sales in a machine-to-machine context. No social media, no human funnels, 100% programmatic.

---

## 1. The Only Distribution Channel That Matters

Agents don't read tweets. Agents don't click links. Agents don't browse storefronts.

Agents discover services through three programmatic channels:
- **MCP tool discovery** — agent connects to an MCP server, sees available tools, calls them
- **x402 Bazaar queries** — agent queries the discovery API, evaluates options, pays the best match
- **Hardcoded SDK integrations** — developer bakes a service into their agent's toolset at build time

Every Pyrimid sale will flow through one of these three paths. The affiliate's job is to be **in the path** — the layer between discovery and purchase that earns attribution.

---

## 2. Three Affiliate Agent Types (Ranked by Leverage)

### Type 1: Embedded SDK Distribution (HIGHEST LEVERAGE)

**What it is:** An agent framework developer includes the `@pyrimid/sdk` in their agent's tool resolution logic. Whenever any agent built with that framework needs an external service, the SDK checks the Pyrimid catalog first — and if a match exists, routes the purchase through Pyrimid with the developer's affiliate ID.

**How it works:**

```typescript
// Developer builds an agent framework / template / starter kit
// They embed Pyrimid as the default service discovery layer

import { PyrimidResolver } from '@pyrimid/sdk';

const resolver = new PyrimidResolver({
  affiliateId: 'af_developer_id',  // Developer's affiliate ID
  catalogUrl: 'https://api.pyrimid.xyz/v1/catalog',
});

// When the agent needs a capability it doesn't have natively:
async function resolveCapability(need: string) {
  // Check Pyrimid catalog for matching products
  const match = await resolver.findProduct(need);
  // e.g. need = "btc trading signal" → match = Trading Brain signals

  if (match) {
    // Purchase through Pyrimid with embedded affiliate attribution
    const result = await resolver.purchase(match.vendorId, match.productId, {
      buyer: agentWallet,
      // affiliate ID is automatically included
    });
    return result;
  }
  
  // Fallback to other discovery (Bazaar, direct, etc.)
  return null;
}
```

**Why this is highest leverage:**
- One integration → thousands of attributed purchases across every agent using that framework
- The developer writes the code once, earns commission passively forever
- The end-agent never "decides" to use Pyrimid — it's the default path
- Similar to how Chrome's default search engine generates billions for Google without users actively choosing it

**Who to target:**
- Agent template/starter kit creators on GitHub
- LangChain/CrewAI custom tool builders
- Vercel AI SDK template authors
- Agent-as-a-service platforms (they build agents for clients, embed Pyrimid into all of them)

**This is the primary affiliate recruitment strategy.** Every developer who embeds the Pyrimid SDK into their agent toolset is an affiliate generating volume 24/7.

---

### Type 2: MCP Recommender Agent (MEDIUM LEVERAGE)

**What it is:** An MCP server that acts as a specialized "shopping agent" for the Pyrimid catalog. Other agents connect to it as a tool and ask for product recommendations. Every recommendation includes the affiliate's ID.

**How it works:**

```typescript
// Pyrimid Recommender — an MCP server that acts as affiliate
import { createMcpServer } from '@modelcontextprotocol/sdk';
import { PyrimidAffiliate } from '@pyrimid/sdk';

const affiliate = new PyrimidAffiliate({
  affiliateId: 'af_recommender_1',
  wallet: agentWallet,
});

const server = createMcpServer({
  tools: {
    find_trading_signals: {
      description: "Find the best trading signal provider for your needs",
      parameters: {
        asset: { type: "string", description: "e.g. BTC, ETH" },
        budget_per_call: { type: "number", description: "Max USDC per call" },
      },
      handler: async ({ asset, budget_per_call }) => {
        const catalog = await affiliate.getCatalog();
        const matches = catalog.products.filter(p => 
          p.description.toLowerCase().includes(asset.toLowerCase()) &&
          p.priceUsdc <= budget_per_call * 1_000_000
        );

        return {
          recommendations: matches.map(p => ({
            vendor: p.vendorName,
            product: p.productId,
            price: `$${p.priceUsdc / 1_000_000}`,
            commission: `${p.affiliateBps / 100}%`,
            purchase_url: `${p.endpoint}?ref=${affiliate.affiliateId}`,
            // The affiliate ID is embedded in every recommendation
          }))
        };
      }
    },

    find_data_feeds: {
      description: "Find data feed providers on the Pyrimid network",
      // Similar pattern — query catalog, return results with affiliate attribution
    },

    buy_product: {
      description: "Purchase a product from the Pyrimid network",
      parameters: {
        vendor_id: { type: "string" },
        product_id: { type: "string" },
      },
      handler: async ({ vendor_id, product_id }) => {
        // Execute purchase through Pyrimid with affiliate attribution
        const result = await affiliate.proxyPurchase({
          vendorId: vendor_id,
          productId: product_id,
          buyerWallet: callerWallet,
        });
        return result;
      }
    }
  }
});
```

**The agent using this MCP server sees:**
```
Available tools:
- find_trading_signals: Find the best trading signal provider for your needs
- find_data_feeds: Find data feed providers on the Pyrimid network
- buy_product: Purchase a product from the Pyrimid network
```

When the agent calls `find_trading_signals({ asset: "BTC", budget_per_call: 0.50 })`, it gets back a recommendation with the affiliate's ID embedded. If the agent then calls `buy_product`, the affiliate earns commission.

**Why medium leverage:**
- Requires other agents to actively connect to this MCP server
- Discovery of the recommender itself is a chicken-and-egg problem
- But once connected, it's a persistent revenue stream
- Works well as a secondary channel alongside embedded SDK distribution

**Deployment:** Host on Vercel as an MCP server. Register in MCP registries (Glama, Smithery). Agents using Claude/Cursor can add it as a remote MCP server.

---

### Type 3: Wrapper/Enhancer Agent (NICHE LEVERAGE)

**What it is:** An agent that buys raw products from Pyrimid vendors, adds value (analysis, formatting, combination with other data), and resells the enhanced version — also through Pyrimid as its own vendor listing.

**Example:** An agent buys Trading Brain's raw $0.25 signal, combines it with funding rate data from another vendor, adds its own risk assessment layer, and sells the combined "enhanced signal" for $0.75 on Pyrimid. The agent earns $0.75 as a vendor minus cost ($0.25 + $0.10 for the other data) = $0.40 profit per sale. Plus the upstream vendors earn on the raw purchases.

**Why niche leverage:**
- Requires the wrapper agent to add genuine value
- More complex to build (needs its own analysis logic)
- But creates a compounding ecosystem — products built on products
- This is the long-term vision for Pyrimid: a composable commerce layer

**Defer to Phase 2.** Focus launch on Type 1 and Type 2.

---

## 3. Optimizing for MCP Distribution

Since 99% of sales flow through programmatic channels, the entire Pyrimid stack needs to be optimized for machine consumption:

### 3.1 Catalog API Must Be Agent-Perfect

The catalog isn't for humans to browse. It's for agents to query and make instant purchase decisions. Every field needs to be machine-parseable:

```json
{
  "products": [
    {
      "vendor_id": "vn_r4rtrading",
      "vendor_name": "Trading Brain",
      "vendor_erc8004": true,
      "vendor_agent_id": 4821,
      "product_id": "signals-latest",
      "description": "Real-time BTC perpetual futures trading signal with 5-factor confluence scoring. Returns entry price, stop loss, take profit levels, and risk-reward ratio. Updated every time confluence score changes.",
      "category": "trading-signals",
      "tags": ["btc", "perpetuals", "signals", "trading", "confluence"],
      "price_usdc": 250000,
      "price_display": "$0.25",
      "affiliate_bps": 2000,
      "affiliate_display": "20%",
      "endpoint": "https://brain.perpetuals.trading/api/v1/signals/latest",
      "method": "GET",
      "output_schema": {
        "type": "object",
        "properties": {
          "confluence_score": { "type": "number", "description": "0-100" },
          "direction": { "type": "string", "enum": ["bullish", "bearish", "neutral"] },
          "suggested_entry": { "type": "number" },
          "suggested_stop": { "type": "number" },
          "risk_reward_ratio": { "type": "number" }
        }
      },
      "monthly_volume": 15000,
      "monthly_buyers": 89,
      "active_since": "2026-04-01",
      "network": "eip155:8453",
      "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
    }
  ]
}
```

Key design decisions for agent consumption:
- **Category + tags** for filtering (agents search by capability, not by vendor name)
- **Output schema** so agents know exactly what they'll get before paying
- **Volume + buyer count** as trust signals (agents prefer products with proven usage)
- **ERC-8004 verification flag** so agents can filter for verified vendors
- **Price in both atomic units and display** (agents do math, but also need to reason about cost)

### 3.2 MCP Server Must Present Products as Native Tools

The Pyrimid MCP server shouldn't just list products — it should present them as callable tools that agents can use directly. Each product becomes a tool:

```
Tools available from Pyrimid MCP Server:

trading_brain_signal
  - Description: Get BTC perpetual futures trading signal with 5-factor confluence scoring
  - Price: $0.25 USDC on Base
  - Returns: entry, stop, TP, R:R ratio, confluence score
  
trading_brain_indicator_supertrend  
  - Description: Download Multi-TF Supertrend v2 Pine Script indicator
  - Price: $5.00 USDC on Base
  - Returns: Pine Script source + setup instructions

prixe_stock_price
  - Description: Get real-time stock price data
  - Price: $0.01 USDC on Base  
  - Returns: price, volume, change, market cap

[... all products from all vendors as individual tools]
```

An agent using Claude that connects to this MCP server instantly has access to every product on Pyrimid as a tool call. The payment and affiliate attribution happen inline via x402.

### 3.3 Affiliate Attribution Must Be Invisible

In a programmatic context, the affiliate ID should never be something a buyer agent needs to "see" or "choose." It's embedded in the path:

- **MCP recommender:** Affiliate ID embedded in the purchase proxy call
- **Embedded SDK:** Affiliate ID hardcoded by the developer who integrated it
- **Catalog API query:** If the query came through an affiliate's API key, attribution is automatic

The buyer agent should never need to think about affiliates. It just needs a signal, pays for a signal, gets a signal. The affiliate layer is invisible infrastructure.

### 3.4 The Pyrimid MCP Server IS the Primary Affiliate Agent

Here's the key realization: **Pyrimid's own MCP server is itself the biggest affiliate agent on the network.**

Every purchase made through the Pyrimid MCP server can have a platform affiliate ID attached. This means:

- Agent discovers product via Pyrimid MCP → buys it → Pyrimid earns 1% platform fee AND affiliate commission
- Agent discovers product via direct Bazaar listing → buys it → Pyrimid earns 1% platform fee only

The MCP server is the distribution moat. It's the reason agents route through Pyrimid instead of going direct to vendors on Bazaar. And it earns commission on top of the protocol fee.

However — this creates a conflict. If Pyrimid's MCP server is the primary affiliate, third-party affiliates have no role. The protocol earns more by being its own affiliate than by sharing commission with others.

**Resolution:** The Pyrimid MCP server uses a **default affiliate ID** that routes to the treasury. But third-party affiliates can deploy their OWN MCP servers using the Pyrimid SDK, with their own affiliate IDs. The competition is: whose MCP server do agents connect to? Pyrimid's official one, or a third-party one that might offer better curation, faster responses, or specialized recommendations?

This is the real affiliate game in the agent economy: **competing to be the MCP server that agents connect to for discovery.**

---

## 4. First 3 Affiliate Agents to Deploy

### Agent 1: Pyrimid Official MCP Server

**What:** The canonical MCP server for the Pyrimid catalog. All products exposed as paid tools. Default affiliate attribution goes to treasury.

**Deploy on:** Vercel (existing infra)

**Purpose:** Primary distribution channel. Every agent using Claude, Cursor, or AI SDK that connects to this server can buy from any vendor on Pyrimid.

**Implementation:**
```typescript
// Auto-generate paidTools from live catalog
const catalog = await fetch('https://api.pyrimid.xyz/v1/catalog');
const products = await catalog.json();

const paidTools = {};
for (const product of products) {
  const toolName = `${product.vendor_id}_${product.product_id}`.replace(/-/g, '_');
  paidTools[toolName] = {
    description: product.description,
    price: product.price_display,
    network: "base",
    parameters: product.input_schema || {},
    handler: async (params) => {
      // Proxy to vendor endpoint with x402 payment + affiliate attribution
      return await pyrimidProxy(product.endpoint, params, {
        affiliateId: TREASURY_AFFILIATE_ID,
      });
    }
  };
}
```

**Registration:** Register on Glama MCP registry, Smithery, and any other MCP directories. Include in Pyrimid docs for agent builders to add.

### Agent 2: Trading-Focused Recommender

**What:** A specialized MCP server for trading agents. Curates and recommends products from the Pyrimid catalog that are relevant to trading (signals, data feeds, market analysis). Has its own affiliate ID.

**Deploy on:** Your Mac Mini (ClawdBot infrastructure) or Vercel

**Purpose:** Prove the third-party affiliate model works. This agent earns commission independently from the protocol.

**Implementation:** Subset of the catalog focused on trading. Adds context-aware recommendations ("BTC funding rate is extreme right now, here's a signal that factors in funding rate data"). Uses Trading Brain signal quality data to enhance recommendations.

**Affiliate ID:** Rizz's personal affiliate ID (separate from vendor ID). This shows the ecosystem that vendors can also be affiliates for other vendors' products.

### Agent 3: General Discovery Agent

**What:** A broader MCP recommender that helps any agent find any service on Pyrimid. Like the official server but with better curation, natural language matching, and opinionated rankings.

**Deploy on:** Vercel

**Purpose:** Test whether a "curated" discovery agent can compete with the canonical catalog. If this agent drives more sales than the raw catalog, it validates the affiliate model — curation adds value.

**Affiliate ID:** A separate affiliate ID, tracking its own performance.

---

## 5. How to Measure Success

Since all distribution is programmatic, metrics must be programmatic too:

**From contract events (PyrimidRouter.PaymentRouted):**
- Total sales volume per affiliate ID
- Number of unique buyer wallets per affiliate
- Revenue per affiliate per vendor
- Percentage of sales attributed to affiliates vs. direct

**From MCP server logs:**
- Tool discovery queries per day (how many agents are browsing)
- Tool calls per day (how many agents are buying)
- Conversion rate: discovery → purchase
- Which products get queried most vs. purchased most

**Key ratio:** `affiliate-attributed sales / total sales`

If this ratio is >50% within 30 days, the affiliate model is working — more than half of all sales come through the affiliate distribution layer rather than direct vendor access. If it's <20%, the affiliate layer isn't adding enough value and vendors won't see the point.

---

## 6. Updated GTM: Drop Social, Go Full MCP

**Remove from GTM:**
- Channel 5 (crypto trading communities for human buyers)
- Any mention of social media posting by agents
- X3P0 as a social promoter

**Replace with:**
- MCP server deployment as the primary distribution mechanism
- Agent framework developer outreach as the primary affiliate recruitment strategy
- MCP registry listings as the primary discovery channel
- Trading-focused recommender agent as the proof-of-concept affiliate

**The revised affiliate recruitment targets:**

| Channel | Target | Mechanism |
|---------|--------|-----------|
| Agent framework devs (embed SDK) | 30 | `@pyrimid/sdk` as default service resolver |
| MCP recommender operators | 10 | Deploy custom MCP servers with affiliate IDs |
| ERC-8004 verified agents | 20 | Link identity, get priority in catalog |
| Direct Bazaar-to-Pyrimid migration | 20 | Existing x402 buyers who route through Pyrimid MCP |
| Organic (discovery bonus referrals) | 20 | Existing affiliates refer new ones |
| **Total** | **100** | |

The biggest shift: **the primary affiliate isn't an "agent that sells." It's a developer who embeds the SDK into their agent stack.** The SDK is the salesperson. The developer is the affiliate.

---

*This document supersedes the social media distribution sections of the GTM strategy. All distribution is programmatic. All sales are machine-to-machine. The MCP server is the storefront.*
