#!/bin/bash
# Copy computed data to src/data for Next.js static import
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cp "$PROJECT_DIR/data/dashboard-data.json" "$PROJECT_DIR/src/data/dashboard-data.json"
cp "$PROJECT_DIR/data/summary.json" "$PROJECT_DIR/src/data/summary.json"

echo "✓ Copied data to src/data/"
