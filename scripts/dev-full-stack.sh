#!/usr/bin/env bash
# dev-full-stack.sh - Start backend API + website for local development
#
# Usage: ./scripts/dev-full-stack.sh
#
# Backend: http://localhost:3000  (auth, billing, usage API)
# Website: http://localhost:3001  (Next.js frontend)

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Panguard AI - Full Stack Development"
echo "====================================="
echo ""
echo "  Backend API:  http://localhost:3000"
echo "  Website:      http://localhost:3001"
echo ""

# Ensure dependencies are installed
if [ ! -d "$ROOT_DIR/node_modules" ]; then
  echo "Installing dependencies..."
  cd "$ROOT_DIR" && pnpm install
fi

# Build backend if not already built
if [ ! -f "$ROOT_DIR/packages/panguard/dist/cli/index.js" ]; then
  echo "Building backend..."
  cd "$ROOT_DIR" && pnpm -r --stream build
fi

# Set CORS to allow website origin
export CORS_ALLOWED_ORIGINS="http://localhost:3001"
export PANGUARD_BASE_URL="http://localhost:3000"

# Start backend in background
echo "Starting backend API on port 3000..."
node "$ROOT_DIR/packages/panguard/dist/cli/index.js" serve --port 3000 &
BACKEND_PID=$!

# Wait for backend to be ready
for i in $(seq 1 30); do
  if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "Backend ready."
    break
  fi
  if [ $i -eq 30 ]; then
    echo "Backend failed to start."
    kill $BACKEND_PID 2>/dev/null
    exit 1
  fi
  sleep 1
done

# Start website
echo "Starting website on port 3001..."
cd "$ROOT_DIR/packages/website"
NEXT_PUBLIC_API_URL=http://localhost:3000 PORT=3001 npx next dev &
WEBSITE_PID=$!

echo ""
echo "Both services running. Press Ctrl+C to stop."
echo ""

# Trap Ctrl+C to cleanup
cleanup() {
  echo ""
  echo "Stopping services..."
  kill $BACKEND_PID 2>/dev/null
  kill $WEBSITE_PID 2>/dev/null
  wait
  echo "Done."
}

trap cleanup EXIT INT TERM
wait
