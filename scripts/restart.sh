#!/bin/bash
# =============================================================================
# Aivory Platform — Service Restart Script
# =============================================================================
# Restart one or all services without rebuilding images.
#
# Usage:
#   bash scripts/restart.sh                   # restart all
#   bash scripts/restart.sh avry-console      # restart one service
#   bash scripts/restart.sh infra             # restart infrastructure only
#   bash scripts/restart.sh frontend          # restart frontends only
#   bash scripts/restart.sh backend           # restart backends only
# =============================================================================

set -euo pipefail

CYAN='\033[0;36m'; GREEN='\033[0;32m'; NC='\033[0m'
log()     { echo -e "${CYAN}[restart]${NC} $*"; }
success() { echo -e "${GREEN}[✓]${NC} $*"; }

INSTALL_DIR="/opt/aivory"
cd "$INSTALL_DIR"

TARGET="${1:-all}"

case "$TARGET" in
    infra|infrastructure)
        log "Restarting infrastructure services..."
        docker compose -f docker-compose.production.yml restart \
            avry-n8n avry-n8n-mcp avry-n8n-as-code \
            avry-zeroclaw-daemon avry-zeroclaw
        ;;
    backend)
        log "Restarting backend services..."
        docker compose -f docker-compose.production.yml restart \
            avry-backend avry-diagnostics avry-blueprint avry-roadmaps \
            avry-payments avry-console avry-workflows avry-blog avry-careers
        ;;
    frontend)
        log "Restarting frontend services..."
        docker compose -f docker-compose.production.yml restart \
            avry-website avry-user-dashboard avry-admin-dashboards
        ;;
    all)
        log "Restarting all services..."
        docker compose -f docker-compose.production.yml restart
        ;;
    *)
        log "Restarting $TARGET..."
        docker compose -f docker-compose.production.yml restart "$TARGET"
        ;;
esac

success "Done"
docker ps --format "table {{.Names}}\t{{.Status}}"
