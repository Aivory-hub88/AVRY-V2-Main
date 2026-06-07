# ─── Aivory Local Development Stack ─────────────────────────────────────────
# Starts ALL services for local verification. No Traefik, direct port access.
# Requires: Docker Desktop running, root .env configured (copy from .env.example)
#
# Usage:
#   .\scripts\start-local.ps1
#
# Access after startup:
#   Website:          http://localhost:9000
#   User Dashboard:   http://localhost:9001
#   Admin Dashboard:  http://localhost:9002
#   AI Console:       http://localhost:8086
#   AI Gateway:       http://localhost:8090
#   n8n Editor:       http://localhost:5678
#   Backend API:      http://localhost:8081
# ─────────────────────────────────────────────────────────────────────────────

$ErrorActionPreference = "Stop"
$rootDir = "c:\Users\user\Documents\Software-Developer\Freelancer\aivery"

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  AIVORY Local Stack — Starting All Services" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Ensure root .env exists
if (-not (Test-Path "$rootDir\.env")) {
    Write-Host "  ⚠ No root .env found — copying from .env.example" -ForegroundColor DarkYellow
    Copy-Item "$rootDir\.env.example" "$rootDir\.env"
    Write-Host "  → Edit $rootDir\.env and add your API keys, then re-run this script." -ForegroundColor Yellow
    exit 1
}

# Step 1: Create shared network
Write-Host "[1/3] Ensuring Docker network 'aivory-network' exists..." -ForegroundColor Yellow
docker network create aivory-network 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  → Network already exists (OK)" -ForegroundColor DarkGray
} else {
    Write-Host "  → Network created" -ForegroundColor Green
}

# Step 2: Start infrastructure first (n8n + zeroclaw are dependencies for other services)
Write-Host ""
Write-Host "[2/3] Starting infrastructure (n8n + ZeroClaw)..." -ForegroundColor Yellow

docker compose -f "$rootDir\docker-compose.local.yml" up -d --build avry-n8n avry-n8n-mcp avry-n8n-as-code avry-zeroclaw-daemon avry-zeroclaw
Write-Host "  → Infrastructure services started" -ForegroundColor Green

Write-Host "  Waiting 10s for n8n to become healthy..." -ForegroundColor DarkGray
Start-Sleep -Seconds 10

# Step 3: Start all application services
Write-Host ""
Write-Host "[3/3] Starting all application services..." -ForegroundColor Yellow

docker compose -f "$rootDir\docker-compose.local.yml" up -d --build `
    avry-backend `
    avry-diagnostics `
    avry-blueprint `
    avry-roadmaps `
    avry-payments `
    avry-console `
    avry-workflows `
    avry-blog `
    avry-careers `
    avry-website `
    avry-user-dashboard `
    avry-admin-dashboards

Write-Host "  → All application services started" -ForegroundColor Green

# Summary
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Local stack running!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Frontend:" -ForegroundColor White
Write-Host "    • Website:         http://localhost:9000" -ForegroundColor Gray
Write-Host "    • User Dashboard:  http://localhost:9001" -ForegroundColor Gray
Write-Host "    • Admin Dashboard: http://localhost:9002" -ForegroundColor Gray
Write-Host "    • AI Console:      http://localhost:8086" -ForegroundColor Gray
Write-Host ""
Write-Host "  Infrastructure:" -ForegroundColor White
Write-Host "    • AI Gateway:      http://localhost:8090" -ForegroundColor Gray
Write-Host "    • n8n Editor:      http://localhost:5678" -ForegroundColor Gray
Write-Host ""
Write-Host "  Backend:" -ForegroundColor White
Write-Host "    • Core API:        http://localhost:8081" -ForegroundColor Gray
Write-Host "    • Diagnostics:     http://localhost:8082" -ForegroundColor Gray
Write-Host "    • Blueprint:       http://localhost:8083" -ForegroundColor Gray
Write-Host "    • Roadmaps:        http://localhost:8084" -ForegroundColor Gray
Write-Host "    • Payments:        http://localhost:8085" -ForegroundColor Gray
Write-Host "    • Workflows:       http://localhost:8087" -ForegroundColor Gray
Write-Host "    • Blog:            http://localhost:8088" -ForegroundColor Gray
Write-Host "    • Careers:         http://localhost:8089" -ForegroundColor Gray
Write-Host ""
Write-Host "  Health check:" -ForegroundColor White
Write-Host "    docker ps --format 'table {{.Names}}`t{{.Status}}'" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Stop everything:" -ForegroundColor White
Write-Host "    docker compose -f docker-compose.local.yml down" -ForegroundColor DarkGray
Write-Host ""
