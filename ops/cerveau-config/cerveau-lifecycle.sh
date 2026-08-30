#!/usr/bin/env bash
# Aivory Cerveau — tenant-memory lifecycle driver (interim psql implementation).
#
# Runs the SAME set-based pass as PostgresMemory::run_lifecycle (fork patch
# 0005, CI-validated): age-based retention prune (core exempt) + per-tenant
# budget eviction with per-tier quota overrides from cerveau.cerveau_tenant_quota.
# One pass covers every tenant. Scheduled by cerveau-lifecycle.timer (daily).
#
# Interim by design: once the fork grows a `zeroclaw memory lifecycle`
# subcommand this script is replaced by it (see ADR-004). Keep the SQL here
# byte-consistent with postgres.rs::run_lifecycle when either changes.
set -euo pipefail

SCHEMA="cerveau"
DB="aivory"
# Defaults mirror PgLifecycleConfig::default()
CONV_RETENTION_DAYS=30
DAILY_RETENTION_DAYS=180
CORE_CAP=2000
DAILY_CAP=1000
CONV_CAP=500
# `document` -- operator-uploaded knowledge, ingested by avry-backend's
# /api/v1/agent-profiles/{agent_type}/knowledge/document (2026-08-30). Its own
# tier on purpose: never age-pruned (an uploaded document does not go stale on
# a clock), and outside the `core` budget, whose recency ordering would evict a
# document before newer conversational memories. The cap here is a runaway
# guard, not a retention policy: ~25 max-size documents per tenant per agent.
# NOTE: this category has no counterpart in PgLifecycleConfig yet -- adding
# `document_max_rows_per_tenant` there is the follow-up that restores
# byte-consistency with postgres.rs::run_lifecycle.
DOC_CAP=5000

PGPW=$(docker inspect avry-postgres --format '{{range .Config.Env}}{{println .}}{{end}}' | grep '^POSTGRES_PASSWORD=' | cut -d= -f2-)
export PGPASSWORD="$PGPW"
PSQL=(psql -h 127.0.0.1 -U aivory -d "$DB" -v ON_ERROR_STOP=1 -tA)

# No-op until the engine has created the schema (lazy init on first turn).
present=$("${PSQL[@]}" -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='${SCHEMA}' AND table_name='memories';")
if [ "$present" != "1" ]; then
  echo "cerveau-lifecycle: ${SCHEMA}.memories not present yet; nothing to do"
  exit 0
fi

# Quota table may not exist yet (created by init_lifecycle_schema); create if absent
# so tier overrides can be seeded independently of engine order.
"${PSQL[@]}" -c "CREATE TABLE IF NOT EXISTS ${SCHEMA}.cerveau_tenant_quota (
  agent_id TEXT NOT NULL, category TEXT NOT NULL, max_rows BIGINT NOT NULL,
  PRIMARY KEY (agent_id, category));" >/dev/null
"${PSQL[@]}" -c "ALTER TABLE ${SCHEMA}.memories ADD COLUMN IF NOT EXISTS importance REAL;" >/dev/null

pruned=0
for spec in "conversation:${CONV_RETENTION_DAYS}" "daily:${DAILY_RETENTION_DAYS}"; do
  cat="${spec%%:*}"; days="${spec##*:}"
  n=$("${PSQL[@]}" -c "WITH d AS (
        DELETE FROM ${SCHEMA}.memories
         WHERE category='${cat}'
           AND created_at < now() - make_interval(days => ${days})
        RETURNING 1) SELECT count(*) FROM d;")
  pruned=$((pruned + n))
done

evicted=0
for spec in "core:${CORE_CAP}" "daily:${DAILY_CAP}" "conversation:${CONV_CAP}" "document:${DOC_CAP}"; do
  cat="${spec%%:*}"; cap="${spec##*:}"
  n=$("${PSQL[@]}" -c "WITH d AS (
        DELETE FROM ${SCHEMA}.memories WHERE id IN (
          SELECT r.id FROM (
            SELECT m.id, m.agent_id,
                   row_number() OVER (
                     PARTITION BY m.agent_id
                     ORDER BY m.importance DESC NULLS LAST, m.created_at DESC
                   ) AS rn
            FROM ${SCHEMA}.memories m WHERE m.category='${cat}'
          ) r
          LEFT JOIN ${SCHEMA}.cerveau_tenant_quota q
            ON q.agent_id = r.agent_id AND q.category='${cat}'
          WHERE r.rn > COALESCE(q.max_rows, ${cap}::bigint)
        ) RETURNING 1) SELECT count(*) FROM d;")
  evicted=$((evicted + n))
done

echo "cerveau-lifecycle: retention_pruned=${pruned} budget_evicted=${evicted}"
