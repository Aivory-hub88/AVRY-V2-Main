# Account Auto-Cleanup — Overview

**Status:** Shipped and live in production (2026-08-25), but disabled by
default — see §4. Not the same thing as [[DEMO-ACCOUNT-DATA-ISOLATION-AND-CLEANUP-OVERVIEW]],
which is a manually-triggered admin action scoped to demo accounts only and
explicitly exempted from everything below.
**Repos:** `Aivory-hub88/avry-backend` (all of it), plus one small change
each in `Aivory-hub88/Frntend-nxt` (landing site login) for the login-block
UX.
**Source:** written immediately after the feature shipped, from the actual
diffs and live verification against production data — not a plan.

## 1 · What this is

Two independent, fully automatic policies that hard-delete accounts which
never became paying customers:

- **Policy A — never-purchased signups.** A free-tier account gets 32
  hours from `created_at` to complete any purchase. A warning email fires
  once at the 24h mark. Trying to log in during the window is **blocked**
  (`402 payment_required` with a deadline) and redirected to a
  `/complete-payment` page instead of the dashboard. Still unpurchased at
  32h → hard-deleted.
- **Policy B — lapsed subscriptions.** A subscriber whose
  `identity.user_tiers.expires_at` passes gets a 40-day grace period (one
  warning email at lapse). Login stays allowed during the grace period —
  the existing entitlement-read path already reports a lapsed tier as
  `tier = None`, so access degrades naturally without a hard gate. Still
  unrenewed after 40 days → hard-deleted.

Both policies explicitly exclude `admin`, `superadmin`, and `demo` accounts
in every query — see §6 for why that needed a follow-up fix.

## 2 · Where "has this user ever paid" actually comes from

