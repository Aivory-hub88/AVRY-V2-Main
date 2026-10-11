#!/usr/bin/env bash
# Drives cognee-cerveau-watchdog.sh through its state machine against a fake
# sidecar, a fake systemctl and a fake notifier. Runs on macOS or Linux, no
# root, no systemd:   bash ops/cognee-cerveau-watchdog/tests/watchdog-test.sh
#
# The "hung" fake reproduces the 2026-10-03 failure exactly: a socket that is
# bound and listening (so connect() succeeds into the kernel backlog) but whose
# process never accept()s — the request just hangs until the client times out.
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
WATCHDOG="$HERE/../cognee-cerveau-watchdog.sh"
T="$(mktemp -d)"
PORT=$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1])')
SERVER_PID=""
pass=0; failn=0

cleanup() { if [ -n "$SERVER_PID" ]; then kill "$SERVER_PID" 2>/dev/null; wait "$SERVER_PID" 2>/dev/null; fi; rm -rf "$T"; }
trap cleanup EXIT

start_server() { # $1 = ok | hang
  [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null && wait "$SERVER_PID" 2>/dev/null
  python3 - "$PORT" "$1" <<'PY' &
import http.server, socket, sys, time
port, mode = int(sys.argv[1]), sys.argv[2]
if mode == "hang":
    s = socket.socket(); s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind(("127.0.0.1", port)); s.listen(128)
    while True: time.sleep(3600)   # never accept()
class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200); self.end_headers(); self.wfile.write(b"ok")
    def log_message(self, *a): pass
http.server.HTTPServer.allow_reuse_address = True
http.server.HTTPServer(("127.0.0.1", port), H).serve_forever()
PY
  SERVER_PID=$!
  echo "$1" > "$T/server_mode"
  sleep 0.6
}

# fake systemctl: state lives in $T/active; restart swaps the fake server to
# whatever $T/restart_brings_up says (ok | hang).
cat > "$T/systemctl" <<EOF
#!/usr/bin/env bash
case "\$1" in
  show)
    case "\$4" in
      ActiveState) cat "$T/active" ;;
      MainPID) echo 4242 ;;
      ActiveEnterTimestampMonotonic) echo 0 ;;
      *) echo "" ;;
    esac ;;
  restart) echo restart >> "$T/calls"; echo restarted > "$T/restart_marker" ;;
  reset-failed) echo reset-failed >> "$T/calls" ;;
esac
EOF
chmod +x "$T/systemctl"
cat > "$T/notify" <<EOF
#!/usr/bin/env bash
echo "\$1 \$2" >> "$T/alerts"
EOF
chmod +x "$T/notify"

run() {
  # Restart side effect: the fake systemctl only drops a marker; swap servers here
  # (background process ownership has to stay in this shell).
  COGNEE_WATCHDOG_URL="http://127.0.0.1:$PORT/health" COGNEE_WATCHDOG_PORT="$PORT" \
  COGNEE_WATCHDOG_PROBE_TIMEOUT=1 COGNEE_WATCHDOG_RECOVERY_WAIT=4 COGNEE_WATCHDOG_STARTUP_GRACE=0 \
  COGNEE_WATCHDOG_STATE_DIR="$T/state" COGNEE_WATCHDOG_NOTIFY="$T/notify" \
  COGNEE_WATCHDOG_SYSTEMCTL="$T/systemctl" COGNEE_WATCHDOG_LOCK="$T/lock" \
  COGNEE_WATCHDOG_MAX_RESTARTS_PER_HOUR="${MAXR:-3}" \
  bash "$WATCHDOG" "$@" > "$T/out" 2>&1 &
  local wpid=$!
  while kill -0 "$wpid" 2>/dev/null; do
    if [ -f "$T/restart_marker" ]; then rm -f "$T/restart_marker"; start_server "$(cat "$T/restart_brings_up")"; fi
    sleep 0.2
  done
  wait "$wpid"; echo $? > "$T/rc"
}

