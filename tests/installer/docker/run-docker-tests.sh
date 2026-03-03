#!/usr/bin/env bash
set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
DOCKER_DIR="$(cd "$(dirname "$0")" && pwd)"

info()    { printf "${BOLD}[INFO]${NC} %s\n" "$1"; }
success() { printf "${GREEN}[PASS]${NC} %s\n" "$1"; }
fail()    { printf "${RED}[FAIL]${NC} %s\n" "$1"; }

echo ""
echo -e "  ${BOLD}Panguard AI Installer -- Docker E2E Tests${NC}"
echo -e "  ==========================================="
echo ""

# Check Docker is available
if ! command -v docker &>/dev/null; then
  echo -e "${RED}Docker is not installed or not running.${NC}"
  echo "Install Docker Desktop from https://docker.com"
  exit 1
fi

PASSED=0
FAILED=0

# Test 1: Ubuntu
echo ""
info "Building Ubuntu test image..."
if docker build -f "${DOCKER_DIR}/Dockerfile.ubuntu" -t panguard-installer-test-ubuntu "${PROJECT_ROOT}" 2>&1; then
  info "Running Ubuntu installer test..."
  if docker run --rm --name panguard-test-ubuntu panguard-installer-test-ubuntu 2>&1; then
    success "Ubuntu installer test"
    PASSED=$((PASSED + 1))
  else
    fail "Ubuntu installer test"
    FAILED=$((FAILED + 1))
  fi
else
  fail "Ubuntu Docker build"
  FAILED=$((FAILED + 1))
fi

# Test 2: Alpine (musl detection)
echo ""
info "Building Alpine test image..."
if docker build -f "${DOCKER_DIR}/Dockerfile.alpine" -t panguard-installer-test-alpine "${PROJECT_ROOT}" 2>&1; then
  info "Running Alpine installer test..."
  if docker run --rm --name panguard-test-alpine panguard-installer-test-alpine 2>&1; then
    success "Alpine installer test (musl)"
    PASSED=$((PASSED + 1))
  else
    fail "Alpine installer test"
    FAILED=$((FAILED + 1))
  fi
else
  fail "Alpine Docker build"
  FAILED=$((FAILED + 1))
fi

# Cleanup images
echo ""
info "Cleaning up Docker images..."
docker rmi panguard-installer-test-ubuntu panguard-installer-test-alpine 2>/dev/null || true

# Summary
echo ""
echo -e "  ${BOLD}Results${NC}"
echo -e "  ======="
echo -e "  Passed: ${GREEN}${PASSED}${NC}"
echo -e "  Failed: ${RED}${FAILED}${NC}"
echo ""

if [ "$FAILED" -gt 0 ]; then
  fail "Some tests failed"
  exit 1
fi

success "All Docker installer tests passed!"