Two real, live signals, both schema-qualified reads into the *same*
Postgres database (`identity.*` for avry-backend's own tables, `billing.*`
for avry-payments') — not a cross-service call:

- Policy A: `NOT EXISTS (SELECT 1 FROM billing.payment_orders WHERE
  user_id = u.id AND status = 'paid')`.
- Policy B: `identity.user_tiers.expires_at`, written by avry-payments'
  `entitlements.py` `grant_entitlement()` after every real settlement, and
  already correctly read by `entitlement_state.get_entitlements()`
  (`expires_at < now()` → `expired`).

**Discovery made while building this:** `identity.user_tiers` was never
actually being populated in production, because `avry-backend`'s `main.py`
(the repo-root entrypoint the Dockerfile actually runs — not `app/main.py`,
which is dead code, see §7) never registered `app/routes/entitlements.py`'s
router. avry-payments had been calling
`POST /api/v1/entitlements/internal/grant` into a 404 since that route was
written. Fixed as a prerequisite — Policy B has no real data to act on
otherwise.

## 3 · Hard-delete mechanics

`account_cleanup.py`'s `_hard_delete()`, one transaction:

1. Insert a compact record into `deleted_users_archive` (id, email,
   account_type, created_at, deleted_at, reason) — the only remaining
   answer to "did we really delete this person, and when" once the live
   row is gone.
2. Delete matching rows from **both** `identity.audit_logs` /
   `identity.impersonation_sessions` **and** `audit.audit_logs` /
   `audit.impersonation_sessions` — a schema-drift artifact means both
   physically exist with `NO ACTION` foreign keys to `users.id`, so both
   must be cleared or the delete below fails.
3. `DELETE FROM users WHERE id = ...` — `sessions` and
   `password_reset_tokens` cascade automatically (`ON DELETE CASCADE`).

`billing.*` rows (payment_orders, user_tiers, notifications, user_credits)
are deliberately **left in place** as orphaned historical/financial
records — deleting a customer's account shouldn't erase the transaction
ledger.

## 4 · Safety rail: ships disabled

`ACCOUNT_CLEANUP_ENABLED` (default `false`) gates the poller
(`app/services/account_cleanup.py::run_poller()`, an in-process
`asyncio.create_task` loop started from `main.py`'s lifespan, mirroring
avry-payments' `fx.py` poller pattern — no cron/systemd-timer involved).
Disabled means the poller still runs on its normal interval
(`ACCOUNT_CLEANUP_INTERVAL_SECONDS`, default 1800s) and logs exactly what it
*would* warn/delete, but sends no mail and deletes nothing.

**Why this matters — the 41-account finding.** Before shipping, the exact
eligibility SQL was run against production: **41 of the 48 real accounts
at the time (85%) would have qualified for immediate Policy-A deletion** if
applied to the existing backlog mechanically. That's not a bug in the
query — every pre-existing account is trivially older than 32 hours, so
"32h since signup" degenerates into "delete everyone who never paid" for
anyone who already existed when the feature shipped. Also found: the one
`account_type = 'paid'` user in that backlog
(`regtest_4cfe97@t.id`) had zero rows in `billing.payment_orders` — a
manually-flagged test account, not a real customer, illustrating why the
eligibility check reads real payment records rather than trusting
`account_type`. And the 11 `status = 'paid'` rows that did exist in
`billing.payment_orders` were all synthetic load-test data from 2026-06-05
(`customer_email = NULL`, sequential timestamps, no matching `users` row) —
so at ship time, zero of the 48 real accounts had ever completed a genuine
purchase.

**Decision:** ship Policy A so it only ever bites accounts created *after*
go-live (true by construction — `created_at` is always compared against a
rolling window). What to do with the existing 41-account backlog is a
**separate, deliberate decision**, deferred rather than auto-applied.
Re-run the query below periodically to see current numbers; nothing acts on
it until `ACCOUNT_CLEANUP_ENABLED=true` is set and the container restarted.

```sql
SELECT count(*) FROM identity.users u
WHERE u.is_active = true
  AND u.account_type NOT IN ('admin','superadmin','demo')
  AND u.created_at < now() - interval '32 hours'
  AND NOT EXISTS (
    SELECT 1 FROM billing.payment_orders p
    WHERE p.user_id = u.id AND p.status = 'paid'
  );
```

## 5 · Login block (Policy A only)

`auth_service.py`'s `login()`, right after password verification: if
`account_cleanup.check_payment_required(user_id)` returns a deadline, raises
`PaymentRequiredError(deadline_at)`. `routes/auth.py` catches it and returns
`HTTP 402` with `{"error": "payment_required", "deadline_at": "<iso8601>"}`
instead of issuing tokens. On the landing site, `lib/auth.ts`'s `login()`
throws a matching `PaymentRequiredError`; `LoginClient.tsx` catches it and
redirects to `/complete-payment?deadline=<iso>` (new page,
`CompletePaymentClient.tsx`) — a countdown and a link into checkout, no
path back into the dashboard. Policy B does **not** gate login this way by
design (see §1).

## 6 · Staff accounts

Policy A excluded `admin`/`superadmin`/`demo` from the start. Policy B
initially did **not** — a follow-up fix added the same
`account_type NOT IN ('admin','superadmin','demo')` guard to both its warn
and delete queries, matching `admin_users.py`'s existing
`MANAGED_ACCOUNT_TYPES`. Verified live against a real superadmin account
with a synthetic lapsed `user_tiers` row: confirmed excluded from both
warn and delete candidate lists before the fix went out.

## 7 · A landmine worth remembering

`avry-backend` has **two** `main.py` files: `app/main.py` (looks like the
entrypoint, is dead code — nothing imports it) and the repo-root `main.py`
(what the Dockerfile's `CMD ["python", "main.py"]` actually runs). The
account-cleanup poller and the entitlements router were first wired into
`app/main.py` by mistake, silently doing nothing, before this was caught
and moved to the real entrypoint. Check `Dockerfile`'s `CMD` before assuming
which `main.py` is live.

## 8 · Verification

- Login-block tested live end-to-end: registered a throwaway account,
  attempted login within the 32h window, got `402` with the correct
  deadline (`created_at + 32h`), confirmed in a real browser session that
  it redirects to `/complete-payment` with an accurate countdown.
- Hard-delete transaction tested against a synthetic account backdated
  40h: archive row written, both `audit_logs`/`impersonation_sessions`
  variants cleared, user row gone, no FK errors.
- Policy B queries tested against a synthetic `user_tiers` row backdated
  to a 41-day-old lapse: correctly appeared in both warn and delete
  candidate lists before the staff-exemption fix, correctly excluded
  after it (tested against a real superadmin account).
- All synthetic test data removed after each check; none of the 4 real
  demo accounts or any real free-tier account were touched.

## 9 · Known gaps

- No admin-facing UI to browse dry-run candidates — only container logs
  (`docker logs avry-backend | grep cleanup`).
- `entitlement_state.overlay()` is still never called from
  `auth_service.py`'s `_build_user_response()` — login/`/me` responses
  still compute tier from the legacy JSON-file `_compute_tier()`, not the
  Postgres-backed entitlement state this feature reads directly via raw
  SQL. Pre-existing, unrelated to this feature's correctness, not fixed
  here.
- The 41-account backlog decision (§4) is still open.
