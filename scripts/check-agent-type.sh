#!/usr/bin/env bash
# check-agent-type.sh — fail if an agent type is missing from any touchpoint.
#
# Usage:
#   scripts/check-agent-type.sh <agent_type>     check one type (e.g. data_analyst)
#   scripts/check-agent-type.sh --all            check every type in AGENT_ROSTER
#
# Touchpoint list = docs/CERVEAU-NEW-AGENTS-PLAN.md §4. Run it in each build
# phase; a new agent is "wired" when it prints no FAIL lines.
#
# Repo-root relative; run from anywhere. Read-only (greps only).
# Prod Cerveau config is not in git, so the Cerveau checks run on the redacted
# mirror ops/cerveau-config/config.redacted.toml. Keep that mirror in the same
# PR as the prod change.
#
# chief_of_staff (Aira) is a coordinator, not a worker: it is exempt from the
# worker-only touchpoints (tool scope, Od-MCP methods, Telegram persona map,
# collab ACL list, catalog seed, bundles), exactly as it is exempt in the code today.
set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" || exit 2

BACKEND=backend/avry-backend/app
DASH=frontend/avry-user-dashboard
ODOO=services/aivory-cerveau-odoo/addons/aivory_cerveau_odoo
CFG=ops/cerveau-config/config.redacted.toml

# Every tool an agent profile must allow (ADR-021 + delegate). A tool missing
# from allowed_tools is silently filtered, not rejected.
REQUIRED_TOOLS="delegate team_message team_ask team_delegate team_handoff team_remind team_wait team_wait_close"

FAILS=0
WARNS=0

fail() { printf '  FAIL  %s\n' "$1"; FAILS=$((FAILS + 1)); }
warn() { printf '  warn  %s\n' "$1"; WARNS=$((WARNS + 1)); }
ok()   { printf '  ok    %s\n' "$1"; }

# has FILE PATTERN LABEL  — fixed-string grep, fail when the file or text is absent.
has() {
  local file="$1" pat="$2" label="$3"
  if [ ! -f "$file" ]; then fail "$label — file not found: $file"; return; fi
  if grep -qF -- "$pat" "$file"; then ok "$label"; else fail "$label — '$pat' not in $file"; fi
}

has_file() {
  if [ -f "$1" ]; then ok "$2"; else fail "$2 — missing $1"; fi
}

