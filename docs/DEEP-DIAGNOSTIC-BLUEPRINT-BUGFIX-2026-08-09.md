# Deep Diagnostic & Generate Blueprint — Bug-fix Batch (2026-08-09)

**Status:** ALL FIXES SHIPPED & DEPLOYED 2026-08-09 (dashboard commits `66d38e7`, `d519cef` on `Aivory-hub88/avry-user-dashboard` main; vps-bridge fix applied live, untracked — see §4).
**Trigger:** a real customer's Business Operations Assessment PDF (company "Bastion", exported as `Business_Operations_Assessment_Acme.pdf`) surfaced three data-integrity bugs in the same report, plus a separate performance complaint on Generate Blueprint.
**Repos/services touched:** `Aivory-hub88/avry-user-dashboard` (Next.js dashboard) + `/home/ubuntu/AVRY/vps-bridge` (Node/Express + BullMQ worker on the VPS, **not** a git repo).
**Owner:** Irfan · **Created:** 2026-08-09

---

## TL;DR (Bahasa Indonesia)

User melaporkan laporan Business Operations Assessment (Deep Diagnostic) yang
salah menampilkan nama perusahaan ("Acme" padahal yang diisi "Bastion"), tiga
kendala berbeda menunjukkan estimasi jam/biaya yang identik (~2,4 jam/minggu,
~Rp 68.000.000/thn untuk ketiganya), dan tarif tenaga kerja Rupiah yang tidak
masuk akal (Rp 538.857/jam). Ketiganya adalah bug nyata di kode, sudah
diperbaiki dan di-deploy. Terpisah, "Generate Blueprint" berjalan lambat
(3-5 menit) — root cause-nya bukan model AI-nya, tapi zeroclaw yang selalu
menjalankan permintaan lewat persona `agent_analyst_brain` yang agentic dan
membawa ~50 tools tidak relevan. Fix: panggil OpenRouter langsung dari
vps-bridge (skip zeroclaw), memangkas waktu generate dari **3:45 → 1:12**
(verified live oleh user).

---

## 1. Company name shows a stale, unrelated value ("Acme" instead of "Bastion")

**File:** [`app/diagnostics/deep/page.tsx`](../frontend/avry-user-dashboard/app/diagnostics/deep/page.tsx) (intake flow)
**Commit:** `66d38e7`

**Root cause:** on mount, the intake page unconditionally copied `companyName`
from any leftover *incomplete* saved session into live form state — before
the user chose "Resume" or "Start Fresh" on the resume banner:

```ts
// before
if (progress) {
  setSavedProgress(progress)
  if (progress.companyName) setCompanyName(progress.companyName)   // ← applied immediately
}
```

The actual phase answers correctly stayed empty until `handleResume()` was
explicitly clicked, but `companyName` didn't wait for that same choice. A
user who ignored the resume banner and just filled in fresh answers still
submitted under the old company name — exactly reproducing the "Acme
answers vs Bastion document" symptom.

**Fix:** only stage the saved progress for the banner; `companyName` (like
phase data) is now applied *only* inside `handleResume()`.

---

## 2. Identical "~2,4 jam/minggu / Rp 68.000.000" for 3 different constraints

**File:** [`lib/bottleneckQuantification.ts`](../frontend/avry-user-dashboard/lib/bottleneckQuantification.ts)
**Commit:** `66d38e7`

**Root cause (the real one — two layered bugs):**

1. `HOURS_RE` only matched English units: `/([\d]+(?:\.\d+)?)\s*(?:hrs?|hours?)\b/i`.
   It never recognized Indonesian **"jam"/"j"**. So an answer like
   `"onboarding ~10j, pelaporan ~6j, koordinasi ~4j"` silently failed to
   parse *at all* — `parsedHours.length` stayed `0` — and the code fell
   through to its equal-weight fallback (`hoursReclaimedPerYear / 52 /
   painPoints.length`, same number for every item, explicitly labelled
   "estimated allocation").
2. Even after fixing the regex, Indonesian morphology broke the label
   matcher: `overlapScore()` required an exact shared word, so
   `"pelaporan"` (the estimate) never matched `"laporan"` (the pain point) —
   different tokens once Indonesian's `pe-...-an` circumfix is applied.

