# Demo Account Data Isolation & Cleanup — Overview

**Status:** Shipped and live in production (2026-08-25).
**Repos:** `Aivory-hub88/avry-backend`, `Aivory-hub88/avry-user-dashboard`,
`Aivory-hub88/avry-admin-dashboard`.
**Source:** written immediately after the fix shipped, from the actual
diffs and live verification — not a plan.

**Don't confuse this with [[ACCOUNT-CLEANUP-OVERVIEW]]** — that's an
unrelated, fully automatic background job (`avry-backend`'s
`app/services/account_cleanup.py`) that hard-deletes *regular* signups who
never purchase (32h window) or subscribers who lapse (40-day grace). It
explicitly **exempts** `admin`/`superadmin`/`demo` accounts. This doc covers
a separate, **manually-triggered** admin action that wipes a **demo**
account's content on purpose, plus a client-side bug that was leaking one
account's data into another's.

## 1 · The problem

Aivory's demo accounts (`account_type = 'demo'`, created via the admin
dashboard's "Create Demo User") get handed to different sales prospects over
time — same login credentials, reused across calls. Two symptoms were
reported:

1. A demo account's dashboard (Deep Diagnostic result, Blueprint, Roadmap,
   chat/console history, Workflow Copilot drafts) sometimes showed content
   that clearly belonged to a *different* demo session — "sharing data"
   between accounts.
2. Resetting a demo account's password didn't clear any of that content —
   the next prospect still saw the previous one's demo output.

## 2 · Root cause

One underlying bug explained both symptoms, plus a design gap.

**The bug — `avry-user-dashboard`'s report cache leaked across accounts on
a shared browser.** `lib/reportStorage.ts` treats localStorage as a
write-through cache for Deep Diagnostic/Blueprint/Roadmap results, keyed by
a **global** key (`aivory_deep_result`, `aivory_blueprint`,
`aivory_roadmap`, `aivory_diagnostic_context`), not per-account. Two things
made this a real leak, not just a display glitch:

- `logout()` in `lib/auth.ts` removed only the `aivory_auth` session key —
  every other cache (`aivory_*` keys, plus `console_session_id` for the
  Console) survived a logout untouched.
- `reportStorage.ts`'s `loadEntity()` had a "migrate old local reports up"
  step, left over from the one-time Supabase→Postgres cutover: whenever it
  saw an authenticated session with an **empty** server row and a
  **non-empty** local cache, it POSTed the local cache up to that account's
  own server row. On a device reused across demo accounts, this meant
  logging into a fresh/reset demo account didn't just *display* the
  previous account's cached diagnostic — it **wrote that data into the new
  account's own Postgres row**, permanently.

**The design gap — nothing ever cleared server-side usage data.** The
admin-triggered password reset (`admin_users.py`'s
`reset_account_password`) only ever updated `password_hash`. There was no
action anywhere that wiped a demo account's Deep
Diagnostic/Blueprint/Roadmap/Workflow content. Even without the client-side
bug, reusing a demo account across prospects would always show stale
content until something explicitly cleared it.

**A second, unrelated gap found while fixing this:** the admin dashboard's
"Reset Password" modal (`ResetPasswordModal.tsx`) already shipped with
"Set directly" and "Generate" modes calling
`POST /api/v1/admin/users/{id}/reset-password` — but that backend endpoint
**did not exist at all**. Those two modes had been silently 404ing since the
modal was built. Fixed as part of this work since the new "clear usage data"
option needed to live somewhere on this exact request path.

## 3 · The fix

### 3.1 Stop the leak (client-side, `avry-user-dashboard`)

- **`lib/auth.ts`, `logout()`** now sweeps every `aivory_`-prefixed
  localStorage key plus `console_session_id`, instead of removing only
  `aivory_auth`. New caches added later are covered automatically as long as
  they keep the `aivory_` prefix convention.
- **`lib/reportStorage.ts`, `loadEntity()`** no longer migrates a local
  cache onto an authenticated-but-empty server row. An empty server row now
  just means "this account has nothing yet" — full stop. No more
  cross-account writes.

### 3.2 Give admins a way to actually clear a demo account (new, `avry-backend` + `avry-admin-dashboard`)

**`app/services/demo_data_cleanup.py`** (avry-backend, new module) — two
functions:

- `invalidate_sessions(user_id)` — `DELETE FROM sessions WHERE user_id = $1`
  (force-logout everywhere).
