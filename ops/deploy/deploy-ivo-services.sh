#!/usr/bin/env bash
# deploy-ivo-services.sh — ship Ivo's three service changes to prod. Run from your Mac,
# AFTER deploy-ivo.sh succeeded.
#
#   ops/deploy/deploy-ivo-services.sh [--dry-run] [backend|collab|dashboard|all]
#
# Order matters and "all" keeps it: backend -> collab -> dashboard. The dashboard's Ivo
# card is rejected by the backend until the backend roster has Ivo, so never run
# dashboard first. Each stage:
#   * tags the running image  <image>:rollback-<ts>  (from `docker inspect .Image`)
#   * builds with the full log in a file (printed on failure), up -d --no-deps
#   * waits for the container to be healthy/running; on failure restores the old image
#
# Prod facts this relies on (memory: vps-deploy-layout):
#   /home/ubuntu/AVRY-V2-Main/docker-compose.prod.yml   (sudo docker, git as `sudo -u ubuntu`)
#   backend  checkout: backend/avry-backend            (git ff-only; untracked *.bak files are fine)
#   dashboard checkout: frontend/avry-user-dashboard    (git ff-only)
#   collab   : services/collab is NOT in git on the VPS -> only src/main.rs is copied
#              (verified 2026-11-09: it is the only file that differs from the repo)
# The catalog row was already inserted by deploy-ivo.sh, so no migration runs here.
#
# Env: SSH_HOST (aivory-prod).
set -euo pipefail

HOST="${SSH_HOST:-aivory-prod}"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DRY=0; STAGES=""
for a in "$@"; do
  case "$a" in
    --dry-run) DRY=1 ;;
    backend|collab|dashboard) STAGES="$STAGES $a" ;;
    all) STAGES="backend collab dashboard" ;;
    *) echo "usage: $0 [--dry-run] [backend|collab|dashboard|all]" >&2; exit 2 ;;
  esac
done
[ -n "$STAGES" ] || STAGES="backend collab dashboard"
# Keep the safe order whatever order the user typed.
ORDERED=""; for s in backend collab dashboard; do case " $STAGES " in *" $s "*) ORDERED="$ORDERED $s" ;; esac; done

say() { printf '\n== %s\n' "$*"; }
die() { printf 'ABORT: %s\n' "$*" >&2; exit 1; }

say "Preflight (local)"
COLLAB_MAIN="$REPO/services/collab/src/main.rs"
[ -f "$COLLAB_MAIN" ] || die "missing $COLLAB_MAIN"
grep -q 'COLLAB_KNOWN_AGENTS' "$COLLAB_MAIN" || die "collab main.rs has no COLLAB_KNOWN_AGENTS (wrong checkout?)"
# Agents this checkout adds, in rollout order. A type is checked only if the local backend
# roster has it, so the same script serves the Ivo checkout and later ones (Juno, Mira).
AGENTS=""
for t in data_analyst operations_inventory marketing_content; do
  grep -q "\"$t\"" "$REPO/backend/avry-backend/app/routes/agent_roster.py" && AGENTS="$AGENTS $t"
done
[ -n "$AGENTS" ] || die "backend roster has none of the new agents in this checkout"
for t in $AGENTS; do
  grep -q "\"$t\"" "$COLLAB_MAIN" || die "collab main.rs does not know $t"
done
echo "new agents in this checkout:$AGENTS"
echo "stages:$ORDERED"
if [ "$DRY" = 1 ]; then
  say "Dry run: nothing sent."
  echo "Would run on $HOST:$ORDERED"
  exit 0
fi

TS="$(date +%Y%m%d-%H%M%S)"
case " $ORDERED " in
  *" collab "*)
    say "Upload collab main.rs"
    scp -q "$COLLAB_MAIN" "$HOST:/tmp/ivo-collab-main.rs.$TS" ;;
esac

say "Apply on $HOST"
ssh "$HOST" "STAGES='$ORDERED' TS='$TS' AGENTS='$AGENTS' bash -s" <<'REMOTE'
set -euo pipefail
ROOT=/home/ubuntu/AVRY-V2-Main
COMPOSE="sudo docker compose -f $ROOT/docker-compose.prod.yml"
cd "$ROOT"

git_u() { sudo -u ubuntu git "$@"; }

rollback_tag() { # container -> echoes tag name it created (repo:rollback-TS)
  local c="$1" img repo
  img="$(sudo docker inspect -f '{{.Image}}' "$c")"
  repo="$(sudo docker inspect -f '{{.Config.Image}}' "$c" | sed 's/:[^:/]*$//')"
  sudo docker tag "$img" "$repo:rollback-$TS"
  echo "$repo:rollback-$TS"
}

wait_up() { # container, seconds
  local c="$1" n="${2:-90}" i st
  for i in $(seq 1 "$n"); do
    st="$(sudo docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$c" 2>/dev/null || echo none)"
    case "$st" in healthy|running) [ "$st" = running ] && [ "$i" -lt 8 ] && { sleep 1; continue; }; echo "$c $st"; return 0 ;; esac
    sleep 1
  done
  echo "$c not healthy after ${n}s (last: $st)"; return 1
}

