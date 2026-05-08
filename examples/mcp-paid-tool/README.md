# paid MCP tool pattern

Best fit: MCP servers with expensive data, scraping, enrichment, analytics, compliance checks, search, or model calls.

## Tool design

- Free tool: `preview_*` returns schema, price, sample output, and payment requirement.
- Paid tool: `buy_*` returns HTTP 402/x402 requirement until paid.
- Discovery: publish server card, `llms.txt`, `agents.txt`, and Pyrimid catalog entry.

## Minimal product metadata

```json
{
  "vendor_id": "your-mcp-server",
  "product_id": "paid_search",
  "description": "Paid MCP search result with enriched citations",
  "category": "search-scraping",
  "tags": ["mcp", "search", "x402", "paid-tools"],
  "price_usdc": 50000,
  "affiliate_bps": 3000,
  "endpoint": "https://your-service.com/api/paid/search",
  "network": "base",
  "asset": "USDC"
}
```

## Why route through Pyrimid?

- Agents can find your tool in one catalog.
- Buyer agents get a standard x402 payment flow.
- Affiliates can route demand to your tool.
- Vendor, affiliate, and protocol fees are visible onchain.
