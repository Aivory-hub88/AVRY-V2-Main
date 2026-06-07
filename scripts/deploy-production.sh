#!/bin/bash
# =============================================================================
# Aivory Platform — Production Deployment
# =============================================================================
# Called by install.sh after Traefik is already up.
# Can also be run standalone to redeploy the application stack.
#
# Usage:
#   bash scripts/deploy-production.sh
# =============================================================================

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

log()     { echo -e "${CYAN}[deploy]${NC} $*"; }
success() { echo -e "${GREEN}[✓]${NC} $*"; }
warn()    { echo -e "${YELLOW}[!]${NC} $*"; }
error()   { echo -e "${RED}[✗]${NC} $*" >&2; exit 1; }

INSTALL_DIR="/opt/aivory"
cd "$INSTALL_DIR"

# Verify .env
[[ -f .env ]] || error ".env not found. Run install.sh first or copy .env.production.example to .env"
source .env 2>/dev/null || true
[[ -n "${ACME_EMAIL:-}" ]] || error "ACME_EMAIL must be set in .env"

# ── 1. Network ────────────────────────────────────────────────────────────────
docker network create aivory-network 2>/dev/null || true

# ── 2. Infrastructure: n8n first ─────────────────────────────────────────────
log "Starting n8n services..."
docker compose -f docker-compose.production.yml up -d --build \
    avry-n8n avry-n8n-mcp avry-n8n-as-code

log "Waiting for n8n to become healthy (max 120s)..."
for i in $(seq 1 24); do
    STATUS=$(docker inspect avry-n8n --format='{{.State.Health.Status}}' 2>/dev/null || echo "starting")
    if [[ "$STATUS" == "healthy" ]]; then
        success "n8n is healthy"
        break
    fi
    [[ $i -eq 24 ]] && { warn "n8n health check timed out — continuing anyway"; break; }
    echo -n "."
    sleep 5
done
echo ""

# ── 3. ZeroClaw ──────────────────────────────────────────────────────────────
log "Starting ZeroClaw daemon..."
docker compose -f docker-compose.production.yml up -d --build avry-zeroclaw-daemon

log "Waiting for ZeroClaw daemon (max 60s)..."
for i in $(seq 1 12); do
    STATUS=$(docker inspect avry-zeroclaw-daemon --format='{{.State.Health.Status}}' 2>/dev/null || echo "starting")
    if [[ "$STATUS" == "healthy" ]]; then
        success "ZeroClaw daemon is healthy"
        break
    fi
    [[ $i -eq 12 ]] && { warn "ZeroClaw health check timed out — continuing anyway"; break; }
    echo -n "."
    sleep 5
done
echo ""

log "Starting VPS Bridge (avry-zeroclaw)..."
docker compose -f docker-compose.production.yml up -d --build avry-zeroclaw

# ── 4. Backend services ───────────────────────────────────────────────────────
log "Starting backend services..."
docker compose -f docker-compose.production.yml up -d --build \
    avry-backend \
    avry-diagnostics \
    avry-blueprint \
    avry-roadmaps \
    avry-payments \
    avry-console \
    avry-workflows \
    avry-blog \
    avry-careers

# ── 5. Frontend applications ──────────────────────────────────────────────────
log "Starting frontend applications..."
docker compose -f docker-compose.production.yml up -d --build \
    avry-website \
    avry-user-dashboard \
    avry-admin-dashboards

# ── 6. Monitoring ─────────────────────────────────────────────────────────────
log "Starting monitoring stack..."
docker compose -f docker-compose.production.yml up -d --build \
    avry-prometheus \
    avry-grafana 2>/dev/null || warn "Monitoring not fully configured — skipping"

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
success "All services started"
echo ""
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
