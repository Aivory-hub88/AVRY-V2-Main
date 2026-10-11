#!/usr/bin/env bash
# Aivory Cerveau — liveness watchdog for the cognee-rs graph sidecar
# (cognee-cerveau.service, cerveau-server, :3200).
#
# Why this exists: on 2026-10-03 ~21:02 CST cerveau-server stopped answering
# while staying "active (running)" — no crash, so Restart=on-failure never
# fired, NRestarts stayed 0, and the kernel kept accepting connections into
# the listen backlog (Recv-Q ~61) that nobody ever read. Every graph_recall /
# graph_remember waited out its 60 s client timeout for 8 days before anyone
# noticed. See docs/INCIDENT-2026-10-03-COGNEE-CERVEAU-HANG.md.
#
# systemd's own WatchdogSec= is not an option: cerveau-server never calls
# sd_notify (no NOTIFY_SOCKET / WATCHDOG=1 in the binary), so it would kill a
# healthy process every interval. An external HTTP probe is the only signal.
#
# Run every minute by cognee-cerveau-watchdog.timer. Per run:
#   healthy   -> reset the failure counter; if we had alerted, send RECOVERED.
#   unhealthy -> count it. At FAILS_BEFORE_RESTART consecutive failures:
#                snapshot diagnostics, restart the unit, wait for /health,
#                and alert either way (restarted+healthy = WARN, still down =
#                CRITICAL). Capped at MAX_RESTARTS_PER_HOUR so a sidecar that
#                cannot come up is escalated to a human, not restart-looped.
#
# `--check` probes once and prints the verdict without touching state,
# restarting, or alerting.
#
# Every knob is an env var so tests/watchdog-test.sh can drive the full state
# machine against a fake server, fake systemctl and fake notifier.
set -uo pipefail

UNIT="${COGNEE_WATCHDOG_UNIT:-cognee-cerveau}"
URL="${COGNEE_WATCHDOG_URL:-http://127.0.0.1:3200/health}"
PORT="${COGNEE_WATCHDOG_PORT:-3200}"
PROBE_TIMEOUT="${COGNEE_WATCHDOG_PROBE_TIMEOUT:-5}"
FAILS_BEFORE_RESTART="${COGNEE_WATCHDOG_FAILS:-3}"
MAX_RESTARTS_PER_HOUR="${COGNEE_WATCHDOG_MAX_RESTARTS_PER_HOUR:-3}"
STARTUP_GRACE_SECS="${COGNEE_WATCHDOG_STARTUP_GRACE:-60}"
RECOVERY_WAIT_SECS="${COGNEE_WATCHDOG_RECOVERY_WAIT:-45}"
STATE_DIR="${COGNEE_WATCHDOG_STATE_DIR:-/var/lib/aivory/cognee-watchdog}"
NOTIFY="${COGNEE_WATCHDOG_NOTIFY:-/usr/local/bin/tencent-watch-notify.sh}"
SYSTEMCTL="${COGNEE_WATCHDOG_SYSTEMCTL:-systemctl}"
LOCK_FILE="${COGNEE_WATCHDOG_LOCK:-/run/cognee-cerveau-watchdog.lock}"
KEEP_SNAPSHOTS=10

log() { echo "[cognee-watchdog] $*"; }

now() { date +%s; }

probe() {
  # Prints the HTTP status ("000" on timeout / refused). `|| true` because
  # curl's non-zero exit on timeout is the normal unhealthy case here.
  curl -s -o /dev/null -m "$PROBE_TIMEOUT" -w '%{http_code}' "$URL" 2>/dev/null || true
}

unit_prop() { "$SYSTEMCTL" show "$UNIT" -p "$1" --value 2>/dev/null; }

# Listen-socket Recv-Q: a non-zero value on a LISTEN socket means accepted-by-
# kernel connections the process is not picking up — the 2026-10-03 signature.
listen_backlog() {
  command -v ss >/dev/null 2>&1 || { echo "n/a"; return; }
  ss -ltnH "sport = :$PORT" 2>/dev/null | awk 'NR==1 {print $2"/"$3}'
}

