#!/usr/bin/env bash
# deploy-ivo.sh — put Ivo (data_analyst) on the Cerveau VPS: native-bridge tools,
# skill bundle, workspace identities, Cerveau config. Run from your Mac.
#
#   ops/deploy/deploy-ivo.sh [--dry-run]
#
# Not in this script (normal PR-merge deploys, do them AFTER this one succeeds):
#   avry-backend (roster + catalog migration)  ->  aivory-collab  ->  user-dashboard
# Backend must be live before the dashboard, or the dashboard's Ivo card 400s.
#
# Safe to re-run: every step is idempotent. On an unhealthy Cerveau it restores
# the config.toml, identity files and bridge files it backed up and restarts.
#
# Env overrides: SSH_HOST (aivory-prod), CERVEAU_SKILLS_DIR (data-analyst bundle),
# BACKEND_DIR (for the catalog migration).
set -euo pipefail

HOST="${SSH_HOST:-aivory-prod}"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SKILLS_SRC="${CERVEAU_SKILLS_DIR:-$HOME/Documents/Aivory-wt/cerveau-ivo/cerveau-skills/data-analyst}"
BACKEND_DIR="${BACKEND_DIR:-$REPO/backend/avry-backend}"
DRY=0; [ "${1:-}" = "--dry-run" ] && DRY=1

say() { printf '\n== %s\n' "$*"; }
die() { printf 'ABORT: %s\n' "$*" >&2; exit 1; }

say "Preflight (local)"
BRIDGE="$REPO/services/aivory-native-bridge"
for f in "$BRIDGE/server.mjs" "$BRIDGE/kpi.mjs" "$BRIDGE/agents/data-analyst.mjs" \
         "$SKILLS_SRC/analyst-rules/SKILL.md" "$SKILLS_SRC/weekly-report/SKILL.md" \
         "$REPO/ops/cerveau-config/config.redacted.toml" "$REPO/ops/deploy/apply_ivo_config.py" \
         "$REPO/services/cerveau/agents/data_analyst/workspace/IDENTITY.md"; do
  [ -f "$f" ] || die "missing $f"
done
node --check "$BRIDGE/server.mjs" && node --check "$BRIDGE/agents/data-analyst.mjs" && node --check "$BRIDGE/kpi.mjs"
python3 -m py_compile "$REPO/ops/deploy/apply_ivo_config.py"
( cd "$BRIDGE" && npm test --silent 2>&1 | grep -E "^ℹ (tests|pass|fail)" )
grep -q '^\[agents.data_analyst\]' "$REPO/ops/cerveau-config/config.redacted.toml" || die "mirror has no [agents.data_analyst]"
echo "preflight ok"

say "Package"
STAGE="$(mktemp -d)"; trap 'rm -rf "$STAGE"' EXIT
mkdir -p "$STAGE/bridge/agents" "$STAGE/skills" "$STAGE/identity" "$STAGE/config"
cp "$BRIDGE/server.mjs" "$BRIDGE/kpi.mjs" "$STAGE/bridge/"
cp "$BRIDGE/agents/data-analyst.mjs" "$STAGE/bridge/agents/"
cp -R "$SKILLS_SRC" "$STAGE/skills/data-analyst"
# Only Ivo's own identity is installed from the repo. The five existing identities
# are edited in place on the VPS (one line), so any prod-only edits survive.
mkdir -p "$STAGE/identity/data_analyst"
cp "$REPO/services/cerveau/agents/data_analyst/workspace/IDENTITY.md" "$STAGE/identity/data_analyst/IDENTITY.md"
cp "$REPO/ops/cerveau-config/config.redacted.toml" "$STAGE/config/block.toml"
cp "$REPO/ops/deploy/apply_ivo_config.py" "$STAGE/config/"
[ -f "$BACKEND_DIR/migrations/2026-11-09-agent-catalog-data-analyst.sql" ] \
  && cp "$BACKEND_DIR/migrations/2026-11-09-agent-catalog-data-analyst.sql" "$STAGE/config/catalog.sql"
tar -czf "$STAGE/payload.tgz" -C "$STAGE" bridge skills identity config
ls -la "$STAGE/payload.tgz" | awk '{print "payload", $5, "bytes"}'

if [ "$DRY" = 1 ]; then
  say "Dry run: nothing sent. Remote steps would be: backup -> bridge -> skills -> identities -> config -> restart -> health (rollback on failure)."
  exit 0
fi

say "Upload"
RTMP="$(ssh "$HOST" 'mktemp -d')"
scp -q "$STAGE/payload.tgz" "$HOST:$RTMP/payload.tgz"

say "Apply on $HOST"
ssh "$HOST" bash -s -- "$RTMP" <<'REMOTE'
set -euo pipefail
D="$1"
C=/home/ubuntu/.zeroclaw-cerveau
B=/home/ubuntu/aivory-native-bridge
TS=$(date +%Y%m%d-%H%M%S)
tar -xzf "$D/payload.tgz" -C "$D"

echo "-- backups (*.bak-pre-ivo-$TS)"
sudo cp -p "$C/config.toml" "$C/config.toml.bak-pre-ivo-$TS"
for f in server.mjs kpi.mjs agents/data-analyst.mjs; do
  [ -f "$B/$f" ] && sudo cp -p "$B/$f" "$B/$f.bak-pre-ivo-$TS" || true
