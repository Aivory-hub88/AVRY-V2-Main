#!/usr/bin/env bash
# deploy-nara.sh — put Nara (deep_researcher) on the Cerveau VPS: workspace identities and
# Cerveau config. Run from your Mac. Nothing here touches the native bridge or skills.
#
#   ops/deploy/deploy-nara.sh [--dry-run]
#
# Order matters (same as Mira): run this, then the normal PR-merge deploys
#   ops/deploy/deploy-ivo-services.sh  (avry-backend -> aivory-collab -> user-dashboard)
# Backend must be live before the dashboard, or the dashboard's Nara card 400s.
#
# Search: Tavily is the primary search for every agent ([web_search] provider and key, set here from
# TAVILY_API_KEY in /etc/zeroclaw-cerveau.env; the key is never printed); Nara opens and reads sources
# in the obscura browser and falls back to browser search if Tavily fails. Re-running replaces the Nara
# block with the current mirror (--replace), so edits to the block roll out.
#
# Safe to re-run: every step is idempotent. On an unhealthy Cerveau it restores the
# config.toml and identity files it backed up and restarts.
#
# Env overrides: SSH_HOST (aivory-prod), BACKEND_DIR (for the catalog migration).
set -euo pipefail

HOST="${SSH_HOST:-aivory-prod}"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_DIR="${BACKEND_DIR:-$REPO/backend/avry-backend}"
DRY=0; [ "${1:-}" = "--dry-run" ] && DRY=1

say() { printf '\n== %s\n' "$*"; }
die() { printf 'ABORT: %s\n' "$*" >&2; exit 1; }

say "Preflight (local)"
for f in "$REPO/ops/cerveau-config/config.redacted.toml" "$REPO/ops/deploy/apply_nara_config.py" \
         "$REPO/services/cerveau/agents/deep_researcher/workspace/IDENTITY.md"; do
  [ -f "$f" ] || die "missing $f"
done
python3 -m py_compile "$REPO/ops/deploy/apply_nara_config.py"
grep -q '^\[agents.deep_researcher\]' "$REPO/ops/cerveau-config/config.redacted.toml" || die "mirror has no [agents.deep_researcher]"
echo "preflight ok"

say "Package"
STAGE="$(mktemp -d)"; trap 'rm -rf "$STAGE"' EXIT
mkdir -p "$STAGE/identity/deep_researcher" "$STAGE/config"
cp "$REPO/services/cerveau/agents/deep_researcher/workspace/IDENTITY.md" "$STAGE/identity/deep_researcher/IDENTITY.md"
cp "$REPO/ops/cerveau-config/config.redacted.toml" "$STAGE/config/block.toml"
cp "$REPO/ops/deploy/apply_nara_config.py" "$STAGE/config/"
[ -f "$BACKEND_DIR/migrations/2026-11-21-agent-catalog-deep-researcher.sql" ] \
  && cp "$BACKEND_DIR/migrations/2026-11-21-agent-catalog-deep-researcher.sql" "$STAGE/config/catalog.sql"
tar -czf "$STAGE/payload.tgz" -C "$STAGE" identity config
ls -la "$STAGE/payload.tgz" | awk '{print "payload", $5, "bytes"}'

if [ "$DRY" = 1 ]; then
  say "Dry run: nothing sent. Remote steps would be: backup -> identities -> config -> restart -> health (rollback on failure)."
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
TS=$(date +%Y%m%d-%H%M%S)
AGENTS="autonomous customer_service leads_qualifier finance_invoice_ops office_assistant data_analyst operations_inventory marketing_content chief_of_staff deep_researcher"
tar -xzf "$D/payload.tgz" -C "$D"

echo "-- backups (*.bak-pre-nara-$TS)"
sudo cp -p "$C/config.toml" "$C/config.toml.bak-pre-nara-$TS"
for a in $AGENTS; do
  f="$C/agents/$a/workspace/IDENTITY.md"
  [ -f "$f" ] && sudo cp -p "$f" "$f.bak-pre-nara-$TS" || true
done

rollback() {
  echo "NOT HEALTHY, rolling back"
  sudo cp -p "$C/config.toml.bak-pre-nara-$TS" "$C/config.toml"
  for a in $AGENTS; do
    f="$C/agents/$a/workspace/IDENTITY.md"
    [ -f "$f.bak-pre-nara-$TS" ] && sudo cp -p "$f.bak-pre-nara-$TS" "$f" || true
  done
  sudo systemctl restart zeroclaw-cerveau || true
  exit 1
}