notify() {
  local level="$1" msg="$2"
  if [ -x "$NOTIFY" ]; then
    local t=""; command -v timeout >/dev/null 2>&1 && t="timeout 25"
    $t "$NOTIFY" "$level" "$msg" >/dev/null 2>&1 \
      || log "alert delivery FAILED ($level): $msg"
  else
    log "notifier $NOTIFY missing — alert NOT delivered ($level): $msg"
  fi
}

read_int() { local v; v=$(cat "$1" 2>/dev/null || echo 0); case "$v" in ''|*[!0-9]*) echo 0 ;; *) echo "$v" ;; esac; }

restarts_last_hour() {
  local cutoff n=0 ts
  cutoff=$(( $(now) - 3600 ))
  [ -f "$STATE_DIR/restarts" ] || { echo 0; return; }
  : > "$STATE_DIR/restarts.tmp"
  while read -r ts; do
    case "$ts" in ''|*[!0-9]*) continue ;; esac
    if [ "$ts" -ge "$cutoff" ]; then echo "$ts" >> "$STATE_DIR/restarts.tmp"; n=$((n + 1)); fi
  done < "$STATE_DIR/restarts"
  mv "$STATE_DIR/restarts.tmp" "$STATE_DIR/restarts"
  echo "$n"
}

snapshot() {
  # Evidence for the post-mortem, captured BEFORE the restart destroys it.
  local pid="$1" out
  out="$STATE_DIR/hang-$(date +%Y%m%dT%H%M%S).txt"
  {
    echo "# cognee-cerveau watchdog snapshot $(date -Iseconds 2>/dev/null || date)"
    echo "## unit"; "$SYSTEMCTL" show "$UNIT" -p ActiveState,SubState,MainPID,NRestarts,ActiveEnterTimestamp 2>&1
    echo "## listen socket"; command -v ss >/dev/null 2>&1 && ss -ltnp "sport = :$PORT" 2>&1
    if [ -n "$pid" ] && [ "$pid" != "0" ] && [ -d "/proc/$pid" ]; then
      echo "## /proc/$pid/status"; grep -E '^(State|VmRSS|Threads)' "/proc/$pid/status" 2>&1
      echo "## thread states"; for t in /proc/"$pid"/task/*; do printf '%s %s %s\n' "${t##*/}" "$(cat "$t/comm" 2>/dev/null)" "$(awk '{print $3}' "$t/stat" 2>/dev/null)"; done
      echo "## kernel stacks (first 5 threads)"; for t in $(ls /proc/"$pid"/task | head -5); do echo "-- $t"; cat "/proc/$pid/task/$t/stack" 2>&1; done
    fi
    echo "## last journal lines"; command -v journalctl >/dev/null 2>&1 && journalctl -u "$UNIT" -n 40 --no-pager -o short-iso 2>&1
  } > "$out" 2>&1
  # keep only the newest snapshots
  ls -1t "$STATE_DIR"/hang-*.txt 2>/dev/null | tail -n +$((KEEP_SNAPSHOTS + 1)) | while read -r f; do rm -f "$f"; done
  echo "$out"
}

wait_healthy() {
  local deadline code
  deadline=$(( $(now) + RECOVERY_WAIT_SECS ))
  while [ "$(now)" -lt "$deadline" ]; do
    code=$(probe)
    [ "$code" = "200" ] && return 0
    sleep 3
  done
  return 1
}

# ── --check: read-only probe ──────────────────────────────────────────────
if [ "${1:-}" = "--check" ]; then
  code=$(probe)
  echo "unit=$UNIT active=$(unit_prop ActiveState) url=$URL http=$code backlog=$(listen_backlog) fails=$(read_int "$STATE_DIR/fails")"
  [ "$code" = "200" ]
  exit $?
fi

mkdir -p "$STATE_DIR"
if command -v flock >/dev/null 2>&1; then
  exec 9>"$LOCK_FILE"
  flock -n 9 || { log "previous run still in progress, skipping"; exit 0; }
fi

active=$(unit_prop ActiveState)
case "$active" in
  inactive)
    # Deliberately stopped (systemctl stop). Do not fight the operator.
    log "$UNIT is inactive (stopped deliberately?) — not probing"
    exit 0 ;;
  activating|reloading|deactivating)
    log "$UNIT is $active — waiting for it to settle"
    exit 0 ;;
esac

