-- ADR-025 Q2: how is Geno (agent_type 'autonomous') actually used today?
-- Run READ-ONLY against the production backend DB (billing schema). Not run from this repo.
-- Source: billing.credit_ledger.meta, which the vps-bridge fills with {agent_type, channel, session_id}
-- on each metered message (telegram-agent.js consumeMessageCredit). Other entry points (Console, API keys)
-- may not write agent_type; check the NULL row in query 1 before trusting any share below.

-- 1. Coverage: how much of the metered spend carries an agent_type at all?
SELECT (meta->>'agent_type') IS NOT NULL AS has_agent_type,
       count(*)           AS charges,
       sum(-delta)        AS credits
FROM billing.credit_ledger
WHERE delta < 0 AND created_at >= now() - interval '60 days'
GROUP BY 1;

-- 2. Share by agent and channel (last 60 days)
SELECT meta->>'agent_type'                AS agent_type,
       meta->>'channel'                   AS channel,
       count(*)                           AS charges,
       count(DISTINCT user_id)            AS users,
       sum(-delta)                        AS credits,
       round(100.0 * count(*) / sum(count(*)) OVER (), 1) AS pct_of_charges
FROM billing.credit_ledger
WHERE delta < 0 AND created_at >= now() - interval '60 days'
  AND meta->>'agent_type' IS NOT NULL
GROUP BY 1, 2
ORDER BY charges DESC;

-- 3. Geno concentration: how many users rely on Geno, and how many use ONLY Geno?
WITH per_user AS (
  SELECT user_id,
         count(*) FILTER (WHERE meta->>'agent_type' = 'autonomous') AS geno_charges,
         count(*) FILTER (WHERE meta->>'agent_type' <> 'autonomous') AS other_charges
  FROM billing.credit_ledger
  WHERE delta < 0 AND created_at >= now() - interval '60 days'
    AND meta->>'agent_type' IS NOT NULL
  GROUP BY user_id
)
SELECT count(*) FILTER (WHERE geno_charges > 0)                          AS users_using_geno,
       count(*) FILTER (WHERE geno_charges > 0 AND other_charges = 0)    AS users_geno_only,
       count(*) FILTER (WHERE geno_charges > 0 AND other_charges > 0)    AS users_geno_and_others,
       count(*)                                                          AS users_total
FROM per_user;
