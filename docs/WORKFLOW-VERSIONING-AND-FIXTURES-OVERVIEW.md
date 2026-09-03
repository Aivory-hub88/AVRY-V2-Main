# Workflow Versioning & Fixtures — Overview

**Status:** Shipped and live in production (part of the 106-commit backlog
that reached the VPS on 2026-08-05 alongside the Deep Diagnostic Indonesian
rollout — see `[[DEEP-DIAGNOSTIC-INDONESIAN-LANGUAGE-PLANNING]]` §7).
Founding commit `05b458f` (2026-07-23, version history + fixture capture),
extended by `5f1cf27` (2026-07-25, replay-against-fixture). Both were
already on `main` before this deploy — this doc exists because the VPS had
never been rebuilt against them until now.
**Repo:** `Aivory-hub88/avry-user-dashboard`
**Source:** written after live-VPS deployment surfaced ~103 previously
unshipped commits; captures what's actually in the code, not a plan. See
`[[workflow-copilot-three-followups]]` (item 3) for prior context on the
replay/pin-data design constraint.

---

## 1 · Workflow versioning

**What a version captures.** Snapshot-on-write, not diff-on-write — per
`lib/workflows/versionRepository.ts`'s own header comment, each version row
in `dashboard.workflow_versions` stores a **full copy**: `spec` (the
`AivoryWorkflowSpec`, jsonb) + `canvas` (the React Flow `{nodes, edges}`
state, jsonb, nullable) + `trigger_reason` (`ai_apply` | `manual_edit` |
`status_change` | `title_change` | `restore`). Append-only, version number
is `MAX(version)+1` at insert.

**When a version is created.** Deliberately *not* on every autosave — the
canvas autosaves every 800ms and that "would be far too noisy" per the code
comment. Instead, a shared `snapshotBeforeChange()` helper in
`app/workflows/page.tsx:718-731` fires at exactly 4 call sites, always
capturing the **pre-change** state:

| Trigger | Call site |
|---|---|
| `manual_edit` | `handleSaveStep` (`page.tsx:864`) |
| `status_change` | `handleStatusChange` (`page.tsx:883`) |
| `title_change` | `handleTitleSave` (`page.tsx:897`) |
| `ai_apply` | `handleApplyUpdateExisting` (`page.tsx:1279`) — Copilot merging generated steps into an already-open canvas |

Snapshotting is fire-and-forget (`.catch(() => {})` client-side) and the
server-side `snapshotVersion()` never throws — failures are logged and
swallowed so a version-history hiccup can never block the actual edit.

**What `VersionHistoryPanel.tsx` lets a user do.** Deliberately minimal:
lists versions newest-first (version number, a human label for the trigger
reason, timestamp) with a single **Restore** button per row. **No diff
view, no preview of contents, no version naming, and no confirmation
dialog** before restoring — clicking Restore calls the restore handler
directly.

**What restore actually does.** `POST /api/workflows/:id/versions/:version/restore`:
1. Loads the stored snapshot.
2. Writes it into Aivory's **local file-backed draft store**
   (`workflowRepository` → `.data/workflows.json`, `canvasRepository` →
   `.data/canvas_states.json`) — plain JSON files, not Postgres, not n8n.
3. Immediately snapshots the *restored* state as a new version tagged
   `restore` — restoring never deletes history, so restoring an older
   version again later effectively undoes a bad restore.
4. Client shows a toast and does a full page reload.

**It does not touch n8n.** Confirmed in code — the restore route never
imports `lib/workflows/n8nClient.ts`.

### ⚠️ Known gap — restore may silently no-op on deployed (active) workflows

`WorkflowCanvas.tsx` has two entirely separate data paths keyed on
`isActive`:
- **Active/deployed** workflows load and save directly against the live
  n8n instance (`handleSave` → `PUT /api/n8n/workflow/[id]`), bypassing the
  local `canvasRepository` entirely.
- **Draft** workflows use local autosave, gated by `!isActive`.