- `clear_usage_data(user_id)` — deletes the account's rows from every
  `dashboard.*` table:
  `diagnostic_contexts`, `diagnostic_results`, `blueprints`, `roadmaps`,
  `diagnostic_history`, `workflow_versions`, `workflow_fixtures`,
  `workflow_approval_cases`, `n8n_credentials`.

  These tables belong to `avry-user-dashboard`'s own schema (its
  `migrations/dashboard-storage.sql`), not anything avry-backend otherwise
  owns — but every Aivory service shares one Postgres database
  (`DATABASE_URL`), only the schema differs, so a schema-qualified `DELETE`
  reaches them directly. No cross-service HTTP call needed.

  Deliberately **excluded**: `billing.*` (credits, payment/order history) —
  those are financial records, not demo content, and wiping them was never
  part of the ask.

Two ways an admin triggers this:

1. **"Logout & Clear Data"** — new dropdown action on demo rows in the
   admin dashboard's Admin Accounts table (`AdminTable.tsx`). One click +
   a native `confirm()` → `POST /api/v1/admin/admin-accounts/{id}/logout`
   → `invalidate_sessions` + `clear_usage_data`. Backend-side, this 400s if
   the target isn't `account_type = 'demo'` — it's not available for any
   other account type.
2. **Reset Password modal's "clear usage data" checkbox** — only rendered
   when `accountType === "demo"`. Forwards `clearUsageData: true` through
   the (now-implemented) `POST /api/v1/admin/users/{id}/reset-password`,
   which runs the same `clear_usage_data()` regardless of which password
   mode (`email` / `set` / `generate`) was chosen. Same 400 guard for
   non-demo targets.

### 3.3 Fix the missing reset-password endpoint (`avry-backend`)

`POST /api/v1/admin/users/{user_id}/reset-password` — new. Three modes:

| mode | behavior |
|---|---|
| `email` (default) | mails a one-time reset link via the existing `password_reset_service.request_reset()`; password unchanged until the link is used |
| `set` | applies the supplied password immediately |
| `generate` | mints a strong password server-side, returns it once |

`set`/`generate` both call `password_reset_service.invalidate_all()`
(kills outstanding reset links) and `demo_data_cleanup.invalidate_sessions()`
(kills active sessions) — matching what the frontend modal already told
admins would happen. Resetting an admin/superadmin password still requires
superadmin, same privilege rule as the older `admin-accounts` reset-password
endpoint.

While wiring this, `identity.password_reset_tokens` was also added to
`pg_service.py`'s schema migration — it existed live via manual setup only,
same situation `identity.user_tiers` was in before an earlier fix.

## 4 · What was rescued into git

Three files existed only as untracked files on the VPS (real, running code,
never committed):

- `avry-admin-dashboard`: `src/components/admin/ResetPasswordModal.tsx`,
  `src/app/api/admin/users/[userId]/reset-password/route.ts`
- `avry-backend`: (from an earlier, related fix) `password_reset_service.py`,
  `email_service.py`, `entitlement_state.py`, `app/routes/entitlements.py`

All are now tracked on `main` in their respective repos.

## 5 · Verification

- New backend endpoints confirmed registered and auth-gated:
  `POST .../admin-accounts/{id}/logout` and
  `POST .../users/{id}/reset-password` both return `401` with no token.
- `demo_data_cleanup.clear_usage_data()` / `invalidate_sessions()` tested
  against synthetic rows (a throwaway test user, one row in
  `dashboard.diagnostic_contexts`, one in `dashboard.blueprints`, one
  session) — confirmed all three gone after the call, synthetic user then
  deleted.
- The four real demo accounts (`demo.showcase@aivory.id`,
  `guest1@aivory.id`, `guest2@aivory.id`, `GuestVIP@aivory.id`) were
  **not** touched by any of this testing.
- All three services (`avry-backend`, `avry-user-dashboard`,
  `avry-admin-dashboards`) rebuilt and redeployed; confirmed healthy
  post-deploy.

## 6 · Known gaps / not done

- No confirmation *modal* for "Logout & Clear Data" — it's a native
  `window.confirm()`. Consistent with how quickly this needed to ship, not
  with the rest of the admin dashboard's modal-based destructive actions
  (e.g. `DeactivateModal.tsx`).
- Credits (`billing.user_credits`) are not reset by this action. A demo
  account that's been used enough to exhaust its monthly allowance stays
  exhausted until the natural monthly reset (`credit_service.py`).
- No audit trail for who clicked "Logout & Clear Data" or when — unlike
  the hard-delete path in `account_cleanup.py`, which archives to
  `deleted_users_archive` before deleting. Worth adding if demo-account
  misuse ever needs investigating.
- `entitlement_state.overlay()` being unwired from `auth_service.py`
  (a separate, pre-existing bug noted while working in this area) is still
  unfixed.
