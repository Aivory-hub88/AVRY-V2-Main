#!/bin/bash
# =============================================================================
# Aivory Platform — First-Time Installation Script
# =============================================================================
# Run this on a fresh Ubuntu VPS to install the entire Aivory platform.
#
# One-line install (from GitHub):
#   bash <(curl -fsSL https://raw.githubusercontent.com/ClementHansel/aivery/main/install.sh)
#
# Or after cloning:
#   git clone --recursive https://github.com/ClementHansel/aivery.git /opt/aivory
#   cd /opt/aivory && chmod +x install.sh && ./install.sh
#
# What this does:
#   1. Installs Docker + Docker Compose (if not present)
#   2. Clones the repo with all submodules to /opt/aivory
#   3. Guides you through .env configuration
#   4. Creates Docker network
#   5. Starts Traefik (TLS termination + routing)
#   6. Starts infrastructure (n8n + ZeroClaw)
#   7. Starts all application services
#
# Requirements:
#   - Ubuntu 22.04 or 24.04
#   - 4GB RAM minimum (8GB recommended)
#   - Ports 80 and 443 open in firewall
#   - A domain pointed at this server's IP
# =============================================================================

set -euo pipefail

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

log()     { echo -e "${CYAN}[aivery]${NC} $*"; }
success() { echo -e "${GREEN}[✓]${NC} $*"; }
warn()    { echo -e "${YELLOW}[!]${NC} $*"; }
error()   { echo -e "${RED}[✗]${NC} $*" >&2; exit 1; }
section() { echo -e "\n${BOLD}${CYAN}══ $* ══${NC}"; }

INSTALL_DIR="/opt/aivory"
REPO_URL="https://github.com/ClementHansel/aivery.git"

# ── Step 0: Must run as root or with sudo ────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
    error "Please run as root or with sudo:\n  sudo bash install.sh"
fi

echo ""
echo -e "${BOLD}${CYAN}"
echo "  ╔══════════════════════════════════════════╗"
echo "  ║        AIVORY PLATFORM INSTALLER         ║"
echo "  ║   AI-Powered Business Transformation     ║"
echo "  ╚══════════════════════════════════════════╝"
echo -e "${NC}"

# ── Step 1: Install system dependencies ──────────────────────────────────────
section "Step 1/6 — System Dependencies"

apt-get update -qq

# Install git if missing
if ! command -v git &>/dev/null; then
    log "Installing git..."
    apt-get install -y -qq git curl wget
    success "git installed"
else
    success "git already installed"
fi

# Install Docker if missing
if ! command -v docker &>/dev/null; then
    log "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable --now docker
    success "Docker installed"
else
    success "Docker already installed ($(docker --version | cut -d' ' -f3 | tr -d ','))"
fi

# Ensure Docker Compose v2 plugin is available
if ! docker compose version &>/dev/null; then
    log "Installing Docker Compose plugin..."
    apt-get install -y -qq docker-compose-plugin
    success "Docker Compose v2 installed"
else
    success "Docker Compose already available ($(docker compose version --short))"
fi

# ── Step 2: Clone repository with all submodules ─────────────────────────────
section "Step 2/6 — Cloning Repository"

if [[ -d "$INSTALL_DIR/.git" ]]; then
    warn "Existing installation found at $INSTALL_DIR"
    log "Pulling latest changes and updating submodules..."
    cd "$INSTALL_DIR"
    git pull --ff-only
    git submodule update --init --recursive --jobs 8
    success "Repository updated"
else
    log "Cloning Aivory to $INSTALL_DIR..."
    git clone --recursive --jobs 8 "$REPO_URL" "$INSTALL_DIR"
    success "Repository cloned with all submodules"
fi

cd "$INSTALL_DIR"

# ── Step 3: Configure environment ────────────────────────────────────────────
section "Step 3/6 — Environment Configuration"

if [[ -f "$INSTALL_DIR/.env" ]]; then
    warn ".env already exists — skipping template copy"
    log "Edit $INSTALL_DIR/.env if you need to change settings"