Version restore only ever writes to the local draft store (step 2 above).
The "Version history" button, however, is shown **unconditionally**
whenever any workflow is selected — there's no `isActive` check gating it.
So restoring a version on an already-active, n8n-deployed workflow writes
somewhere the active canvas doesn't read from, and after the reload the
restore likely won't visibly apply. **Versioning appears to have been
built and verified for draft workflows only**, but the UI doesn't
communicate that restriction. If you're asked to fix or extend this,
either gate the button on `!isActive`, or make restore push to n8n when
the target workflow is active — don't assume the current behavior is
correct for deployed workflows without checking first.

## 2 · Workflow fixtures

**What a fixture is.** A saved n8n execution's **raw run data**, captured
for regression comparison — not a synthetic/mock dataset. Per the
migration's own comment: "used as fixtures for regression-comparing a
workflow's future runs against a known-good (or known-bad) past run."
Stored in `dashboard.workflow_fixtures` as `{user_id, workflow_id,
execution_id, name, run_data}`.

Unlike versioning (unauthenticated, file-backed), fixtures **require a
real signed-in user** — capture reads the user's own n8n instance through
their stored, AES-256-GCM-encrypted credentials
(`dashboard.n8n_credentials`, `lib/crypto.ts`, `lib/workflows/n8nCredentialsServer.ts`).

**API surface** (`app/api/workflows/[id]/fixtures/...`):
- `POST .../fixtures` — capture: `{executionId, name}` → fetches the
  execution from n8n, stores its data as a fixture. 401 without a real
  user, 400 without connected n8n credentials.
- `GET .../fixtures` — list, newest-first.
- `GET`/`DELETE .../fixtures/:fixtureId` — single-fixture fetch/delete.
- `POST .../fixtures/compare` — `{executionId}` → always diffs against the
  **newest** fixture (`fixtures[0]`, no selection param) vs. a freshly
  fetched execution.
- `POST .../fixtures/replay` — `{n8nWorkflowId, executionId?}` → pins a
  fixture's data onto the live n8n workflow (see §3).
- `POST .../fixtures/replay/clear` — clears the pin.

**Compare is structural, not a value-level diff.** `diffRunData()` in
`lib/workflows/fixtureDiff.ts` compares a stored fixture against a fresh
live execution (not fixture-vs-fixture) and reports, per node: did it run
in both, did its error state change, did its item count change. It
explicitly does **not** deep-diff each node's actual JSON payload — the UI
labels this "a LIVE re-run comparison, not true offline replay" to avoid
confusion with the pin-based replay below.

## 3 · "Replay against fixture" — pin data, not a real trigger

This is the one part of the feature set worth understanding precisely,
because it's not what the name implies.

