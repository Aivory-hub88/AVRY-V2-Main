#!/usr/bin/env bash
# Deploy (or roll back) the cognee-cerveau watchdog on the prod VPS.
# Run from your laptop; everything remote goes over ssh + sudo.
#
#   bash ops/cognee-cerveau-watchdog/deploy.sh                    # deploy + send one test Telegram alert
#   bash ops/cognee-cerveau-watchdog/deploy.sh --no-test-alert    # deploy, no Telegram message
#   bash ops/cognee-cerveau-watchdog/deploy.sh --rollback <TS>    # undo the deploy stamped <TS>
#
# HOST defaults to aivory-prod (ssh alias; user with passwordless sudo).
#
# Installs:
#   /usr/local/bin/cognee-cerveau-watchdog.sh
#   /etc/systemd/system/cognee-cerveau-watchdog.service
#   /etc/systemd/system/cognee-cerveau-watchdog.timer
#   /etc/systemd/system/cognee-cerveau.service.d/watchdog.conf
# Does NOT restart cognee-cerveau: the drop-in (Restart=always,
# TimeoutStopSec=15, StartLimit*) applies at daemon-reload.
#
# Backups: /var/backups/cognee-cerveau-watchdog/<TS>/ (anything it would
# overwrite, plus the base unit and a `systemctl show` snapshot for the
# record) and a MANIFEST of what it installed, which --rollback reads.
set -euo pipefail

HOST="${HOST:-aivory-prod}"
DIR="$(cd "$(dirname "$0")" && pwd)"
MODE=deploy; TEST_ALERT=1; TS=""
while [ $# -gt 0 ]; do
  case "$1" in
    --no-test-alert) TEST_ALERT=0 ;;
    --rollback) MODE=rollback; TS="${2:?--rollback needs the deploy timestamp, e.g. 20261011-180000}"; shift ;;
    -h|--help) sed -n '2,22p' "$0"; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
  shift
done

if [ "$MODE" = rollback ]; then
  echo ">> rolling back deploy $TS on $HOST"
  ssh "$HOST" sudo bash -s -- "$TS" <<'REMOTE'
set -euo pipefail
TS="$1"; B="/var/backups/cognee-cerveau-watchdog/$TS"
[ -f "$B/MANIFEST" ] || { echo "no backup manifest at $B/MANIFEST" >&2; exit 1; }
systemctl disable --now cognee-cerveau-watchdog.timer 2>/dev/null || true
while read -r path; do
  [ -n "$path" ] || continue
  if [ -e "$B/files$path" ]; then cp -a "$B/files$path" "$path"; echo "restored $path"
  else rm -f "$path"; echo "removed  $path"; fi
done < "$B/MANIFEST"
rmdir /etc/systemd/system/cognee-cerveau.service.d 2>/dev/null || true
systemctl daemon-reload
systemctl show cognee-cerveau -p Restart,TimeoutStopUSec,StartLimitBurst
echo "rollback done. State dir /var/lib/aivory/cognee-watchdog left in place (harmless; rm -rf it if wanted)."
REMOTE
  exit 0
fi

for f in cognee-cerveau-watchdog.sh cognee-cerveau-watchdog.service cognee-cerveau-watchdog.timer cognee-cerveau.service.d-watchdog.conf; do
  [ -f "$DIR/$f" ] || { echo "missing $DIR/$f" >&2; exit 1; }
done
bash -n "$DIR/cognee-cerveau-watchdog.sh"

TS="$(date +%Y%m%d-%H%M%S)"
echo ">> deploy $TS to $HOST"
STAGE="$(ssh "$HOST" mktemp -d /tmp/cognee-watchdog.XXXXXX)"
scp -q "$DIR/cognee-cerveau-watchdog.sh" "$DIR/cognee-cerveau-watchdog.service" \
       "$DIR/cognee-cerveau-watchdog.timer" "$DIR/cognee-cerveau.service.d-watchdog.conf" \
       "$HOST:$STAGE/"

