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
#   ./sync.sh deploy    # push local skills + identity + agent personas to the VPS, restart daemon
#   ./sync.sh capture   # pull current VPS skills + identity + agent personas into this repo
#   ./sync.sh status    # diff local vs VPS (no changes)
#
# Product-agent personas (agents/<type>/workspace/{IDENTITY,AGENTS,TOOLS}.md)
# are the source of truth for every deployable agent — including the Mission
# Control Room team protocol. VPS files are ubuntu-owned, so remote ops run
# under sudo -n (passwordless sudo required).
#
# Cerveau reads only the first 6000 characters of EACH bootstrap file and drops
# the rest silently, so a persona is split across IDENTITY.md (who), AGENTS.md
# (team protocol, ledger, approvals) and TOOLS.md (tool + mail rules), each
# under 5800 chars. `deploy` refuses to push a file over that limit.
# ALWAYS run `capture` before editing: the VPS is edited live and an old repo
# copy pushed over it silently reverts those edits.
# =============================================================================

set -euo pipefail

HOST="${CERVAU_HOST:-tencent-vps}"
REMOTE_DIR="/home/ubuntu/.zeroclaw-cerveau"
LOCAL_DIR="$(cd "$(dirname "$0")" && pwd)"
# Scoped to product agents only — internal *_brain workspaces are managed
# by Cerveau's own sync-aivory-identity.sh on the VPS, not here.
PRODUCT_AGENTS="autonomous customer_service leads_qualifier finance_invoice_ops office_assistant data_analyst operations_inventory marketing_content deep_researcher chief_of_staff"
# Bootstrap files kept per agent. Cerveau caps each at 6000 chars; we stay under PERSONA_MAX_CHARS.
PERSONA_FILES="IDENTITY.md AGENTS.md TOOLS.md"
PERSONA_MAX_CHARS=5800
# Remote files are ubuntu-owned. Operators with direct write access leave
# CERVEAU_SUDO unset (legacy behavior). Operators with passwordless sudo
# instead (e.g. irfan via aivory-prod) export CERVEAU_SUDO="sudo -n".
SUDO_PREFIX="${CERVEAU_SUDO:+$CERVEAU_SUDO }"
RSYNC_PATH_ARGS=()
if [ -n "${CERVEAU_SUDO:-}" ]; then RSYNC_PATH_ARGS=(--rsync-path="sudo -n rsync"); fi

log()  { echo -e "\033[0;36m[sync]\033[0m $*"; }
warn() { echo -e "\033[1;33m[!]\033[0m $*"; }

case "${1:-}" in
  deploy)
    # Refuse to push a persona file Cerveau would truncate.
    over=0
    for a in ${PRODUCT_AGENTS}; do
      for f in ${PERSONA_FILES}; do
        file="${LOCAL_DIR}/agents/${a}/workspace/${f}"
        [ -f "${file}" ] || continue
        n=$(wc -m < "${file}" | tr -d ' ')
        if [ "${n}" -gt "${PERSONA_MAX_CHARS}" ]; then
          warn "agents/${a}/${f} is ${n} chars (> ${PERSONA_MAX_CHARS}): Cerveau would drop the tail. Split it first."
          over=1
        fi
      done
    done
    if [ "${over}" -ne 0 ] && [ "${CERVEAU_ALLOW_OVERSIZE:-0}" != "1" ]; then
      echo "Aborting: oversized persona file(s). Set CERVEAU_ALLOW_OVERSIZE=1 to override." >&2
      exit 1
    fi
    log "Deploying skills + identity → ${HOST}:${REMOTE_DIR}"
    rsync -az ${RSYNC_PATH_ARGS[@]+"${RSYNC_PATH_ARGS[@]}"} --delete \
      --exclude='._*' --exclude='.DS_Store' \
      "${LOCAL_DIR}/skills/"       "${HOST}:${REMOTE_DIR}/skills/"
    rsync -az ${RSYNC_PATH_ARGS[@]+"${RSYNC_PATH_ARGS[@]}"} "${LOCAL_DIR}/identity.md" "${LOCAL_DIR}/soul.md" "${HOST}:${REMOTE_DIR}/"
    log "Deploying product-agent personas → ${HOST}:${REMOTE_DIR}/agents/"
    for a in ${PRODUCT_AGENTS}; do
      present=""
      for f in ${PERSONA_FILES}; do
        [ -f "${LOCAL_DIR}/agents/${a}/workspace/${f}" ] && present="${present} ${a}/workspace/${f}"
      done
      [ -n "${present}" ] || continue
      tar -czf - -C "${LOCAL_DIR}/agents" ${present} \
        | ssh "${HOST}" "${SUDO_PREFIX}tar -xzf - -C ${REMOTE_DIR}/agents && ${SUDO_PREFIX}chown ubuntu:ubuntu $(for x in ${present}; do printf '%s/agents/%s ' "${REMOTE_DIR}" "${x}"; done)"
    done
    log "Restarting zeroclaw-cerveau to load skills..."
    ssh "${HOST}" "sudo systemctl restart zeroclaw-cerveau.service && sleep 2 && systemctl is-active zeroclaw-cerveau.service"
    log "Done."
    ;;
  capture)
    log "Capturing skills + identity from ${HOST}"
    ssh "${HOST}" "cd ${REMOTE_DIR} && tar --exclude='._*' -czf - skills identity.md soul.md" \
      | tar -xzf - -C "${LOCAL_DIR}"
    log "Capturing product-agent personas from ${HOST}"
    ssh "${HOST}" "cd ${REMOTE_DIR}/agents && ${SUDO_PREFIX}sh -c 'for a in ${PRODUCT_AGENTS}; do for f in ${PERSONA_FILES}; do [ -f \$a/workspace/\$f ] && echo \$a/workspace/\$f; done; done' | ${SUDO_PREFIX}xargs ${SUDO_PREFIX}tar -czf -" \
      | tar -xzf - -C "${LOCAL_DIR}/agents"
    log "Captured. Review with: git -C ${LOCAL_DIR}/.. diff"
    ;;
  status)
    log "Diffing local vs VPS (dry run)..."
    rsync -azn ${RSYNC_PATH_ARGS[@]+"${RSYNC_PATH_ARGS[@]}"} --delete --exclude='._*' --exclude='.DS_Store' \
      "${LOCAL_DIR}/skills/" "${HOST}:${REMOTE_DIR}/skills/"
    for a in ${PRODUCT_AGENTS}; do
      for f in ${PERSONA_FILES}; do
        remote=$(ssh "${HOST}" "${SUDO_PREFIX}cat ${REMOTE_DIR}/agents/${a}/workspace/${f} 2>/dev/null" || true)
        local_file="${LOCAL_DIR}/agents/${a}/workspace/${f}"
        if [ -z "${remote}" ] && [ ! -f "${local_file}" ]; then continue; fi
        if [ -f "${local_file}" ] && [ "${remote}" = "$(cat "${local_file}")" ]; then
          log "  agents/${a}/${f}: in sync"
        else
          warn "  agents/${a}/${f}: DIFFERS (capture before you edit)"
        fi
      done
    done
    warn "Use './sync.sh deploy' to push, './sync.sh capture' to pull."
    ;;
  *)
    echo "Usage: $0 {deploy|capture|status}" >&2
    exit 1
    ;;
esac