# section FILE HEADER — print the lines of a TOML table, header to next table.
section() {
  awk -v h="$2" '
    $0 == h { on = 1; next }
    on && /^\[/ { exit }
    on { print }
  ' "$1"
}

check_type() {
  local t="$1"
  local slug="${t//_/-}"
  local worker=1
  [ "$t" = "chief_of_staff" ] && worker=0

  printf '\n== %s\n' "$t"

  # Backend
  has "$BACKEND/routes/agent_roster.py" "\"agent_type\": \"$t\"" "roster entry (agent_roster.py)"
  if [ "$worker" = 1 ]; then
    has "$BACKEND/routes/agent_tool_scope.py" "$t" "toggleable toolkits (agent_tool_scope.py)"
    # No entry = empty method list (read-only), which is correct for Ivo. A warn, not a fail.
    grep -qF -- "\"$t\":" "$BACKEND/routes/tenant_mcp_servers.py" \
      && ok "Od-MCP method list (tenant_mcp_servers.py)" \
      || warn "no _ODOO_METHODS_BY_AGENT entry for $t (= no execute methods; correct for read-only agents)"
  fi
  # pg_service seeds agent_catalog; prod needs a one-off insert as well (ON CONFLICT DO NOTHING).
  if [ "$worker" = 1 ]; then
    has "$BACKEND/database/pg_service.py" "$t" "agent_catalog seed (pg_service.py)"
  fi
  # agent_actions.py kinds are per-agent only for the new types; not a hard requirement.

  # Bridge
  if [ "$worker" = 1 ]; then
    has backend/vps-bridge/telegram-agent.js "$t" "telegram persona/tool map (vps-bridge/telegram-agent.js)"
  fi

  # Collab ACL allow-list
  if [ "$worker" = 1 ]; then
    # Look inside DEFAULT_KNOWN_AGENTS only; the type may also appear in tests or comments.
    if awk '/const DEFAULT_KNOWN_AGENTS/,/^\];/' services/collab/src/main.rs | grep -qF "\"$t\""; then
      ok "collab DEFAULT_KNOWN_AGENTS (services/collab/src/main.rs)"
    else
      fail "collab DEFAULT_KNOWN_AGENTS — \"$t\" not in the list (or set COLLAB_KNOWN_AGENTS on prod)"
    fi
  fi

  # Dashboard
  has "$DASH/lib/agentRoster.generated.ts" "\"$t\"" "generated roster (run: npm run generate:agent-roster)"
  has "$DASH/lib/officeRows.ts" "$t" "office row colours (lib/officeRows.ts)"
  has "$DASH/components/office/AgentAvatar.tsx" "$t" "avatar component"
  has_file "$DASH/public/agents/$t.svg" "avatar svg (public/agents/$t.svg)"

  # Odoo addon (not present on every branch)
  if [ -f "$ODOO/models/aivory_agent.py" ]; then
    has "$ODOO/models/aivory_agent.py" "('$t'," "Odoo ROSTER (aivory_agent.py)"
    has_file "$ODOO/static/img/agents/$t.svg" "Odoo avatar svg"
  else
    warn "Odoo addon not in this tree (skipped)"
  fi

  # Cerveau workspace identity
  has_file "services/cerveau/agents/$t/workspace/IDENTITY.md" "workspace IDENTITY.md"

  # Cerveau config mirror
  if [ ! -f "$CFG" ]; then
    fail "cerveau config mirror missing: $CFG"
  else
    has "$CFG" "[agents.$t]" "[agents.$t]"
    has "$CFG" "[risk_profiles.agent_$t]" "[risk_profiles.agent_$t]"
    has "$CFG" "[runtime_profiles.agent_$t]" "[runtime_profiles.agent_$t]"
    if [ "$worker" = 1 ]; then
      has "$CFG" "[agent_type_skill_bundles.$t]" "[agent_type_skill_bundles.$t]"
      has "$CFG" "[agent_type_mcp_bundles.$t]" "[agent_type_mcp_bundles.$t]"
    fi

    local risk missing=""
    risk="$(section "$CFG" "[risk_profiles.agent_$t]")"
    if [ -n "$risk" ]; then
      for tool in $REQUIRED_TOOLS; do
        printf '%s\n' "$risk" | grep -qE "\"$tool\"" || missing="$missing $tool"
      done
      if [ -z "$missing" ]; then ok "risk profile allows every team_* tool + delegate"
      else fail "risk_profiles.agent_$t.allowed_tools missing:$missing (is the mirror older than ADR-021? refresh it with redact.py)"; fi
    fi

    local rt
    rt="$(section "$CFG" "[runtime_profiles.agent_$t]")"
    if [ -n "$rt" ]; then
      printf '%s\n' "$rt" | grep -qE 'prompt_injection_mode *= *"compact"' \
        && ok "runtime profile: prompt_injection_mode = compact" \
        || warn "runtime_profiles.agent_$t: prompt_injection_mode is not \"compact\""
    fi

    if [ "$t" != "chief_of_staff" ]; then
      grep -qE "^agent *= *\"$t\"" "$CFG" \
        && ok "listed as a chief_of_staff delegate" \
        || fail "no [[agents.chief_of_staff.delegates]] entry with agent = \"$t\""
    fi
  fi

  # Native bridge (only agents with their own tool server)
  [ -f "services/aivory-native-bridge/agents/$slug.mjs" ] \
    && ok "native bridge agents/$slug.mjs" \
    || warn "no services/aivory-native-bridge/agents/$slug.mjs (fine if the agent has no native tools)"
}

roster_types() {
  grep -oE '"agent_type": "[a-z_]+"' "$BACKEND/routes/agent_roster.py" | sed -E 's/.*: "([a-z_]+)"/\1/'
}

case "${1:-}" in
  ""|-h|--help)
    sed -n '2,15p' "$0" | sed 's/^# \{0,1\}//'
    exit 2
    ;;
  --all)
    for t in $(roster_types); do check_type "$t"; done
    ;;
  *)
    if ! printf '%s' "$1" | grep -qE '^[a-z][a-z_]*$'; then
      echo "agent_type must be lower_snake_case, got: $1" >&2; exit 2
    fi
    check_type "$1"
    ;;
esac

printf '\n%d FAIL, %d warn\n' "$FAILS" "$WARNS"
[ "$FAILS" -eq 0 ]