if [ "$active" = "active" ]; then
  # Skip the probe right after a (re)start: /health may not be up yet.
  since_us=$(unit_prop ActiveEnterTimestampMonotonic)
  up_us=$(awk '{printf "%d", $1 * 1000000}' /proc/uptime 2>/dev/null || echo 0)
  case "$since_us" in ''|*[!0-9]*) since_us=0 ;; esac
  if [ "$since_us" -gt 0 ] && [ "$up_us" -gt 0 ] && [ $(( (up_us - since_us) / 1000000 )) -lt "$STARTUP_GRACE_SECS" ]; then
    log "$UNIT started <${STARTUP_GRACE_SECS}s ago — in startup grace"
    exit 0
  fi
fi

code=$(probe)
fails=$(read_int "$STATE_DIR/fails")

if [ "$code" = "200" ]; then
  if [ -f "$STATE_DIR/alerted" ]; then
    notify INFO "RECOVERED: $UNIT /health is 200 again (after $(cat "$STATE_DIR/alerted"))."
    rm -f "$STATE_DIR/alerted"
  fi
  [ "$fails" -gt 0 ] && log "healthy again after $fails failed probe(s)"
  echo 0 > "$STATE_DIR/fails"
  exit 0
fi

fails=$((fails + 1))
echo "$fails" > "$STATE_DIR/fails"
pid=$(unit_prop MainPID)
backlog=$(listen_backlog)
log "UNHEALTHY ($fails/$FAILS_BEFORE_RESTART): $URL -> HTTP $code within ${PROBE_TIMEOUT}s; state=$active pid=$pid listen Recv-Q/Send-Q=$backlog"

[ "$fails" -lt "$FAILS_BEFORE_RESTART" ] && exit 0

recent=$(restarts_last_hour)
if [ "$recent" -ge "$MAX_RESTARTS_PER_HOUR" ]; then
  # Restarting is not fixing it. Escalate once per hour instead of looping.
  last_esc=$(read_int "$STATE_DIR/escalated_at")
  if [ $(( $(now) - last_esc )) -ge 3600 ]; then
    notify CRITICAL "$UNIT still unhealthy after $recent auto-restarts in the last hour (HTTP $code, Recv-Q/Send-Q=$backlog). Auto-restart paused; agents' graph_recall/graph_remember are failing. Needs a human: ssh aivory-prod; journalctl -u $UNIT; ls $STATE_DIR"
    now > "$STATE_DIR/escalated_at"
    echo "auto-restart cap hit at $(date -Iseconds 2>/dev/null || date)" > "$STATE_DIR/alerted"
  fi
  log "restart cap reached ($recent in last hour) — not restarting"
  exit 0
fi

snap=$(snapshot "$pid")
log "restarting $UNIT (snapshot: $snap)"
now >> "$STATE_DIR/restarts"
echo 0 > "$STATE_DIR/fails"
if [ "$active" = "failed" ]; then "$SYSTEMCTL" reset-failed "$UNIT" 2>/dev/null || true; fi
if ! "$SYSTEMCTL" restart "$UNIT"; then
  notify CRITICAL "$UNIT unhealthy (HTTP $code, Recv-Q/Send-Q=$backlog) and 'systemctl restart' FAILED. Graph memory is down. Snapshot: $snap"
  echo "restart failed at $(date -Iseconds 2>/dev/null || date)" > "$STATE_DIR/alerted"
  exit 1
fi

if wait_healthy; then
  log "restart OK — /health is 200"
  notify WARN "$UNIT was hung ($FAILS_BEFORE_RESTART consecutive /health failures, last HTTP $code, listen Recv-Q/Send-Q=$backlog, pid $pid). Auto-restarted; /health is 200 again. Restarts in last hour: $((recent + 1)). Snapshot: $snap"
  rm -f "$STATE_DIR/alerted"
else
  log "restart did NOT bring /health back within ${RECOVERY_WAIT_SECS}s"
  notify CRITICAL "$UNIT auto-restarted after $FAILS_BEFORE_RESTART failed probes but /health is still not 200 after ${RECOVERY_WAIT_SECS}s. Graph memory is down. Snapshot: $snap"
  echo "restart without recovery at $(date -Iseconds 2>/dev/null || date)" > "$STATE_DIR/alerted"
fi
exit 0
