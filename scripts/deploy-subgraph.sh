#!/bin/bash
# deploy-subgraph.sh
# Full subgraph deployment to The Graph Studio.
#
# Prerequisites:
#   1. Create account at https://thegraph.com/studio/
#   2. Create a new subgraph named "pyrimid-base" (network: Base)
#   3. Copy your deploy key from the dashboard
#
# Usage:
#   GRAPH_DEPLOY_KEY=xxx bash scripts/deploy-subgraph.sh

set -e

DEPLOY_KEY="${GRAPH_DEPLOY_KEY:-}"

if [ -z "$DEPLOY_KEY" ]; then
  echo "ERROR: Set GRAPH_DEPLOY_KEY environment variable"
  echo ""
  echo "Steps to get your deploy key:"
  echo "  1. Go to https://thegraph.com/studio/"
  echo "  2. Sign in with your wallet"
  echo "  3. Click 'Create a Subgraph'"
  echo "  4. Name: pyrimid-base, Network: Base"
  echo "  5. Copy the deploy key from the dashboard"
  echo "  6. Run: GRAPH_DEPLOY_KEY=<key> bash scripts/deploy-subgraph.sh"
  exit 1
fi

echo "═══ Deploying Pyrimid Subgraph to The Graph Studio ═══"
echo ""

cd subgraph

# Install deps
echo "[1/5] Installing dependencies..."
npm install

# Auth
echo "[2/5] Authenticating..."
npx graph auth --studio "$DEPLOY_KEY"

# Codegen
echo "[3/5] Generating types from schema + ABIs..."
npx graph codegen

# Build
echo "[4/5] Building WASM..."
npx graph build

# Deploy
echo "[5/5] Deploying to Studio..."
npx graph deploy pyrimid-base --studio --version-label v0.1.0

echo ""
echo "═══ Deployment Complete ═══"
echo ""
echo "Your subgraph URL (add to .env as PYRIMID_SUBGRAPH_URL):"
echo "  https://api.studio.thegraph.com/query/<YOUR_ID>/pyrimid-base/version/latest"
echo ""
echo "View in Studio:"
echo "  https://thegraph.com/studio/subgraph/pyrimid-base/"
echo ""
echo "It will take a few minutes to sync from startBlock to head."
