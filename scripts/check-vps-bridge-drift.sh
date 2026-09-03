#!/usr/bin/env bash
# Compare this repo's backend/vps-bridge against the live production bridge.
#
# /home/ubuntu/AVRY/vps-bridge on tencent-vps is not a git repo — it is edited
# in place, so this checkout silently rots. Run this before trusting the repo
# copy, and after any in-place edit on the VPS.
# See docs/VPS-BRIDGE-DRIFT-RUNBOOK.md.
#
# Read-only. Touches nothing on the VPS and restarts nothing.
# Exit 0 = in sync, 1 = drift found, 2 = could not check.

set -uo pipefail

HOST="${VPS_BRIDGE_HOST:-tencent-vps}"
REMOTE="${VPS_BRIDGE_PATH:-/home/ubuntu/AVRY/vps-bridge}"

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || {
  echo "error: not inside a git repo" >&2; exit 2; }
LOCAL_DIR="$REPO_ROOT/backend/vps-bridge"

[ -d "$LOCAL_DIR" ] || { echo "error: $LOCAL_DIR not found" >&2; exit 2; }

if ! ssh -o BatchMode=yes -o ConnectTimeout=10 "$HOST" "test -d '$REMOTE'" 2>/dev/null; then
  echo "error: cannot reach $HOST:$REMOTE over ssh" >&2; exit 2
fi

# Only files git actually tracks — .env*, logs and *.bak* are intentionally
# absent from the repo and must not be reported as drift.
# Built with a read loop rather than `mapfile`: macOS ships bash 3.2, which
# has no mapfile, and this is meant to run from a developer laptop.
FILES=()
while IFS= read -r line; do
  [ -n "$line" ] && FILES+=("$line")
done < <(git -C "$REPO_ROOT" ls-files backend/vps-bridge/ \
  | sed 's|^backend/vps-bridge/||' \
  | grep -E '\.(js|sh|json|yml|yaml|toml)$|^\.env\.example$|^\.gitignore$')

if [ "${#FILES[@]}" -eq 0 ]; then
  echo "error: no tracked files found under backend/vps-bridge/" >&2; exit 2
fi

# One ssh round trip for every remote hash, not one per file.
REMOTE_HASHES=$(printf '%s\n' "${FILES[@]}" \
  | ssh "$HOST" "cd '$REMOTE' && xargs -d '\n' -r sha256sum 2>/dev/null") || {
  echo "error: remote hashing failed" >&2; exit 2; }

drift=0 missing=0 checked=0
for f in "${FILES[@]}"; do
  remote_hash=$(awk -v p="$f" '$2 == p {print $1}' <<<"$REMOTE_HASHES")
  if [ -z "$remote_hash" ]; then
    echo "ABSENT ON VPS   $f"
    missing=$((missing + 1))
    continue
  fi
  local_hash=$(shasum -a 256 "$LOCAL_DIR/$f" 2>/dev/null | cut -d' ' -f1)
  checked=$((checked + 1))
  [ "$local_hash" = "$remote_hash" ] || { echo "DRIFTED         $f"; drift=$((drift + 1)); }
done

echo "---"
echo "checked $checked file(s): $drift drifted, $missing absent on VPS"

if [ "$drift" -gt 0 ] || [ "$missing" -gt 0 ]; then
  echo "Re-capture with the rsync in docs/VPS-BRIDGE-DRIFT-RUNBOOK.md, then scan for secrets before committing."
  exit 1
fi
echo "repo matches production."
