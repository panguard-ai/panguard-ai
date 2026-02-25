#!/bin/bash
# OpenClaw Security - Linux Build Script
# OpenClaw 安全平台 - Linux 建置腳本

set -euo pipefail

echo "================================"
echo "OpenClaw Security - Linux Build"
echo "================================"
echo ""

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "Error: Node.js is required but not installed."; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "Error: pnpm is required but not installed."; exit 1; }

echo "Node.js version: $(node --version)"
echo "pnpm version: $(pnpm --version)"
echo ""

# Install dependencies
echo "[1/4] Installing dependencies..."
pnpm install --frozen-lockfile

# Type check
echo "[2/4] Running type check..."
pnpm typecheck

# Run tests
echo "[3/4] Running tests..."
pnpm test

# Build
echo "[4/4] Building packages..."
pnpm build

echo ""
echo "Build completed successfully!"