build_up() { # service, container
  local svc="$1" c="$2" log
  log="$(mktemp /tmp/deploy-ivo-$svc-XXXXXX.log)"
  local try
  for try in 1 2 3; do
    if $COMPOSE build --progress=plain "$svc" > "$log" 2>&1; then break; fi
    echo "build $svc attempt $try failed (log $log)"
    [ "$try" = 3 ] && { tail -60 "$log"; return 1; }
  done
  $COMPOSE up -d --no-deps "$svc"
}

restore() { # service, container, rollback-tag
  echo "!! restoring $2 from $3"
  sudo docker tag "$3" "$(sudo docker inspect -f '{{.Config.Image}}' "$2")" 2>/dev/null || true
  $COMPOSE up -d --no-deps --no-build "$1" || true
}

ff_merge() { # checkout dir (relative to ROOT)
  local d="$1" before after
  before="$(git_u -C "$d" rev-parse --short HEAD)"
  git_u -C "$d" fetch origin main
  git_u -C "$d" merge --ff-only FETCH_HEAD
  after="$(git_u -C "$d" rev-parse --short HEAD)"
  echo "$d: $before -> $after"
}

for S in $STAGES; do
  case "$S" in
  backend)
    echo; echo "-- backend"
    RB="$(rollback_tag avry-backend)"; echo "rollback tag $RB"
    ff_merge backend/avry-backend
    for t in $AGENTS; do grep -q "\"$t\"" backend/avry-backend/app/routes/agent_roster.py || { echo "merged backend has no $t"; exit 1; }; done
    if build_up avry-backend avry-backend && wait_up avry-backend 120; then
      for t in $AGENTS; do
        sudo docker exec avry-backend grep -q "\"$t\"" app/routes/agent_roster.py \
          && echo "roster in running container: has $t" \
          || { echo "container roster lacks $t"; restore avry-backend avry-backend "$RB"; exit 1; }
      done
    else
      restore avry-backend avry-backend "$RB"; exit 1
    fi
    sudo docker tag "$(sudo docker inspect -f '{{.Image}}' avry-backend)" "$(echo "$RB" | sed 's/:rollback-.*//'):current-$TS"
    ;;
  collab)
    echo; echo "-- collab"
    SRC="/tmp/ivo-collab-main.rs.$TS"; [ -f "$SRC" ] || { echo "missing uploaded $SRC"; exit 1; }
    D=services/collab/src/main.rs
    RB="$(rollback_tag aivory-collab)"; echo "rollback tag $RB"
    sudo -u ubuntu cp -p "$D" "$D.bak-pre-ivo-$TS"
    sudo -u ubuntu install -m 644 "$SRC" "$D"
    rm -f "$SRC"
    if build_up aivory-collab aivory-collab && wait_up aivory-collab 90; then
      sudo docker logs --tail 15 aivory-collab 2>&1 | grep -Ei 'panic|error' && { echo "collab logs show errors"; \
        sudo -u ubuntu cp -p "$D.bak-pre-ivo-$TS" "$D"; restore aivory-collab aivory-collab "$RB"; exit 1; } || true
    else
      sudo -u ubuntu cp -p "$D.bak-pre-ivo-$TS" "$D"
      restore aivory-collab aivory-collab "$RB"; exit 1
    fi
    sudo docker tag "$(sudo docker inspect -f '{{.Image}}' aivory-collab)" "$(echo "$RB" | sed 's/:rollback-.*//'):current-$TS"
    ;;
  dashboard)
    echo; echo "-- dashboard"
    # The card posts to the backend, so refuse to ship it before the backend has Ivo.
    for t in $AGENTS; do
      sudo docker exec avry-backend grep -q "\"$t\"" app/routes/agent_roster.py \
        || { echo "backend roster lacks $t: deploy backend first"; exit 1; }
    done
    RB="$(rollback_tag avry-user-dashboard)"; echo "rollback tag $RB"
    ff_merge frontend/avry-user-dashboard
    if build_up avry-user-dashboard avry-user-dashboard && wait_up avry-user-dashboard 90; then
      :
    else
      restore avry-user-dashboard avry-user-dashboard "$RB"; exit 1
    fi
    sudo docker tag "$(sudo docker inspect -f '{{.Image}}' avry-user-dashboard)" "$(echo "$RB" | sed 's/:rollback-.*//'):current-$TS"
    ;;
  esac
done
echo; echo "REMOTE DONE ($STAGES ) ts=$TS"
REMOTE

cat <<EOF

Done. Rollback images are tagged *:rollback-$TS on the VPS. Collab file backup:
services/collab/src/main.rs.bak-pre-ivo-$TS

Next: acceptance tests (weekly report, forecast, Aira -> Ivo delegation).
EOF