done
for a in autonomous customer_service leads_qualifier finance_invoice_ops office_assistant data_analyst; do
  f="$C/agents/$a/workspace/IDENTITY.md"
  [ -f "$f" ] && sudo cp -p "$f" "$f.bak-pre-ivo-$TS" || true
done

rollback() {
  echo "NOT HEALTHY, rolling back"
  sudo cp -p "$C/config.toml.bak-pre-ivo-$TS" "$C/config.toml"
  for a in autonomous customer_service leads_qualifier finance_invoice_ops office_assistant data_analyst; do
    f="$C/agents/$a/workspace/IDENTITY.md"
    [ -f "$f.bak-pre-ivo-$TS" ] && sudo cp -p "$f.bak-pre-ivo-$TS" "$f" || true
  done
  [ -f "$B/server.mjs.bak-pre-ivo-$TS" ] && sudo cp -p "$B/server.mjs.bak-pre-ivo-$TS" "$B/server.mjs" || true
  sudo systemctl restart aivory-native-bridge || true
  sudo systemctl restart zeroclaw-cerveau || true
  exit 1
}

echo "-- 1/5 native bridge"
sudo install -o ubuntu -g ubuntu -m 644 "$D/bridge/server.mjs" "$B/server.mjs"
sudo install -o ubuntu -g ubuntu -m 644 "$D/bridge/kpi.mjs" "$B/kpi.mjs"
sudo install -o ubuntu -g ubuntu -m 644 "$D/bridge/agents/data-analyst.mjs" "$B/agents/data-analyst.mjs"
sudo systemctl restart aivory-native-bridge
ok=0
for i in $(seq 1 15); do sleep 1
  if curl -fsS http://127.0.0.1:4100/healthz 2>/dev/null | grep -q data_analyst; then ok=1; break; fi
done
if [ "$ok" != 1 ]; then
  echo "bridge did not come up with data_analyst"; sudo journalctl -u aivory-native-bridge -n 20 --no-pager || true
  rollback
fi
echo "bridge healthy: $(curl -fsS http://127.0.0.1:4100/healthz)"

echo "-- 2/5 skills"
sudo install -d -o ubuntu -g ubuntu "$C/cerveau-skills"
sudo rm -rf "$C/cerveau-skills/data-analyst"
sudo cp -R "$D/skills/data-analyst" "$C/cerveau-skills/data-analyst"
sudo chown -R ubuntu:ubuntu "$C/cerveau-skills/data-analyst"

echo "-- 3/5 identities"
sudo install -D -o ubuntu -g ubuntu -m 644 "$D/identity/data_analyst/IDENTITY.md" "$C/agents/data_analyst/workspace/IDENTITY.md"
# Add Ivo to the teammate line of the five existing agents (idempotent, one line).
for a in autonomous customer_service leads_qualifier finance_invoice_ops office_assistant; do
  f="$C/agents/$a/workspace/IDENTITY.md"
  if [ -f "$f" ] && ! sudo grep -q 'Ivo (Data & Reporting Analyst)' "$f"; then
    sudo sed -i 's/Ofira (Office Assistant)\. This section/Ofira (Office Assistant), Ivo (Data \& Reporting Analyst). This section/' "$f"
    sudo grep -q 'Ivo (Data & Reporting Analyst)' "$f" && echo "  $a: teammate line updated" || echo "  $a: teammate line NOT found (left unchanged)"
  fi
done

echo "-- 4/5 config"
sudo python3 "$D/config/apply_ivo_config.py" "$C/config.toml" "$D/config/block.toml"
sudo chown ubuntu:ubuntu "$C/config.toml"

echo "-- 5/5 restart cerveau"
sudo systemctl restart zeroclaw-cerveau
ok=0
for i in $(seq 1 30); do sleep 2
  if systemctl is-active --quiet zeroclaw-cerveau && curl -fsS -o /dev/null http://127.0.0.1:3100/health 2>/dev/null; then ok=1; break; fi
done
[ "$ok" = 1 ] || { sudo journalctl -u zeroclaw-cerveau -n 40 --no-pager || true; rollback; }
echo "cerveau HEALTHY"
systemctl show zeroclaw-cerveau -p NRestarts -p ActiveEnterTimestamp
sudo journalctl -u zeroclaw-cerveau --since "-2 min" --no-pager | grep -iE "data[-_]analyst|error|warn" | tail -15 || true

if [ -f "$D/config/catalog.sql" ]; then
  echo "-- catalog row (non-fatal)"
  sudo docker exec -i avry-postgres sh -c 'psql -U "$POSTGRES_USER" -d "${POSTGRES_DB:-$POSTGRES_USER}" -v ON_ERROR_STOP=1' < "$D/config/catalog.sql" \
    || echo "catalog insert failed; run backend/avry-backend/migrations/2026-11-09-agent-catalog-data-analyst.sql by hand"
fi
rm -rf "$D"
echo "DONE. backups: *.bak-pre-ivo-$TS"
REMOTE
echo
echo "Next: merge + deploy avry-backend, then aivory-collab, then user-dashboard."
