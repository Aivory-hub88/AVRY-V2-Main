#!/usr/bin/env bash
# deploy-departments-d1.sh — ADR-025 phase D1 on the Cerveau VPS: department edges, leaders' depth 2, Geno
# re-scoped to task and follow-up keeper. Run from your Mac. Touches only Cerveau config.toml and the
# workspace IDENTITY.md files. Nothing here touches the backend, the bridge or the dashboard.
#
#   ops/deploy/deploy-departments-d1.sh [--dry-run]
#
# --dry-run: local checks only (compile, patcher on a throwaway copy of the mirror: applied, then idempotent,
# identities on a throwaway copy of the agents dir). Nothing is sent to the VPS.
#
# Order: merge and deploy the backend + dashboard PRs first (Geno's new title), then run this. The edges and
# the Geno scope go live on the Cerveau restart. Announce the Geno change to current Geno users before running.
#
# Safe to re-run: every step is idempotent. On an unhealthy Cerveau it restores the config.toml and the
# identity files it backed up (*.bak-pre-deptd1-TS) and restarts.
#
# Env override: SSH_HOST (aivory-prod).
set -euo pipefail

HOST="${SSH_HOST:-aivory-prod}"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DRY=0; [ "${1:-}" = "--dry-run" ] && DRY=1

say() { printf '\n== %s\n' "$*"; }
die() { printf 'ABORT: %s\n' "$*" >&2; exit 1; }

say "Preflight (local)"
for f in "$REPO/ops/cerveau-config/config.redacted.toml" "$REPO/ops/deploy/apply_departments_d1.py" \
         "$REPO/services/cerveau/agents/autonomous/workspace/IDENTITY.md"; do
  [ -f "$f" ] || die "missing $f"
done
python3 -m py_compile "$REPO/ops/deploy/apply_departments_d1.py"
python3 - "$REPO/ops/cerveau-config/config.redacted.toml" <<'PY'
import sys, tomllib
d = tomllib.load(open(sys.argv[1], "rb"))
assert d["agents"]["autonomous"]["skill_bundles"] == ["tool-gate"], "mirror does not have the re-scoped Geno"
PY
SCRATCH="$(mktemp -d)"; STAGE=""; trap 'rm -rf "$SCRATCH" "$STAGE"' EXIT
cp "$REPO/ops/cerveau-config/config.redacted.toml" "$SCRATCH/c.toml"
python3 "$REPO/ops/deploy/apply_departments_d1.py" config "$SCRATCH/c.toml"          # mirror is already applied: no change
python3 "$REPO/ops/deploy/apply_departments_d1.py" config "$SCRATCH/c.toml" --check
cp -R "$REPO/services/cerveau/agents" "$SCRATCH/agents"
python3 "$REPO/ops/deploy/apply_departments_d1.py" identities "$SCRATCH/agents" --check
echo "preflight ok"

say "Package"
STAGE="$(mktemp -d)"
mkdir -p "$STAGE/identity/autonomous" "$STAGE/config"
cp "$REPO/services/cerveau/agents/autonomous/workspace/IDENTITY.md" "$STAGE/identity/autonomous/IDENTITY.md"
cp "$REPO/ops/deploy/apply_departments_d1.py" "$STAGE/config/"
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

echo "-- backups (*.bak-pre-deptd1-$TS)"
sudo cp -p "$C/config.toml" "$C/config.toml.bak-pre-deptd1-$TS"
for a in $AGENTS; do
  f="$C/agents/$a/workspace/IDENTITY.md"
  [ -f "$f" ] && sudo cp -p "$f" "$f.bak-pre-deptd1-$TS" || true
done

rollback() {
  echo "NOT HEALTHY, rolling back"
  sudo cp -p "$C/config.toml.bak-pre-deptd1-$TS" "$C/config.toml"
  for a in $AGENTS; do
    f="$C/agents/$a/workspace/IDENTITY.md"
    [ -f "$f.bak-pre-deptd1-$TS" ] && sudo cp -p "$f.bak-pre-deptd1-$TS" "$f" || true
  done
  sudo systemctl restart zeroclaw-cerveau || true
  exit 1
}

echo "-- 1/3 identities (Geno whole; the rest get the department team sentence, Aira her roster lines)"
sudo install -D -o ubuntu -g ubuntu -m 644 "$D/identity/autonomous/IDENTITY.md" "$C/agents/autonomous/workspace/IDENTITY.md"
sudo python3 "$D/config/apply_departments_d1.py" identities "$C/agents"
sudo chown -R ubuntu:ubuntu "$C/agents"

echo "-- 2/3 config (edges, leaders depth 2, Geno re-scope)"
sudo python3 "$D/config/apply_departments_d1.py" config "$C/config.toml"
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
sudo journalctl -u zeroclaw-cerveau --since "-2 min" --no-pager | grep -iE "error|warn" | tail -15 || true
rm -rf "$D"
echo "DONE. backups: *.bak-pre-deptd1-$TS"
echo "Rollback by hand: restore config.toml.bak-pre-deptd1-$TS and the IDENTITY.md.bak-pre-deptd1-$TS files, then restart zeroclaw-cerveau."
REMOTE
