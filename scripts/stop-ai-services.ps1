# ─── Aivory AI Services Stop Script ────────────────────────────────────────
$rootDir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

Write-Host "Stopping ZeroClaw services..." -ForegroundColor Yellow
docker compose -f "$rootDir\services\avry-zeroclaw\docker-compose.yml" down

Write-Host "Stopping n8n services..." -ForegroundColor Yellow
docker compose -f "$rootDir\services\avry-n8n\docker-compose.yml" down

Write-Host "All AI services stopped." -ForegroundColor Green
