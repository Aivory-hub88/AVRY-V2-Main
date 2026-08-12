#!/usr/bin/env bash
# =============================================================================
# Cerveau (ZeroClaw) skills sync — deploy/capture the daemon's skills + identity
# between this repo and the live VPS.
#
# The ZeroClaw "Cerveau" daemon (zeroclaw-cerveau.service) maps the frontend's
# `entrypoint` values to SKILL.md files by directory name under
#   /home/ubuntu/.zeroclaw-cerveau/skills/<entrypoint>/SKILL.md
# These files are NOT in any git repo by default — they live only on the VPS.
# This script keeps them version-controlled here and reproducible.
#
# Usage (run from services/cerveau/):
#   ./sync.sh deploy    # push local skills + identity to the VPS, restart daemon
#   ./sync.sh capture   # pull current VPS skills + identity into this repo
#   ./sync.sh status    # diff local vs VPS (no changes)
# =============================================================================

set -euo pipefail

HOST="${CERVAU_HOST:-tencent-vps}"
REMOTE_DIR="/home/ubuntu/.zeroclaw-cerveau"
LOCAL_DIR="$(cd "$(dirname "$0")" && pwd)"

log()  { echo -e "\033[0;36m[sync]\033[0m $*"; }
warn() { echo -e "\033[1;33m[!]\033[0m $*"; }

case "${1:-}" in
  deploy)
    log "Deploying skills + identity → ${HOST}:${REMOTE_DIR}"
    rsync -az --delete \
      --exclude='._*' --exclude='.DS_Store' \
      "${LOCAL_DIR}/skills/"       "${HOST}:${REMOTE_DIR}/skills/"
    rsync -az "${LOCAL_DIR}/identity.md" "${LOCAL_DIR}/soul.md" "${HOST}:${REMOTE_DIR}/"
    log "Restarting zeroclaw-cerveau to load skills..."
    ssh "${HOST}" "sudo systemctl restart zeroclaw-cerveau.service && sleep 2 && systemctl is-active zeroclaw-cerveau.service"
    log "Done."
    ;;
  capture)
    log "Capturing skills + identity from ${HOST}"
    ssh "${HOST}" "cd ${REMOTE_DIR} && tar --exclude='._*' -czf - skills identity.md soul.md" \
      | tar -xzf - -C "${LOCAL_DIR}"
    log "Captured. Review with: git -C ${LOCAL_DIR}/.. diff"
    ;;
  status)
    log "Diffing local vs VPS (dry run)..."
    rsync -azn --delete --exclude='._*' --exclude='.DS_Store' \
      "${LOCAL_DIR}/skills/" "${HOST}:${REMOTE_DIR}/skills/"
    warn "Use './sync.sh deploy' to push, './sync.sh capture' to pull."
    ;;
  *)
    echo "Usage: $0 {deploy|capture|status}" >&2
    exit 1
    ;;
esac
