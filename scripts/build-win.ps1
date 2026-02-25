# OpenClaw Security - Windows Build Script
# OpenClaw 安全平台 - Windows 建置腳本

$ErrorActionPreference = "Stop"

Write-Host "================================"
Write-Host "OpenClaw Security - Windows Build"
Write-Host "================================"
Write-Host ""

# Check prerequisites
try { node --version | Out-Null } catch { Write-Error "Node.js is required but not installed."; exit 1 }
try { pnpm --version | Out-Null } catch { Write-Error "pnpm is required but not installed."; exit 1 }

Write-Host "Node.js version: $(node --version)"
Write-Host "pnpm version: $(pnpm --version)"
Write-Host ""

# Install dependencies
Write-Host "[1/4] Installing dependencies..."
pnpm install --frozen-lockfile

# Type check
Write-Host "[2/4] Running type check..."
pnpm typecheck

# Run tests
Write-Host "[3/4] Running tests..."
pnpm test

# Build
Write-Host "[4/4] Building packages..."
pnpm build

Write-Host ""
Write-Host "Build completed successfully!"
