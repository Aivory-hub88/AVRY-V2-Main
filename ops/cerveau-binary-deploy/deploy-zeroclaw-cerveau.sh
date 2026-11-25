#!/usr/bin/env bash
# Deploy the CI-built zeroclaw-cerveau binary (rolling `cerveau-cd` release of
# Aivory-hub88/AVRY-Cerveau) to the prod VPS, with a guard, backup and
# automatic rollback.
#
#   bash ops/cerveau-binary-deploy/deploy-zeroclaw-cerveau.sh --expect-commit <sha>
#   bash ops/cerveau-binary-deploy/deploy-zeroclaw-cerveau.sh --rollback <TS>
#
# --expect-commit  Full or abbreviated cerveau-main commit the release MUST be
#                  built from. The `cerveau-cd` tag is rolling and is deleted
#                  and recreated by each build, so "latest" can be a build
#                  that does not contain the change you are deploying; the
#                  script refuses to install it. Use `git rev-parse` of the
#                  merge commit (graph-memory fail-fast: 33d3c6be6c02...).
#
# What it does on HOST (default aivory-prod, passwordless sudo):
#   1. reads the release notes, aborts unless they name --expect-commit
#   2. downloads tarball + .sha256 from the public release, verifies checksum
#   3. extracts to a temp dir and runs `<new> --version`
#   4. backs up /usr/local/bin/zeroclaw-cerveau -> .bak-graphfailfast-<TS>
#   5. atomically swaps the binary, restarts zeroclaw-cerveau (:3100)
#   6. waits up to 60 s for :3100/health = 200; if not, restores the backup
#      and restarts again, then exits non-zero.
#
# NOTE: step 5 restarts the agent runtime, which drops in-flight turns for a
# few seconds. The side-by-side `-b` instance is not running on prod today and
# is not touched.
set -euo pipefail

HOST="${HOST:-aivory-prod}"
REPO="Aivory-hub88/AVRY-Cerveau"
TAG="cerveau-cd"
ASSET="zeroclaw-x86_64-unknown-linux-gnu.tar.gz"
BIN=/usr/local/bin/zeroclaw-cerveau
UNIT=zeroclaw-cerveau

MODE=deploy; EXPECT=""; TS=""
while [ $# -gt 0 ]; do
  case "$1" in
    --expect-commit) EXPECT="${2:?needs a commit sha}"; shift ;;
    --rollback) MODE=rollback; TS="${2:?needs the deploy timestamp}"; shift ;;
    -h|--help) sed -n '2,29p' "$0"; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
  shift
done

if [ "$MODE" = rollback ]; then
  ssh "$HOST" sudo bash -s -- "$TS" "$BIN" "$UNIT" <<'REMOTE'
set -euo pipefail
TS="$1"; BIN="$2"; UNIT="$3"; BK="$BIN.bak-graphfailfast-$TS"
[ -x "$BK" ] || { echo "no backup at $BK" >&2; exit 1; }
cp -a "$BK" "$BIN.rollback.new" && mv -f "$BIN.rollback.new" "$BIN"
systemctl restart "$UNIT"
sleep 5; curl -s -o /dev/null -m 5 -w 'health: %{http_code}\n' http://127.0.0.1:3100/health
REMOTE
  exit 0
fi

[ -n "$EXPECT" ] || { echo "--expect-commit is required (see --help)" >&2; exit 2; }
TS="$(date +%Y%m%d-%H%M%S)"
echo ">> deploying $TAG to $HOST (stamp $TS), requiring commit $EXPECT"

ssh "$HOST" sudo bash -s -- "$TS" "$EXPECT" "$REPO" "$TAG" "$ASSET" "$BIN" "$UNIT" <<'REMOTE'
set -euo pipefail
TS="$1"; EXPECT="$2"; REPO="$3"; TAG="$4"; ASSET="$5"; BIN="$6"; UNIT="$7"
W="$(mktemp -d /tmp/zc-deploy.XXXXXX)"; trap 'rm -rf "$W"' EXIT
cd "$W"

echo "-- release notes"
NOTES="$(curl -fsS -m 20 "https://api.github.com/repos/$REPO/releases/tags/$TAG" | python3 -c 'import json,sys; print(json.load(sys.stdin)["body"])')"
echo "   $NOTES"
BUILT="$(echo "$NOTES" | grep -oE 'commit [0-9a-f]{40}' | awk '{print $2}')"
[ -n "$BUILT" ] || { echo "!! cannot find a commit in the release notes" >&2; exit 1; }
case "$BUILT" in "$EXPECT"*) ;; *)
  echo "!! release is built from $BUILT, not $EXPECT — CI has not published the build you want yet. Nothing installed." >&2
  exit 3 ;;
esac

echo "-- download + verify"
curl -fsSL -m 300 -o "$ASSET" "https://github.com/$REPO/releases/download/$TAG/$ASSET"
curl -fsSL -m 30  -o "$ASSET.sha256" "https://github.com/$REPO/releases/download/$TAG/$ASSET.sha256"
sha256sum -c "$ASSET.sha256"
mkdir x && tar -xzf "$ASSET" -C x
[ -x x/zeroclaw ] || { echo "!! tarball has no executable 'zeroclaw'" >&2; exit 1; }
echo "   new binary: $(x/zeroclaw --version 2>&1 | head -1)"
echo "   old binary: $("$BIN" --version 2>&1 | head -1)"

echo "-- backup + swap"
BK="$BIN.bak-graphfailfast-$TS"
cp -a "$BIN" "$BK"; echo "   backup: $BK"
install -o root -g root -m 0755 x/zeroclaw "$BIN.new"
mv -f "$BIN.new" "$BIN"

echo "-- restart $UNIT"
systemctl restart "$UNIT"
ok=0
for i in $(seq 1 20); do
  sleep 3
  code="$(curl -s -o /dev/null -m 5 -w '%{http_code}' http://127.0.0.1:3100/health || true)"
  [ "$code" = 200 ] && { ok=1; break; }
done
if [ "$ok" = 1 ]; then
  echo "   :3100/health = 200 — deployed commit $BUILT"
  echo "   rollback: deploy-zeroclaw-cerveau.sh --rollback $TS"
else
  echo "!! :3100/health did not return 200 within 60 s — restoring backup" >&2
  cp -a "$BK" "$BIN.rollback.new" && mv -f "$BIN.rollback.new" "$BIN"
  systemctl restart "$UNIT"
  sleep 8; curl -s -o /dev/null -m 5 -w '   after rollback: health %{http_code}\n' http://127.0.0.1:3100/health || true
  exit 1
fi
REMOTE
