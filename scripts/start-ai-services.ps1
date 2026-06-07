# ─── Aivory AI Services Startup Script ──────────────────────────────────────
# Starts: n8n + n8n-MCP + n8n-as-code + ZeroClaw + VPS Bridge
# Requires: Docker Desktop running, .env files configured
#
# Port Map:
#   8090 → avry-zeroclaw (VPS Bridge — frontend connects here)
#   5678 → n8n (admin editor UI)
#   3010 → zeroclaw-daemon (internal only)
#   3020 → n8n-mcp (internal only)
#   3500 → n8n-as-code (internal only)
#
# For the full local stack (all services), use: .\scripts\start-local.ps1
# ─────────────────────────────────────────────────────────────────────────────

$ErrorActionPreference = "Stop"
$rootDir = "c:\Users\user\Documents\Software-Developer\Freelancer\aivery"

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  AIVORY AI Services — Starting" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create shared network if not exists
Write-Host "[1/3] Ensuring Docker network 'aivory-network' exists..." -ForegroundColor Yellow
docker network create aivory-network 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  → Network already exists (OK)" -ForegroundColor DarkGray
} else {
    Write-Host "  → Network created" -ForegroundColor Green
}

# Step 2: Start n8n stack (n8n must be healthy before zeroclaw can use MCP)
Write-Host ""
Write-Host "[2/3] Starting n8n services (n8n + n8n-MCP + n8n-as-code)..." -ForegroundColor Yellow

if (-not (Test-Path "$rootDir\services\avry-n8n\.env")) {
    Write-Host "  ⚠ No .env found in services/avry-n8n — copying from .env.example" -ForegroundColor DarkYellow
    Copy-Item "$rootDir\services\avry-n8n\.env.example" "$rootDir\services\avry-n8n\.env"
}

docker compose -f "$rootDir\services\avry-n8n\docker-compose.yml" up --build -d
Write-Host "  → n8n stack started" -ForegroundColor Green

# Step 3: Start zeroclaw stack
Write-Host ""
Write-Host "[3/3] Starting ZeroClaw services (daemon + VPS bridge)..." -ForegroundColor Yellow

if (-not (Test-Path "$rootDir\services\avry-zeroclaw\.env")) {
    Write-Host "  ⚠ No .env found in services/avry-zeroclaw — copying from .env.example" -ForegroundColor DarkYellow
    Copy-Item "$rootDir\services\avry-zeroclaw\.env.example" "$rootDir\services\avry-zeroclaw\.env"
}

docker compose -f "$rootDir\services\avry-zeroclaw\docker-compose.yml" up --build -d
Write-Host "  → ZeroClaw stack started" -ForegroundColor Green

# Summary
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  AI services started!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Services:" -ForegroundColor White
Write-Host "    • n8n Editor:     http://localhost:5678" -ForegroundColor Gray
Write-Host "    • ZeroClaw API:   http://localhost:8090 (connect dashboards here)" -ForegroundColor Gray
Write-Host "    • Health check:   http://localhost:8090/health" -ForegroundColor Gray
Write-Host ""
Write-Host "  For full local stack: .\scripts\start-local.ps1" -ForegroundColor DarkYellow
Write-Host ""
Write-Host "  Logs:" -ForegroundColor White
Write-Host "    docker compose -f services/avry-n8n/docker-compose.yml logs -f" -ForegroundColor DarkGray
Write-Host "    docker compose -f services/avry-zeroclaw/docker-compose.yml logs -f" -ForegroundColor DarkGray
Write-Host ""
