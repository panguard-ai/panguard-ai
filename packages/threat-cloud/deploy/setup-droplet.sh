#!/usr/bin/env bash
# -------------------------------------------------------
# Threat Cloud - DigitalOcean Droplet Setup
# 威脅雲 - DigitalOcean Droplet 一鍵部署
#
# Run on a fresh Ubuntu 22.04/24.04 Droplet:
#   curl -sSL https://raw.githubusercontent.com/.../setup-droplet.sh | bash
#
# Or SSH in and run:
#   bash setup-droplet.sh
#
# Prerequisites:
#   - Ubuntu 22.04 or 24.04 LTS
#   - Root or sudo access
#   - Domain DNS A record pointing to this server's IP
# -------------------------------------------------------

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[+]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err() { echo -e "${RED}[x]${NC} $1"; exit 1; }

# -------------------------------------------------------
# 1. System setup
# -------------------------------------------------------
log "Updating system packages..."
apt-get update -qq && apt-get upgrade -y -qq

log "Installing prerequisites..."
apt-get install -y -qq curl git ufw fail2ban

# -------------------------------------------------------
# 2. Firewall
# -------------------------------------------------------
log "Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
echo "y" | ufw enable

# -------------------------------------------------------
# 3. Docker
# -------------------------------------------------------
if ! command -v docker &>/dev/null; then
  log "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
else
  log "Docker already installed."
fi

# -------------------------------------------------------
# 4. Clone or update repo
# -------------------------------------------------------
APP_DIR="/opt/threat-cloud"

if [ -d "$APP_DIR" ]; then
  log "Updating existing installation..."
  cd "$APP_DIR"
  git pull
else
  log "Cloning Threat Cloud..."
  # Clone just the threat-cloud package (sparse checkout)
  git clone --depth 1 --filter=blob:none --sparse \
    https://github.com/panguard-ai/panguard-ai.git "$APP_DIR"
  cd "$APP_DIR"
  git sparse-checkout set packages/threat-cloud
fi

cd "$APP_DIR/packages/threat-cloud"

# -------------------------------------------------------
# 5. Environment configuration
# -------------------------------------------------------
if [ ! -f .env ]; then
  log "Creating .env from template..."
  cp deploy/.env.example .env

  # Prompt for domain
  echo ""
  read -rp "Enter your domain (e.g., tc.panguard.ai): " DOMAIN
  sed -i "s/tc.panguard.ai/$DOMAIN/" .env

  # Generate API key
  API_KEY=$(openssl rand -hex 32)
  sed -i "s/your-secret-key-1,your-secret-key-2/$API_KEY/" .env

  echo ""
  log "Generated API key: $API_KEY"
  warn "Save this key! You'll need it for Guard/Trap agents."
  echo ""
else
  log ".env already exists, skipping configuration."
fi

# -------------------------------------------------------
# 6. Build and start
# -------------------------------------------------------
log "Building and starting Threat Cloud..."
docker compose build
docker compose up -d

# -------------------------------------------------------
# 7. Seed with public threat intelligence
# -------------------------------------------------------
log "Seeding with public threat intelligence feeds..."
log "This may take 1-3 minutes depending on network speed..."
docker compose run --rm seed

# -------------------------------------------------------
# 8. Verify
# -------------------------------------------------------
log "Waiting for health check..."
sleep 5

if curl -sf http://127.0.0.1:8080/health > /dev/null 2>&1; then
  log "Threat Cloud is running!"
else
  warn "Health check failed. Checking logs..."
  docker compose logs --tail=20 tc
fi

# -------------------------------------------------------
# 9. Summary
# -------------------------------------------------------
echo ""
echo "========================================"
echo "  Threat Cloud Deployment Complete"
echo "========================================"
echo ""
echo "  API:     https://$DOMAIN"
echo "  Health:  https://$DOMAIN/health"
echo "  Stats:   https://$DOMAIN/api/stats"
echo ""
echo "  API Key: $(grep TC_API_KEYS .env | cut -d= -f2)"
echo ""
echo "  Useful commands:"
echo "    cd /opt/threat-cloud/packages/threat-cloud"
echo "    docker compose logs -f tc      # View logs"
echo "    docker compose restart tc      # Restart"
echo "    docker compose run --rm seed   # Re-seed data"
echo "    docker compose down            # Stop all"
echo ""
echo "  Cron (auto-seed weekly):"
echo "    0 3 * * 0 cd /opt/threat-cloud/packages/threat-cloud && docker compose run --rm seed >> /var/log/tc-seed.log 2>&1"
echo ""
