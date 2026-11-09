#!/usr/bin/env bash
# deploy-mira.sh — put Mira (marketing_content) on the Cerveau VPS: native-bridge tool,
# skill bundle, workspace identities, Cerveau config. Run from your Mac.
#
#   ops/deploy/deploy-mira.sh [--dry-run]
#
# Not in this script (normal PR-merge deploys, do them AFTER this one succeeds):
#   ops/deploy/deploy-ivo-services.sh  (avry-backend -> aivory-collab -> user-dashboard)
# Backend must be live before the dashboard, or the dashboard's Mira card 400s.
#
# Safe to re-run: every step is idempotent. On an unhealthy Cerveau it restores
# the config.toml, identity files and bridge files it backed up and restarts.
#
# Env overrides: SSH_HOST (aivory-prod), CERVEAU_SKILLS_DIR (marketing-content bundle),
# BACKEND_DIR (for the catalog migration).
set -euo pipefail

HOST="${SSH_HOST:-aivory-prod}"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SKILLS_SRC="${CERVEAU_SKILLS_DIR:-$HOME/Documents/Aivory-wt/cerveau-mira/cerveau-skills/marketing-content}"
BACKEND_DIR="${BACKEND_DIR:-$REPO/backend/avry-backend}"
DRY=0; [ "${1:-}" = "--dry-run" ] && DRY=1

say() { printf '\n== %s\n' "$*"; }
die() { printf 'ABORT: %s\n' "$*" >&2; exit 1; }

say "Preflight (local)"
BRIDGE="$REPO/services/aivory-native-bridge"
for f in "$BRIDGE/server.mjs" "$BRIDGE/utm.mjs" "$BRIDGE/agents/marketing-content.mjs" \
         "$SKILLS_SRC/content-rules/SKILL.md" "$SKILLS_SRC/slop-catalogue/SKILL.md" "$SKILLS_SRC/content-calendar/SKILL.md" \
         "$SKILLS_SRC/channel-drafts/SKILL.md" "$SKILLS_SRC/campaign-brief/SKILL.md" \
         "$REPO/ops/cerveau-config/config.redacted.toml" "$REPO/ops/deploy/apply_mira_config.py" \
         "$REPO/services/cerveau/agents/marketing_content/workspace/IDENTITY.md"; do
  [ -f "$f" ] || die "missing $f"
done
node --check "$BRIDGE/server.mjs" && node --check "$BRIDGE/agents/marketing-content.mjs" && node --check "$BRIDGE/utm.mjs"
python3 -m py_compile "$REPO/ops/deploy/apply_mira_config.py"
( cd "$BRIDGE" && npm test --silent 2>&1 | grep -E "^ℹ (tests|pass|fail)" )
grep -q '^\[agents.operations_inventory\]' "$REPO/ops/cerveau-config/config.redacted.toml" || die "mirror has no [agents.marketing_content]"
echo "preflight ok"

say "Package"
STAGE="$(mktemp -d)"; trap 'rm -rf "$STAGE"' EXIT
mkdir -p "$STAGE/bridge/agents" "$STAGE/skills" "$STAGE/identity" "$STAGE/config"
cp "$BRIDGE/server.mjs" "$BRIDGE/utm.mjs" "$STAGE/bridge/"
cp "$BRIDGE/agents/marketing-content.mjs" "$STAGE/bridge/agents/"
cp -R "$SKILLS_SRC" "$STAGE/skills/marketing-content"
# Only Mira's own identity is installed from the repo. The existing identities are
# edited in place on the VPS (teammate line; Aira also gets Mira in her roster),
# so any prod-only edits survive.
mkdir -p "$STAGE/identity/marketing_content"
cp "$REPO/services/cerveau/agents/marketing_content/workspace/IDENTITY.md" "$STAGE/identity/marketing_content/IDENTITY.md"
cp "$REPO/ops/cerveau-config/config.redacted.toml" "$STAGE/config/block.toml"
cp "$REPO/ops/deploy/apply_mira_config.py" "$STAGE/config/"
[ -f "$BACKEND_DIR/migrations/2026-11-09-agent-catalog-marketing-content.sql" ] \
  && cp "$BACKEND_DIR/migrations/2026-11-09-agent-catalog-marketing-content.sql" "$STAGE/config/catalog.sql"
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

echo "-- backups (*.bak-pre-mira-$TS)"
sudo cp -p "$C/config.toml" "$C/config.toml.bak-pre-mira-$TS"
for f in server.mjs utm.mjs agents/marketing-content.mjs; do
  [ -f "$B/$f" ] && sudo cp -p "$B/$f" "$B/$f.bak-pre-mira-$TS" || true
done
for a in autonomous customer_service leads_qualifier finance_invoice_ops office_assistant data_analyst operations_inventory chief_of_staff marketing_content; do
  f="$C/agents/$a/workspace/IDENTITY.md"
  [ -f "$f" ] && sudo cp -p "$f" "$f.bak-pre-mira-$TS" || true
done