echo "-- 1/3 identities"
sudo install -D -o ubuntu -g ubuntu -m 644 "$D/identity/deep_researcher/IDENTITY.md" "$C/agents/deep_researcher/workspace/IDENTITY.md"
# Add Nara to the teammate line of the existing worker agents (idempotent, one line).
for a in autonomous customer_service leads_qualifier finance_invoice_ops office_assistant data_analyst operations_inventory marketing_content; do
  f="$C/agents/$a/workspace/IDENTITY.md"
  if [ -f "$f" ] && ! sudo grep -q 'Nara (Research & Evidence Agent)' "$f"; then
    sudo sed -i 's/Mira (Marketing & Content Agent)\. This section/Mira (Marketing \& Content Agent), Nara (Research \& Evidence Agent). This section/' "$f"
    sudo grep -q 'Nara (Research & Evidence Agent)' "$f" && echo "  $a: teammate line updated" || echo "  $a: teammate line NOT found (left unchanged)"
  fi
done
# Aira's roster: add Nara (idempotent).
f="$C/agents/chief_of_staff/workspace/IDENTITY.md"
if [ -f "$f" ] && ! sudo grep -q 'Nara =' "$f"; then
  sudo python3 - "$f" <<'PY'
import sys
p = sys.argv[1]
s = open(p).read()
pairs = [
  ("Finn, Ofira, Ivo, Juno, and Mira so the operator gets one coherent outcome instead of\neight uncoordinated replies.",
   "Finn, Ofira, Ivo, Juno, Mira, and Nara so the operator gets one coherent outcome instead of\nnine uncoordinated replies."),
  ("and Mira = `marketing_content`. Always delegate",
   "Mira = `marketing_content`, and Nara = `deep_researcher`. Always delegate"),
  ("campaign links (`marketing_content`)\n",
   "campaign links (`marketing_content`)\n- Nara: Research & Evidence Agent, source-cited research on companies, markets and regulations, read-only (`deep_researcher`)\n"),
]
miss = [a[:40] for a, b in pairs if a not in s]
if miss:
    print("  chief_of_staff: roster text differs on prod, left unchanged:", miss)
    sys.exit(0)
for a, b in pairs:
    s = s.replace(a, b, 1)
open(p, "w").write(s)
print("  chief_of_staff: roster updated")
PY
  sudo chown ubuntu:ubuntu "$f"
fi

echo "-- 2/3 config"
sudo python3 "$D/config/apply_nara_config.py" "$C/config.toml" "$D/config/block.toml" --replace --tavily-env /etc/zeroclaw-cerveau.env --loop-guard
sudo chown ubuntu:ubuntu "$C/config.toml"

echo "-- 3/3 restart cerveau"
sudo systemctl restart zeroclaw-cerveau
ok=0
for i in $(seq 1 30); do sleep 2
  if systemctl is-active --quiet zeroclaw-cerveau && curl -fsS -o /dev/null http://127.0.0.1:3100/health 2>/dev/null; then ok=1; break; fi
done
[ "$ok" = 1 ] || { sudo journalctl -u zeroclaw-cerveau -n 40 --no-pager || true; rollback; }
echo "cerveau HEALTHY"
systemctl show zeroclaw-cerveau -p NRestarts -p ActiveEnterTimestamp
sudo journalctl -u zeroclaw-cerveau --since "-2 min" --no-pager | grep -iE "deep[-_]researcher|error|warn" | tail -15 || true

if [ -f "$D/config/catalog.sql" ]; then
  echo "-- catalog row (non-fatal)"
  sudo docker exec -i avry-postgres sh -c 'psql -U "$POSTGRES_USER" -d "${POSTGRES_DB:-$POSTGRES_USER}" -v ON_ERROR_STOP=1' < "$D/config/catalog.sql" \
    || echo "catalog insert failed; run backend/avry-backend/migrations/2026-11-21-agent-catalog-deep-researcher.sql by hand"
fi
rm -rf "$D"
echo "DONE. backups: *.bak-pre-nara-$TS"
REMOTE
echo
echo "Next: ops/deploy/deploy-ivo-services.sh (backend -> collab -> dashboard)."