ssh "$HOST" sudo bash -s -- "$STAGE" "$TS" "$TEST_ALERT" <<'REMOTE'
set -euo pipefail
STAGE="$1"; TS="$2"; TEST_ALERT="$3"
B="/var/backups/cognee-cerveau-watchdog/$TS"
NOTIFY=/usr/local/bin/tencent-watch-notify.sh

echo "-- preflight"
systemctl cat cognee-cerveau.service >/dev/null
for bin in curl flock ss awk; do command -v "$bin" >/dev/null || { echo "missing $bin" >&2; exit 1; }; done
[ -x "$NOTIFY" ] || { echo "notifier $NOTIFY missing/not executable — alerts would be silent" >&2; exit 1; }

# target path -> staged source
TARGETS="/usr/local/bin/cognee-cerveau-watchdog.sh=cognee-cerveau-watchdog.sh
/etc/systemd/system/cognee-cerveau-watchdog.service=cognee-cerveau-watchdog.service
/etc/systemd/system/cognee-cerveau-watchdog.timer=cognee-cerveau-watchdog.timer
/etc/systemd/system/cognee-cerveau.service.d/watchdog.conf=cognee-cerveau.service.d-watchdog.conf"

echo "-- backup -> $B"
mkdir -p "$B/files"
cp -a /etc/systemd/system/cognee-cerveau.service "$B/cognee-cerveau.service.base-unit"
systemctl show cognee-cerveau > "$B/systemctl-show-cognee-cerveau.before.txt"
: > "$B/MANIFEST"
echo "$TARGETS" | while IFS='=' read -r dst src; do
  if [ -e "$dst" ]; then mkdir -p "$B/files$(dirname "$dst")"; cp -a "$dst" "$B/files$dst"; echo "   backed up $dst"; fi
  echo "$dst" >> "$B/MANIFEST"
done

echo "-- install"
mkdir -p /etc/systemd/system/cognee-cerveau.service.d /var/lib/aivory/cognee-watchdog
echo "$TARGETS" | while IFS='=' read -r dst src; do
  case "$dst" in /usr/local/bin/*) mode=0755 ;; *) mode=0644 ;; esac
  install -o root -g root -m "$mode" "$STAGE/$src" "$dst"; echo "   $dst"
done
rm -rf "$STAGE"

echo "-- verify units"
systemd-analyze verify /etc/systemd/system/cognee-cerveau-watchdog.service /etc/systemd/system/cognee-cerveau-watchdog.timer 2>&1 | grep -v '^$' || true
systemctl daemon-reload
echo "   cognee-cerveau now: $(systemctl show cognee-cerveau -p Restart,TimeoutStopUSec,StartLimitBurst,StartLimitIntervalUSec | tr '\n' ' ')"
echo "   (expect Restart=always TimeoutStopUSec=15s StartLimitBurst=10 StartLimitIntervalUSec=10min; service NOT restarted)"

echo "-- current health (read-only)"
/usr/local/bin/cognee-cerveau-watchdog.sh --check || echo "   !! sidecar is unhealthy RIGHT NOW — the timer will restart it within ~3 min"

echo "-- enable timer + first run"
systemctl enable --now cognee-cerveau-watchdog.timer
systemctl start cognee-cerveau-watchdog.service || true
journalctl -u cognee-cerveau-watchdog.service -n 5 --no-pager -o cat || true
systemctl list-timers cognee-cerveau-watchdog.timer --no-pager | head -3

if [ "$TEST_ALERT" = 1 ]; then
  echo "-- test alert (Telegram, via $NOTIFY)"
  printf '   telegram HTTP: '; "$NOTIFY" INFO "cognee-cerveau watchdog deployed ($TS): probes :3200/health every minute, restarts after 3 consecutive failures. This is a delivery test." || echo "   !! test alert FAILED — fix delivery before relying on this"
fi

echo
echo "deployed $TS. Roll back with: bash ops/cognee-cerveau-watchdog/deploy.sh --rollback $TS"
REMOTE
