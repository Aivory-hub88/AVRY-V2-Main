-- Cerveau task ledger health check. READ-ONLY: every statement is a SELECT.
--
-- Run (on the VPS):
--   docker exec -i avry-postgres psql -U aivory -d aivory -f - < ops/cerveau-ledger-health.sql
-- or paste into psql. Each section prints a title, then rows. An empty section under a
-- "PROBLEM:" title means that check is clean.
--
-- What the ledger is: cerveau.agent_tasks = open work (todo/in_progress/blocked/cancelled),
-- cerveau.agent_tasks_archive = finished work (gzip JSON, 40 days). Mission Control reads
-- both. The dashboard writes only one thing: Stop => status 'cancelled'.

\pset null '-'
\pset pager off

\echo '== 0. SCHEMA: expect 6 delegation columns, the partial index and the archive context_id'
SELECT count(*) AS delegation_columns_present_expect_6
FROM information_schema.columns
WHERE table_schema = 'cerveau' AND table_name = 'agent_tasks'
  AND column_name IN ('context_id','parent_task_id','delegated_by','delegation_id','outcome','result_summary');
SELECT indexname FROM pg_indexes
WHERE schemaname = 'cerveau' AND tablename = 'agent_tasks' AND indexname = 'idx_agent_tasks_delegation';
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'cerveau' AND table_name = 'agent_tasks_archive' AND column_name = 'context_id';

\echo ''
\echo '== 1. OVERVIEW: live rows by agent_type and status'
SELECT agent_type, status, count(*) AS n, min(updated_at) AS oldest_update, max(updated_at) AS newest_update
FROM cerveau.agent_tasks GROUP BY 1, 2 ORDER BY 1, 2;

\echo ''
\echo '== 2. OVERVIEW: archive (finished work) volume'
SELECT count(*) AS total_rows,
       count(*) FILTER (WHERE archived_at > now() - interval '24 hours') AS last_24h,
       count(*) FILTER (WHERE archived_at > now() - interval '7 days')  AS last_7d,
       min(archived_at) AS oldest, max(archived_at) AS newest
FROM cerveau.agent_tasks_archive;

\echo ''
\echo '== 3. PROBLEM: archive rows past the 40-day retention (the sweep should have deleted them)'
SELECT task_id, tenant_id, agent_type, archived_at
FROM cerveau.agent_tasks_archive WHERE archived_at < now() - interval '41 days' LIMIT 20;

\echo ''
\echo '== 4. PROBLEM: in_progress rows nobody is working on (own tasks idle > 30 min)'
SELECT task_id, tenant_id, agent_type, session_id, title, now() - updated_at AS idle
FROM cerveau.agent_tasks
WHERE status = 'in_progress' AND delegation_id IS NULL AND updated_at < now() - interval '30 minutes'
ORDER BY updated_at LIMIT 30;

\echo ''
\echo '== 5. PROBLEM: delegated rows still in_progress > 15 min (a delegation that long is suspect; the reaper should settle a lost one within ~60 s)'
SELECT task_id, tenant_id, agent_type, delegated_by, delegation_id, now() - updated_at AS idle, title
FROM cerveau.agent_tasks
WHERE status = 'in_progress' AND delegation_id IS NOT NULL AND updated_at < now() - interval '15 minutes'
ORDER BY updated_at LIMIT 30;

\echo ''
\echo '== 6. PROBLEM: blocked with no reason (the board and the operator cannot tell what it waits for)'
SELECT task_id, tenant_id, agent_type, title, updated_at
FROM cerveau.agent_tasks WHERE status = 'blocked' AND coalesce(btrim(blocked_reason), '') = '' LIMIT 30;

\echo ''
\echo '== 7. PROBLEM: delegation outcome and status disagree (outcome set but not blocked, or a failed delegation with no outcome)'
SELECT task_id, agent_type, status, outcome, blocked_reason
FROM cerveau.agent_tasks
WHERE (outcome IS NOT NULL AND status <> 'blocked')
   OR (status = 'blocked' AND outcome IS NULL AND blocked_reason LIKE 'Delegation failed%')
LIMIT 30;

\echo ''
\echo '== 8. PROBLEM: same delegation id on more than one live row (one row must track one delegation)'
SELECT delegation_id, count(*) AS rows_for_it FROM cerveau.agent_tasks
WHERE delegation_id IS NOT NULL GROUP BY 1 HAVING count(*) > 1;

\echo ''
\echo '== 9. PROBLEM: duplicate open tasks (same tenant + agent + title, still open) — agents creating rows they should adopt'
SELECT tenant_id, agent_type, title, count(*) AS copies, min(created_at) AS first_created
FROM cerveau.agent_tasks
WHERE status IN ('todo','in_progress','blocked')
GROUP BY 1, 2, 3 HAVING count(*) > 1 ORDER BY copies DESC LIMIT 20;

\echo ''
\echo '== 10. INFO: open rows with no session_id (they cannot be grouped under a room round nor reach the room ledger hint)'
SELECT agent_type, count(*) AS rows_without_session
FROM cerveau.agent_tasks
WHERE session_id IS NULL AND status IN ('todo','in_progress','blocked') GROUP BY 1 ORDER BY 2 DESC;

\echo ''
\echo '== 11. INFO: parents without children / children without a parent per session (Aira orchestration convention)'
WITH s AS (
  SELECT tenant_id, session_id,
         count(*) FILTER (WHERE agent_type = 'chief_of_staff') AS parents,
         count(*) FILTER (WHERE agent_type <> 'chief_of_staff') AS children
  FROM cerveau.agent_tasks
  WHERE session_id IS NOT NULL AND status IN ('todo','in_progress','blocked') GROUP BY 1, 2)
SELECT count(*) FILTER (WHERE parents > 0 AND children = 0) AS parent_only_sessions,
       count(*) FILTER (WHERE parents = 0 AND children > 0) AS child_only_sessions,
       count(*) FILTER (WHERE parents > 1) AS sessions_with_several_parents
FROM s;

\echo ''
\echo '== 12. INFO: operator-stopped rows (cancelled) still in the table — kept as audit trail, hidden from the board'
SELECT count(*) AS cancelled_rows, max(updated_at) AS latest FROM cerveau.agent_tasks WHERE status = 'cancelled';

\echo ''
\echo '== 13. INFO: tenants with the most open work (capacity / runaway loops)'
SELECT tenant_id, count(*) AS open_rows FROM cerveau.agent_tasks
WHERE status IN ('todo','in_progress','blocked') GROUP BY 1 ORDER BY 2 DESC LIMIT 10;