**Fix:**
- `HOURS_RE` now matches `jam|j` too, and Indonesian decimal commas
  (`10,5` → `10.5`).
- `overlapScore()` gained `stemMatch()`: two words count as a match if one
  is a ≥5-character substring of the other (`"pelaporan".includes("laporan")`).
- `matchHoursToPainPoints()` gained an equal-count positional fallback: if
  `painPoints.length === parsed.length`, any pairs still unmatched after
  word/stem scoring are aligned by original order — equal counts strongly
  imply a 1:1 correspondence the user intended.

**Verified:** the exact Bastion-style input now produces distinct real
figures per item (10 / 4 / 6 jam, `isEstimated: false`) instead of 2.4/2.4/2.4.
All 28 existing ROI unit tests still pass unchanged.

---

## 3. IDR labor rate not tied to real Indonesian wages

**File:** [`services/deepDiagnostic.ts`](../frontend/avry-user-dashboard/services/deepDiagnostic.ts)
**Commit:** `66d38e7`

**Root cause:** the assumed hourly labor rate (`assumedHourlyRateLocal`) was
computed as `industryHourlyRateUSD × fxRate` for every currency, with no
localization. For IDR: a small Tech team's rate ($32.5/hr after the 0.5
small-team factor) × the market FX rate (~16,580) = **Rp 538,857/hour** —
about 16x Jakarta's real minimum wage.

**Fix:** for `currencyCode === 'IDR'`, the rate is now anchored to
**UMP DKI Jakarta 2026 = Rp 5,729,876/month** ÷ 173 statutory monthly hours
(Kepmenaker No. 102/MEN/VI/2004) ≈ **Rp 33,121/hour**, scaled by the same
industry-relative multiplier already used for the USD table (so Tech still
costs proportionally more than e.g. Manufacturing). The small-team 0.5x
factor is applied at Rupiah scale (not on the tiny pseudo-USD figure) to
avoid a rounding-precision bug. Result for a small Tech team:
**~Rp 35,881/hour** (vs the old Rp 538,857/hour).

All currency-rate-invariance tests (IDR/EUR/SGD) still pass — the fix only
changes *which* rate feeds the existing USD-internal pipeline, not the
architecture itself.

**Note:** this only affects *new* diagnostics. Previously-saved reports
(including the one that triggered this investigation) keep their old
numbers unless regenerated.

---

## 4. Generate Blueprint taking 3-5 minutes (root cause: zeroclaw routing, not the LLM)

**Service:** `/home/ubuntu/AVRY/vps-bridge` (PM2 app `diag-worker`, **not a
git repo** — changes are applied directly on the VPS)
**File:** `lib/blueprintQueue.js`
**Backup of pre-fix version:** `lib/blueprintQueue.js.bak-pre-openrouter-bypass`
(same directory, on the VPS)

### Investigation

Two earlier fixes that day (`0bed051`, `824a371`, `f347789`) had
already moved blueprint generation from a single held HTTP request to an
async BullMQ job + poll, specifically because real generation legitimately
takes 1-5+ minutes and was being killed by Cloudflare's ~100-120s edge
timeout. That fix worked — generation started *succeeding* instead of
failing — but the user still measured **3:45** end-to-end and asked whether
the bottleneck was the LLM or zeroclaw.

Traced the call path: `lib/blueprintQueue.js` → **one** `fetch()` to
zeroclaw's `/webhook` → awaits the full response, no retries, no extra
bridge-side processing. Whatever time zeroclaw took to answer *is* the
3:45 — so the question became "why does zeroclaw take that long for a pure
text-generation task?"

Found the answer in zeroclaw's own config comment
(`~/.zeroclaw/config.toml` on the VPS):

> *"n8n toolset mirrored here because zeroclaw's `/webhook` ignores the
> request's `agent` field and executes **every** bridge/Copilot call under
> **THIS** profile (`agent_analyst_brain`) — proven via runtime trace."*

`agent_analyst_brain` is configured `agentic = true`, `max_tool_iterations
= 10`, `max_delegation_depth = 3`, with a ~50-tool list (n8n workflow
create/execute/validate, web search, shell, file I/O, etc.) — none of which
a "diagnostic JSON in, blueprint JSON out" text-generation task needs. Every
call still pays for the much larger tool-schema system prompt, plus any
unnecessary tool-consideration round-trips the model takes before settling
on a final answer. This is the **same known `/webhook` routing bug** noted
previously for the n8n workflow copilot (see
[[workflow-copilot-three-followups]] memory) — it turned out to also be
silently taxing blueprint generation.

