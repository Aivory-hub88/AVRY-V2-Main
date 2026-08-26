# Cerveau Approval UX Plan — Telegram-routed HITL

**Status:** draft — awaiting user approval of scope
**Created:** 2026-08-22
**Related:** `CERVEAU-ERP-INTEGRATION-PLAN.md` (Phase 1 tiering), `CERVEAU-STATUS.md` (2026-08-22 entry)

## Problem

ERP writes (and every other `irreversible` tool) now correctly gate behind F-1 pending approvals — but the approval surface is **invisible**: no dashboard UI lists pending rows, and nothing notifies the human that an approval is waiting. Strict HITL with a silent queue is functionally the same as denial.

## What already exists (verified 2026-08-22, no Cerveau changes needed)

- Gateway tenant-scoped approve/deny API: `api_tenant_approvals.rs` on `:3100`/`:3101`
- `/webhook` responses carry this turn's pending-approval summary structurally (`PendingApprovalSummary`, patch 0035)
- Reaper sweep for undelivered approvals exists (patch 0032)
- vps-bridge already owns per-user Telegram wiring (bot, chat mapping, callback infra)

## Phase A — Approvals visible in the user dashboard

1. **Backend proxy routes** in avry-backend: authenticated passthrough from dashboard session → gateway tenant-approvals API (`GET pending`, `POST resolve`) with `user_id` taken from the verified JWT only — never from client payload.
2. **Dashboard UI**: an "Approvals" panel (agent modal badge + simple list page). Each row: tool name, arguments summary, origin message excerpt, created-at; buttons Approve / Deny. Poll or refetch-on-open.
3. **Acceptance**: ERP write attempt as a test tenant → row appears → Deny leaves state unchanged and agent turn reports refusal; Approve executes out-of-band (patch 0028 durable resume path).

## Phase B — Telegram push + one-tap resolution via vps-bridge

1. When a `/webhook` response contains `pending_approval`, the caller (bridge / backend) forwards it to the user's Telegram chat: tool + short args summary + two inline buttons.
2. Buttons hit the same Phase-A proxy (callback → resolve → edit message to "Approved ✓" / "Denied ✕"). No bot-side trust decisions: the Telegram callback still authenticates through the dashboard session bound to that chat.
3. **Acceptance**: end-to-end under 10s from agent write attempt to tappable notification on the user's phone.

## Phase C — Out-of-band turns (cron/proactive agents), later

Turns with no webhook caller can't carry a summary. That's where upstream's `ApprovalRoute { approver_channel, on_no_approver, timeout_secs }` applies: register a real channel in Cerveau config (Telegram via bridge relay or a WS channel), set `approval_route` on the ERP risk profiles, keep fail-closed defaults. Only worth doing once Phase B proves demand and cron agents exist (see advancement analysis).

## Explicit non-goals

- No auto-approve relaxation of the hard floor (submit/cancel/delete/workflow stay gated forever).
- No Cerveau source changes in A/B; Phase C may need none too (config-only) if the channel registry covers delivery.
- Secrets never pass through the bridge: Telegram carries ids/buttons, never credentials.

## Open decisions for the user

1. Approve Phase A+B scope (dashboard proxy/UI + bridge push)?
2. Which surface first inside the dashboard: badge on the agent card vs dedicated page?