rollback() {
  echo "NOT HEALTHY, rolling back"
  sudo cp -p "$C/config.toml.bak-pre-mira-$TS" "$C/config.toml"
  for a in autonomous customer_service leads_qualifier finance_invoice_ops office_assistant data_analyst operations_inventory chief_of_staff marketing_content; do
    f="$C/agents/$a/workspace/IDENTITY.md"
    [ -f "$f.bak-pre-mira-$TS" ] && sudo cp -p "$f.bak-pre-mira-$TS" "$f" || true
  done
  [ -f "$B/server.mjs.bak-pre-mira-$TS" ] && sudo cp -p "$B/server.mjs.bak-pre-mira-$TS" "$B/server.mjs" || true
  sudo systemctl restart aivory-native-bridge || true
  sudo systemctl restart zeroclaw-cerveau || true
  exit 1
}

echo "-- 1/5 native bridge"
sudo install -o ubuntu -g ubuntu -m 644 "$D/bridge/server.mjs" "$B/server.mjs"
sudo install -o ubuntu -g ubuntu -m 644 "$D/bridge/utm.mjs" "$B/utm.mjs"
sudo install -o ubuntu -g ubuntu -m 644 "$D/bridge/agents/marketing-content.mjs" "$B/agents/marketing-content.mjs"
sudo systemctl restart aivory-native-bridge
ok=0
for i in $(seq 1 15); do sleep 1
  if curl -fsS http://127.0.0.1:4100/healthz 2>/dev/null | grep -q marketing_content; then ok=1; break; fi
done
if [ "$ok" != 1 ]; then
  echo "bridge did not come up with marketing_content"; sudo journalctl -u aivory-native-bridge -n 20 --no-pager || true
  rollback
fi
echo "bridge healthy: $(curl -fsS http://127.0.0.1:4100/healthz)"

echo "-- 2/5 skills"
sudo install -d -o ubuntu -g ubuntu "$C/cerveau-skills"
sudo rm -rf "$C/cerveau-skills/marketing-content"
sudo cp -R "$D/skills/marketing-content" "$C/cerveau-skills/marketing-content"
sudo chown -R ubuntu:ubuntu "$C/cerveau-skills/marketing-content"

echo "-- 3/5 identities"
sudo install -D -o ubuntu -g ubuntu -m 644 "$D/identity/marketing_content/IDENTITY.md" "$C/agents/marketing_content/workspace/IDENTITY.md"
# Add Mira to the teammate line of the existing worker agents (idempotent, one line).
for a in autonomous customer_service leads_qualifier finance_invoice_ops office_assistant data_analyst operations_inventory; do
  f="$C/agents/$a/workspace/IDENTITY.md"
  if [ -f "$f" ] && ! sudo grep -q 'Mira (Marketing & Content Agent)' "$f"; then
    sudo sed -i 's/Juno (Operations & Inventory Agent)\. This section/Juno (Operations \& Inventory Agent), Mira (Marketing \& Content Agent). This section/' "$f"
    sudo grep -q 'Mira (Marketing & Content Agent)' "$f" && echo "  $a: teammate line updated" || echo "  $a: teammate line NOT found (left unchanged)"
  fi
done
# Aira's roster: add Mira (idempotent).
f="$C/agents/chief_of_staff/workspace/IDENTITY.md"
if [ -f "$f" ] && ! sudo grep -q 'Mira =' "$f"; then
  sudo python3 - "$f" <<'PY'
import sys
p = sys.argv[1]
s = open(p).read()
pairs = [
  ("Finn, Ofira, Ivo, and Juno so the operator gets one coherent outcome instead of\nseven uncoordinated replies.",
   "Finn, Ofira, Ivo, Juno, and Mira so the operator gets one coherent outcome instead of\neight uncoordinated replies."),
  ("Ivo = `data_analyst`, and Juno =\n`operations_inventory`. Always delegate",
   "Ivo = `data_analyst`, Juno =\n`operations_inventory`, and Mira = `marketing_content`. Always delegate"),
  ("(`operations_inventory`)\n",
   "(`operations_inventory`)\n- Mira: Marketing & Content Agent, content calendars, channel drafts, campaign links (`marketing_content`)\n"),
  ("purchase-order work to Juno; they draft",
   "purchase-order work to Juno, and content calendars, channel copy and campaign\n  links to Mira; they draft"),
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

echo "-- 4/5 config"
sudo python3 "$D/config/apply_mira_config.py" "$C/config.toml" "$D/config/block.toml"
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
sudo journalctl -u zeroclaw-cerveau --since "-2 min" --no-pager | grep -iE "marketing[-_]content|error|warn" | tail -15 || true

if [ -f "$D/config/catalog.sql" ]; then
  echo "-- catalog row (non-fatal)"
  sudo docker exec -i avry-postgres sh -c 'psql -U "$POSTGRES_USER" -d "${POSTGRES_DB:-$POSTGRES_USER}" -v ON_ERROR_STOP=1' < "$D/config/catalog.sql" \
    || echo "catalog insert failed; run backend/avry-backend/migrations/2026-11-09-agent-catalog-marketing-content.sql by hand"
fi
rm -rf "$D"
echo "DONE. backups: *.bak-pre-mira-$TS"
REMOTE
echo
echo "Next: ops/deploy/deploy-ivo-services.sh (backend -> collab -> dashboard)."
