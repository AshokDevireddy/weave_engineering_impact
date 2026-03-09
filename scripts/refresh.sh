#!/bin/bash
# Refresh dashboard data: collect → score → explain → copy → build
# Usage: ./scripts/refresh.sh
# Requires: GITHUB_TOKEN (and optionally OPENAI_API_KEY) in .env
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

echo "═══════════════════════════════════════════════"
echo "  Weave Engineering Impact — Data Refresh"
echo "═══════════════════════════════════════════════"
echo ""

START=$(date +%s)

echo "▶ Step 1/4: Collecting PR data from GitHub..."
npm run collect --silent
echo ""

echo "▶ Step 2/4: Computing impact scores..."
npm run score --silent
echo ""

echo "▶ Step 3/4: Generating AI explanations..."
npm run explain --silent
echo ""

echo "▶ Step 4/4: Copying data to dashboard..."
npm run copy-data --silent
echo ""

END=$(date +%s)
ELAPSED=$((END - START))

echo "═══════════════════════════════════════════════"
echo "  ✓ Dashboard data refreshed in ${ELAPSED}s"
echo "  Run 'npm run build' to rebuild, or"
echo "  push to GitHub to trigger a Vercel redeploy."
echo "═══════════════════════════════════════════════"
