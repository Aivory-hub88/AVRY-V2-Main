#!/bin/bash
# =============================================================================
# Aivory Platform — Update Script
# =============================================================================
# Pulls latest code for all submodules and restarts changed services.
#
# Usage:
#   cd /opt/aivory && bash scripts/update.sh
#   bash scripts/update.sh <service-name>   # update single service
#
# Examples:
#   bash scripts/update.sh                  # update everything
#   bash scripts/update.sh avry-console     # update just the console
#   bash scripts/update.sh avry-zeroclaw    # update just zeroclaw
# =============================================================================

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

log()     { echo -e "${CYAN}[update]${NC} $*"; }
success() { echo -e "${GREEN}[✓]${NC} $*"; }
warn()    { echo -e "${YELLOW}[!]${NC} $*"; }
error()   { echo -e "${RED}[✗]${NC} $*" >&2; exit 1; }

INSTALL_DIR="/opt/aivory"
cd "$INSTALL_DIR"

SERVICE="${1:-}"

if [[ -n "$SERVICE" ]]; then
    # ── Single service update ─────────────────────────────────────────────────
    log "Updating single service: $SERVICE"
    docker compose -f docker-compose.production.yml pull "$SERVICE" 2>/dev/null || true
    docker compose -f docker-compose.production.yml up -d --build --no-deps "$SERVICE"
    success "$SERVICE updated and restarted"
else
    # ── Full platform update ──────────────────────────────────────────────────
    log "Pulling latest code for all submodules..."
    git pull --ff-only
    git submodule update --remote --jobs 8

    log "Rebuilding and restarting all services..."

    # Infrastructure first
    docker compose -f docker-compose.production.yml up -d --build --no-deps \
        avry-n8n avry-n8n-mcp avry-n8n-as-code \
        avry-zeroclaw-daemon avry-zeroclaw

    # Backend services
    docker compose -f docker-compose.production.yml up -d --build --no-deps \
        avry-backend avry-diagnostics avry-blueprint avry-roadmaps \
        avry-payments avry-console avry-workflows avry-blog avry-careers

    # Frontend
    docker compose -f docker-compose.production.yml up -d --build --no-deps \
        avry-website avry-user-dashboard avry-admin-dashboards

    success "All services updated"
    echo ""
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"
fi