else
    cp "$INSTALL_DIR/.env.production.example" "$INSTALL_DIR/.env"
    warn "⚠  .env created from template. You MUST configure it before services start."
    echo ""
    echo -e "  ${YELLOW}Required values to fill in:${NC}"
    echo "    • ACME_EMAIL         — your email for Let's Encrypt TLS"
    echo "    • SUPABASE_URL       — your Supabase project URL"
    echo "    • SUPABASE_JWT_SECRET — from Supabase project settings"
    echo "    • NEXT_PUBLIC_SUPABASE_URL / ANON_KEY"
    echo "    • OPENROUTER_API_KEY — for ZeroClaw AI"
    echo "    • JWT_SECRET         — strong random string"
    echo "    • N8N_BASIC_AUTH_PASSWORD — n8n admin password"
    echo "    • INTERNAL_TOKEN     — strong random string"
    echo ""
    echo -e "  ${CYAN}Open the file:${NC}"
    echo "    nano $INSTALL_DIR/.env"
    echo ""

    read -rp "  Press ENTER when you've configured .env, or Ctrl+C to exit and edit now: "
fi

# Validate critical env vars
source "$INSTALL_DIR/.env" 2>/dev/null || true

if [[ -z "${ACME_EMAIL:-}" ]]; then
    error "ACME_EMAIL is not set in .env. Required for TLS certificates."
fi
if [[ -z "${OPENROUTER_API_KEY:-}" || "${OPENROUTER_API_KEY}" == "sk-or-v1-your-key" ]]; then
    warn "OPENROUTER_API_KEY is not configured. ZeroClaw AI will not work."
fi
if [[ -z "${SUPABASE_URL:-}" || "${SUPABASE_URL}" == "https://your-project.supabase.co" ]]; then
    warn "SUPABASE_URL is not configured. Auth/database features will not work."
fi

success "Environment configuration validated"

# ── Step 4: Create Docker network ────────────────────────────────────────────
section "Step 4/6 — Docker Network"

if docker network ls | grep -q "aivory-network"; then
    success "Docker network 'aivory-network' already exists"
else
    docker network create aivory-network
    success "Docker network 'aivory-network' created"
fi

# ── Step 5: Start Traefik ─────────────────────────────────────────────────────
section "Step 5/6 — Starting Traefik (Reverse Proxy + TLS)"

log "Starting Traefik..."
docker compose -f "$INSTALL_DIR/docker-compose.traefik.yml" up -d --pull always

# Wait for Traefik
sleep 5
if docker inspect avry-traefik &>/dev/null; then
    success "Traefik is running"
else
    error "Traefik failed to start. Check: docker logs avry-traefik"
fi

# ── Step 6: Start all platform services ──────────────────────────────────────
section "Step 6/6 — Starting Platform Services"

log "Running deployment script..."
chmod +x "$INSTALL_DIR/scripts/deploy-production.sh"
bash "$INSTALL_DIR/scripts/deploy-production.sh"

# ── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}"
echo "  ╔══════════════════════════════════════════╗"
echo "  ║        INSTALLATION COMPLETE! ✓          ║"
echo "  ╚══════════════════════════════════════════╝"
echo -e "${NC}"
echo -e "  ${CYAN}Platform URLs (after DNS propagation):${NC}"
echo "    • Website:         https://aivory.id"
echo "    • User Dashboard:  https://dashboard.aivory.id"
echo "    • Admin Panel:     https://admin.aivory.id"
echo "    • AI Console:      https://console.aivory.id"
echo "    • API Gateway:     https://api.aivory.id"
echo "    • n8n Automation:  https://n8n.aivory.id"
echo "    • Monitoring:      https://monitoring.aivory.id"
echo ""
echo -e "  ${CYAN}Useful commands:${NC}"
echo "    • Check all services:  docker ps --format 'table {{.Names}}\t{{.Status}}'"
echo "    • View logs:           docker compose -f docker-compose.production.yml logs -f <name>"
echo "    • Restart a service:   docker compose -f docker-compose.production.yml restart <name>"
echo "    • Update platform:     bash $INSTALL_DIR/scripts/update.sh"
echo "    • Stop everything:     docker compose -f docker-compose.production.yml down"
echo ""
echo -e "  ${YELLOW}Next steps:${NC}"
echo "    1. Point your DNS records to this server's IP"
echo "    2. Wait for Let's Encrypt to issue TLS certificates (up to 2 minutes)"
echo "    3. Visit https://aivory.id to verify the platform is live"
echo "    4. Configure n8n API key in .env (see n8n.aivory.id → Settings → API)"
echo ""