check() { # desc, condition
  if eval "$2"; then pass=$((pass+1)); echo "  ok   $1"; else failn=$((failn+1)); echo "  FAIL $1"; sed 's/^/       | /' "$T/out"; fi
}
reset() { rm -rf "$T/state" "$T/calls" "$T/alerts" "$T/restart_marker"; touch "$T/calls" "$T/alerts"; echo active > "$T/active"; echo ok > "$T/restart_brings_up"; }
alerts() { cat "$T/alerts"; }
nlines() { wc -l < "$1" | tr -d ' '; }

echo "1. healthy sidecar"
reset; start_server ok; run
check "no restart, no alert" '[ "$(nlines $T/calls)" = 0 ] && [ "$(nlines $T/alerts)" = 0 ]'
check "fails counter is 0" '[ "$(cat $T/state/fails)" = 0 ]'

echo "2. hang (listening, never accepting) -> restart on 3rd consecutive failure"
reset; start_server hang
run; check "1st failure: counted, no restart" '[ "$(cat $T/state/fails)" = 1 ] && [ "$(nlines $T/calls)" = 0 ]'
run; check "2nd failure: counted, no restart" '[ "$(cat $T/state/fails)" = 2 ] && [ "$(nlines $T/calls)" = 0 ]'
run; check "3rd failure: restarted once" '[ "$(grep -c restart $T/calls)" = 1 ]'
check "WARN alert says auto-restarted" 'grep -q "^WARN .*Auto-restarted" $T/alerts'
check "hang snapshot written" 'ls $T/state/hang-*.txt >/dev/null 2>&1'
check "counter reset, not left alerted" '[ "$(cat $T/state/fails)" = 0 ] && [ ! -f $T/state/alerted ]'
run; check "next run healthy: no further alert" '[ "$(nlines $T/alerts)" = 1 ]'

echo "3. restart does not fix it -> CRITICAL, then RECOVERED when it comes back"
reset; start_server hang; echo hang > "$T/restart_brings_up"
run; run; run
check "CRITICAL alert sent" 'grep -q "^CRITICAL .*still not 200" $T/alerts'
check "alerted flag set" '[ -f $T/state/alerted ]'
start_server ok; run
check "RECOVERED sent once healthy" 'grep -q "^INFO RECOVERED" $T/alerts'
check "alerted flag cleared" '[ ! -f $T/state/alerted ]'

echo "4. restart cap -> escalate once, stop restarting"
reset; start_server hang; mkdir -p "$T/state"; date +%s > "$T/state/restarts"
MAXR=1 run; MAXR=1 run; MAXR=1 run
check "no restart past the cap" '[ "$(nlines $T/calls)" = 0 ]'
check "one CRITICAL escalation" '[ "$(grep -c "^CRITICAL .*Auto-restart paused" $T/alerts)" = 1 ]'
MAXR=1 run
check "no duplicate escalation within the hour" '[ "$(grep -c "^CRITICAL" $T/alerts)" = 1 ]'

echo "5. unit deliberately stopped -> hands off"
reset; start_server hang; echo inactive > "$T/active"
run; run; run
check "no probe counting, no restart, no alert" '[ ! -f $T/state/fails ] && [ "$(nlines $T/calls)" = 0 ] && [ "$(nlines $T/alerts)" = 0 ]'

echo "6. unit in failed state (start limit hit) -> reset-failed + restart"
reset; start_server hang; echo failed > "$T/active"
run; run; run
check "reset-failed then restart" '[ "$(head -1 $T/calls)" = reset-failed ] && grep -q restart $T/calls'

echo "7. --check is read-only"
reset; start_server hang
run --check
check "non-zero exit when unhealthy" '[ "$(cat $T/rc)" != 0 ]'
check "no state written" '[ ! -f $T/state/fails ]'
start_server ok; run --check
check "zero exit when healthy" '[ "$(cat $T/rc)" = 0 ]'

echo; echo "passed=$pass failed=$failn"
[ "$failn" = 0 ]
