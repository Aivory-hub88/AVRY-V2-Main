#!/bin/bash
# =============================================================================
# Aivory Platform — Status Check Script
# =============================================================================
# Shows health of all services.
#
# Usage:
#   bash scripts/status.sh
# =============================================================================

CYAN='\033[0;36m'; GREEN='\033[0;32m'; RED='\033[0;31m'
YELLOW='\033[1;33m'; BOLD='\033[1m'; NC='\033[0m'

INSTALL_DIR="/opt/aivory"
cd "$INSTALL_DIR"

echo ""
echo -e "${BOLD}${CYAN}  Aivory Platform Status${NC}"
echo -e "  $(date)"
echo ""

# Container status
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | \
  awk 'NR==1 {print "  "$0} NR>1 {
    if ($0 ~ /healthy|Up/) {
      print "  \033[0;32m" $0 "\033[0m"
    } else if ($0 ~ /unhealthy|Exit|Exited/) {
      print "  \033[0;31m" $0 "\033[0m"
    } else {
      print "  \033[1;33m" $0 "\033[0m"
    }
  }'

echo ""

# Quick health endpoint checks for key services
echo -e "${BOLD}  Health Endpoints:${NC}"

check_health() {
    local name=$1 url=$2
    if curl -sf --max-time 3 "$url" >/dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} $name"
    else
        echo -e "  ${RED}✗${NC} $name ($url)"
    fi
}

check_health "avry-zeroclaw  :8090" "http://localhost:8090/health"
check_health "avry-backend   :8081" "http://localhost:8081/health"
check_health "avry-n8n       :5678" "http://localhost:5678/healthz"
check_health "avry-diagnostics:8082" "http://localhost:8082/health"
check_health "avry-blueprint :8083" "http://localhost:8083/health"
check_health "avry-roadmaps  :8084" "http://localhost:8084/health"
check_health "avry-payments  :8085" "http://localhost:8085/health"
check_health "avry-console   :8086" "http://localhost:8086"
check_health "avry-workflows :8087" "http://localhost:8087/health"
check_health "avry-blog      :8088" "http://localhost:8088/health"
check_health "avry-careers   :8089" "http://localhost:8089/health"
check_health "avry-website   :9000" "http://localhost:9000"
check_health "avry-user-dash :9001" "http://localhost:9001"
check_health "avry-admin-dash:9002" "http://localhost:9002"

echo ""
echo -e "  ${CYAN}Logs:${NC} docker compose -f docker-compose.production.yml logs -f <service>"
echo ""