Zeroclaw's `observability.runtime_trace_mode` is set to `"none"` on the VPS,
so there was no live per-call trace available to count exact tool
round-trips for this specific incident — the config comment (from an
earlier, separately-run trace) plus the architecture is the evidence; it
was not re-proven with a fresh trace on this exact request.

### Fix

`lib/diagnosticQueue.js` (used for the Deep Diagnostic run itself) was
*already* calling OpenRouter directly, bypassing zeroclaw entirely — which
is exactly why diagnostic generation was never slow. `lib/blueprintQueue.js`
was rewritten to follow the same pattern:

- Removed the `fetch(`${ZEROCLAW_URL}/webhook`, ...)` call and its SSE
  response parsing.
- Calls `https://openrouter.ai/api/v1/chat/completions` directly with
  `model: process.env.BLUEPRINT_MODEL || 'deepseek/deepseek-v4-flash-0731'`
  (same model zeroclaw's `builder_brain` persona used, so output
  quality/style is unchanged).
- The hand-written identity/security prefix (previously prepended to the
  user message as a workaround for zeroclaw's routing) is now sent as a
  proper `system` message.
- Timeout reduced from zeroclaw's 440s to **180s** (generous headroom now
  that the agentic tax is gone).
- `runBlueprintGeneration()` still returns the same `{ content: string }`
  shape — no change needed in the Next.js layer (`lib/blueprintGeneration.ts`)
  that parses/normalizes the blueprint JSON.

Deployed by copying the new file into place and `pm2 restart diag-worker`
on the VPS (no Docker rebuild needed — this process runs outside the
`avry-user-dashboard` container).

### Result

**Measured live by the user: 3:45 → 1:12** for a real blueprint generation
— a ~3x speedup, consistent with removing several unnecessary agentic
round-trips per request.

### Follow-up / not done here

- The same `/webhook` routing bug likely still affects the n8n workflow
  copilot and any other bridge feature that hasn't been moved to a direct
  OpenRouter call. Worth an audit of `server.js` for other `/webhook`
  call sites.
- `lib/blueprintQueue.js` is **untracked** on the VPS (no git repo at
  `/home/ubuntu/AVRY/vps-bridge`). If this ever needs to survive a VPS
  rebuild or be reviewed in a PR, it should be brought under version
  control — out of scope for this fix.
- Consider enabling `observability.runtime_trace_mode` temporarily if a
  future latency investigation needs a real per-call trace instead of
  inferring from config + architecture.

---

## 5. Generate Blueprint progress bar

**Files:** `app/diagnostics/deep/final-result/page.tsx`,
`app/diagnostics/deep/final-result/final-result.module.css`,
`services/deepDiagnostic.ts`
**Commit:** `d519cef`

Added a progress bar above the Generate Blueprint button: a time-based
percentage estimate (`estimateBlueprintProgress()`, eases toward 95% over
~75s, never claims 100% until the server actually confirms completion), an
elapsed mm:ss counter ticking every second, and a static "estimasi 1-2
menit" / "estimated 1-2 min" label. `generateBlueprint()` takes an optional
`onProgress` callback invoked on enqueue and every poll tick; the actual
poll loop (up to 480s) is unchanged and unaffected by the estimate.

---

## Deployment record

| Change | Where | How |
|---|---|---|
| Bugs 1-3 | `avry-user-dashboard` commit `66d38e7` | pushed to `Aivory-hub88/avry-user-dashboard` main → VPS `git merge --ff-only` → `docker compose up --build --no-deps -d avry-user-dashboard` |
| Progress bar | `avry-user-dashboard` commit `d519cef` | same deploy path as above |
| Blueprint routing bypass | `vps-bridge/lib/blueprintQueue.js` | file replaced directly on VPS (backup kept alongside) → `pm2 restart diag-worker` |

All dashboard-side changes verified with `npx vitest run` (28/28 passing)
and a scoped `tsc --noEmit` (no new errors) before deploy. The blueprint
routing fix was verified by live user test (3:45 → 1:12), not by an
automated test — `vps-bridge` has no test suite.
