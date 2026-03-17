#!/bin/bash
# find-deploy-blocks.sh
# Queries BaseScan API for contract creation tx block numbers
# and patches subgraph.yaml with the correct startBlock values.
#
# Usage: BASESCAN_API_KEY=xxx bash scripts/find-deploy-blocks.sh

set -e

API_KEY="${BASESCAN_API_KEY:-}"
BASE_API="https://api.basescan.org/api"

REGISTRY="0x34e22fc20D457095e2814CdFfad1e42980EEC389"
CATALOG="0xC935d6B73034dDDb97AD2a1BbD2106F34A977908"
ROUTER="0xc949AEa380D7b7984806143ddbfE519B03ABd68B"
TREASURY="0x74A512F4f3F64aD479dEc4554a12855Ce943E12C"

get_creation_block() {
  local addr=$1
  local name=$2
  local url="${BASE_API}?module=account&action=txlist&address=${addr}&startblock=0&endblock=99999999&sort=asc&page=1&offset=1"
  if [ -n "$API_KEY" ]; then
    url="${url}&apikey=${API_KEY}"
  fi
  local block=$(curl -s "$url" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d['result'][0]['blockNumber'])" 2>/dev/null || echo "0")
  echo "$name: block $block ($addr)"
  echo "$block"
}

echo "═══ Finding Pyrimid contract deploy blocks on Base ═══"
echo ""

TREASURY_BLOCK=$(get_creation_block "$TREASURY" "Treasury" | head -1 && get_creation_block "$TREASURY" "" | tail -1)
REGISTRY_BLOCK=$(get_creation_block "$REGISTRY" "Registry" | head -1 && get_creation_block "$REGISTRY" "" | tail -1)
CATALOG_BLOCK=$(get_creation_block "$CATALOG" "Catalog" | head -1 && get_creation_block "$CATALOG" "" | tail -1)
ROUTER_BLOCK=$(get_creation_block "$ROUTER" "Router" | head -1 && get_creation_block "$ROUTER" "" | tail -1)

# Simpler approach — get blocks one by one
echo ""
echo "Fetching deploy blocks..."
echo ""

for pair in "REGISTRY:$REGISTRY" "CATALOG:$CATALOG" "ROUTER:$ROUTER" "TREASURY:$TREASURY"; do
  name="${pair%%:*}"
  addr="${pair##*:}"
  url="${BASE_API}?module=account&action=txlist&address=${addr}&startblock=0&endblock=99999999&sort=asc&page=1&offset=1"
  if [ -n "$API_KEY" ]; then
    url="${url}&apikey=${API_KEY}"
  fi
  block=$(curl -s "$url" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d['result'][0]['blockNumber'])" 2>/dev/null || echo "UNKNOWN")
  echo "  $name ($addr): block $block"
  eval "${name}_BLOCK=$block"
done

echo ""

# Patch subgraph.yaml
if [ -f "subgraph/subgraph.yaml" ]; then
  echo "Patching subgraph/subgraph.yaml..."

  # Use the earliest block as start for all (they're deployed in same tx batch)
  # Find the minimum
  MIN_BLOCK=99999999
  for b in $REGISTRY_BLOCK $CATALOG_BLOCK $ROUTER_BLOCK $TREASURY_BLOCK; do
    if [ "$b" != "UNKNOWN" ] && [ "$b" -lt "$MIN_BLOCK" ] 2>/dev/null; then
      MIN_BLOCK=$b
    fi
  done

  if [ "$MIN_BLOCK" != "99999999" ]; then
    # Replace all startBlock: 0 with the actual block
    sed -i.bak "s/startBlock: 0/startBlock: $MIN_BLOCK/g" subgraph/subgraph.yaml
    rm -f subgraph/subgraph.yaml.bak
    echo "  ✓ Set all startBlock to $MIN_BLOCK"
  else
    echo "  ✗ Could not determine deploy blocks. Set BASESCAN_API_KEY and retry."
    echo "    Or manually edit subgraph/subgraph.yaml with the correct block numbers."
  fi
else
  echo "  subgraph/subgraph.yaml not found. Run from project root."
fi

echo ""
echo "═══ Done ═══"
echo ""
echo "Next steps:"
echo "  1. cd subgraph && npm install"
echo "  2. npx graph codegen"
echo "  3. npx graph build"
echo "  4. npx graph deploy pyrimid/pyrimid-base --node https://api.studio.thegraph.com/deploy/"