**The constraint:** n8n's API-key-authenticated REST API has **no endpoint
to trigger an ad-hoc run**. `POST /api/v1/workflows/:id/run` returns `405`
via API-key auth — confirmed empirically against a live n8n instance (per
the founding commit's own message). Only n8n's internal, session-cookie
endpoints support that, which aren't available for arbitrary end users
(only for VPS-owned admin sessions used elsewhere in the stack).

**The workaround, as actually implemented** (`lib/workflows/n8nClient.ts`):
1. `setWorkflowPinDataWithCreds()` fetches the current live workflow
   definition and PUTs it back with `pinData` merged in — because passing
   `pinData` as a run-request parameter is a no-op on this n8n version.
2. The user is told (via an alert after a successful pin, surfaced from
   the replay route's returned `webhookUrl`) to trigger the workflow
   **themselves** — via its real webhook if one exists, or manually inside
   n8n's own editor otherwise.
3. `clearWorkflowPinDataWithCreds()` resets `pinData` back to `{}}` once
   the user is done.

**This affects the LIVE workflow until cleared** — the UI does warn about
this, but there's no automatic expiry or safety timeout; a pin left in
place persists on n8n indefinitely until someone clears it.

**UI:** a per-execution-row button in the Execution Logs tab toggles
between "Replay against fixture" and "Clear pin" once pinned. Note:
`pinnedFixtureName` (the "currently pinned" indicator) is **local React
state only** — it is not fetched from n8n on page load, so a reload loses
the visual indicator even though the actual pin is still live on n8n.
Don't rely on the UI to tell you whether a workflow currently has pinned
data; check n8n directly if it matters.

A separate, bridge-side capability referenced in code comments ("Stage
15/C4," `n8n-as-code-service/index.js`) exists for copilot-generated
drafts under sandbox test — that's outside this repo and not verified here;
`fixtureDiff.ts`'s `buildPinDataFromFixtureRunData()` is explicitly
documented as its TypeScript twin.

**`ApplyTargetDialog.tsx` is unrelated to fixtures**, despite living in the
same area of the workflow builder — it's the Copilot's "Apply" modal
(Update existing vs. Save as new draft). Its only connection to this doc is
that choosing "Update existing" is one of the four triggers for a
version-history snapshot (§1).

## 4 · Gating

**No plan-tier gating for either feature.** `lib/moduleAccess.ts` only
gates at the whole-module level (`workflows` → `/workflows`) via the
demo-account allowlist pattern — there's no separate key for versioning or
fixtures specifically. The default demo allowlist
(`console, diagnostics, blueprint, roadmap`) doesn't include `workflows`,
so demo accounts can't reach the workflow builder — and therefore neither
feature — unless an admin explicitly adds it. Normal accounts get both,
unconditionally, with no Enterprise/paid tier restriction.

## 5 · Known issues — read before extending this feature

1. **Version restore likely no-ops on active/deployed workflows** — see the
   §1 callout. This is the most important gap; verify before relying on
   restore for a live workflow.
2. **No restore confirmation or preview** in `VersionHistoryPanel` — a
   misclick restores immediately (though non-destructively, since it's
   itself versioned).
3. **`pinnedFixtureName` doesn't survive a page reload** — it's transient
   client state, not re-derived from n8n's actual `pinData` on load.
4. **`compare` and `replay` (without `executionId`) both hard-select the
   single newest fixture** — no fixture picker exists for choosing among
   multiple named fixtures in either flow, only for replay-by-`executionId`.
5. **The pin→trigger→clear round trip was not fully live-verified before
   merge** — the `5f1cf27` commit message itself notes this: "Could not
   click-test the full pin/clear round trip live... unavailable in this
   local sandbox." Worth a real end-to-end pass against a live n8n instance
   before leaning on this feature for anything important.
6. No `TODO`/`FIXME`/stub markers exist in the reviewed files — the gaps
   above are architectural, not flagged-and-forgotten.

## 6 · Relevant files

- **Versioning:** `lib/workflows/versionRepository.ts`,
  `migrations/dashboard-workflow-versions.sql`,
  `app/api/workflows/[id]/versions/route.ts`,
  `app/api/workflows/[id]/versions/[version]/restore/route.ts`,
  `components/workflow/VersionHistoryPanel.tsx`,
  `lib/workflows/repository.ts` (local draft store),
  `lib/workflows/canvasRepository.ts` (local canvas store)
- **Fixtures + replay:** `lib/workflows/fixtureRepository.ts`,
  `lib/workflows/fixtureDiff.ts`, `migrations/dashboard-workflow-fixtures.sql`,
  `app/api/workflows/[id]/fixtures/route.ts`,
  `app/api/workflows/[id]/fixtures/[fixtureId]/route.ts`,
  `app/api/workflows/[id]/fixtures/compare/route.ts`,
  `app/api/workflows/[id]/fixtures/replay/route.ts`,
  `app/api/workflows/[id]/fixtures/replay/clear/route.ts`,
  `lib/workflows/n8nClient.ts` (`setWorkflowPinDataWithCreds`,
  `clearWorkflowPinDataWithCreds`), `lib/crypto.ts`,
  `lib/workflows/n8nCredentialsServer.ts`
- **Key commits:** `05b458f` (founding commit — version history, fixture
  capture, Switch/Code/retry nodes), `5f1cf27` (replay-against-fixture,
  pin + manual trigger)
