#!/usr/bin/env bash
# PanguardGuard Installer
# Usage: curl -fsSL https://get.panguard.ai | sh
#        or: bash install.sh [--scan-only] [--guard] [--all]
#
# This script installs PanguardGuard security tools via npm.
# Supports macOS (arm64/x64), Linux (x64/arm64), and Windows (WSL).

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Config
PACKAGE_SCOPE="@openclaw"
MIN_NODE_VERSION=18
INSTALL_MODE="${1:---all}"

info() { printf "${BLUE}[INFO]${NC} %s\n" "$1"; }
success() { printf "${GREEN}[OK]${NC} %s\n" "$1"; }
warn() { printf "${YELLOW}[WARN]${NC} %s\n" "$1"; }
error() { printf "${RED}[ERROR]${NC} %s\n" "$1" >&2; exit 1; }

# Header
echo ""
echo "  PanguardGuard Security Suite Installer"
echo "  ======================================="
echo ""

# Check OS
OS="$(uname -s)"
ARCH="$(uname -m)"
info "Detected: ${OS} ${ARCH}"

case "$OS" in
  Darwin|Linux) ;;
  MINGW*|MSYS*|CYGWIN*)
    warn "Windows detected. Consider using WSL for full functionality."
    ;;
  *)
    error "Unsupported OS: ${OS}"
    ;;
esac

# Check Node.js
if ! command -v node &>/dev/null; then
  error "Node.js is required but not installed. Install from https://nodejs.org (v${MIN_NODE_VERSION}+)"
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt "$MIN_NODE_VERSION" ]; then
  error "Node.js v${MIN_NODE_VERSION}+ required. Current: $(node -v)"
fi
success "Node.js $(node -v)"

# Detect package manager
if command -v pnpm &>/dev/null; then
  PKG_MGR="pnpm"
elif command -v yarn &>/dev/null; then
  PKG_MGR="yarn"
else
  PKG_MGR="npm"
fi
info "Using package manager: ${PKG_MGR}"

# Install packages
install_pkg() {
  local pkg="$1"
  info "Installing ${pkg}..."
  case "$PKG_MGR" in
    pnpm) pnpm add -g "$pkg" ;;
    yarn) yarn global add "$pkg" ;;
    npm) npm install -g "$pkg" ;;
  esac
}

case "$INSTALL_MODE" in
  --scan-only)
    install_pkg "${PACKAGE_SCOPE}/panguard-scan"
    ;;
  --guard)
    install_pkg "${PACKAGE_SCOPE}/panguard-guard"
    ;;
  --chat)
    install_pkg "${PACKAGE_SCOPE}/panguard-chat"
    ;;
  --all|*)
    install_pkg "${PACKAGE_SCOPE}/panguard-scan"
    install_pkg "${PACKAGE_SCOPE}/panguard-guard"
    install_pkg "${PACKAGE_SCOPE}/panguard-chat"
    ;;
esac

# Verify installation
echo ""
info "Verifying installation..."

if command -v panguard-scan &>/dev/null; then
  success "panguard-scan installed"
fi
if command -v panguard-guard &>/dev/null; then
  success "panguard-guard installed"
fi
if command -v panguard-chat &>/dev/null; then
  success "panguard-chat installed"
fi

# Quick start guide
echo ""
echo "  Quick Start"
echo "  ==========="
echo ""
echo "  # Run a 60-second security scan"
echo "  panguard-scan"
echo ""
echo "  # Start real-time protection"
echo "  panguard-guard start"
echo ""
echo "  # Check guard status"
echo "  panguard-guard status"
echo ""
echo "  # View dashboard"
echo "  open http://localhost:3100"
echo ""
success "Installation complete!"
