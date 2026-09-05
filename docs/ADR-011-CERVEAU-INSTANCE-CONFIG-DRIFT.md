# ADR-011 — Closing the config drift between the two Cerveau instances

**Status:** ✅ Resolved and verified, 2026-09-04
**Date:** 2026-09-04

**Context:** Cerveau runs two daemons behind one HAProxy front (`zeroclaw-cerveau` on `:3100` reading `~/.zeroclaw-cerveau`, `zeroclaw-cerveau-b` on `:3101` reading `~/.zeroclaw-cerveau-b`, front on `:3105`). They serve the same traffic, so any config difference makes behaviour depend on which instance happens to answer a request — the hardest class of bug to reproduce and the easiest to disbelieve. A raw `diff` of the two files had previously suggested ~72 differing lines; almost all of that was line ordering and legitimately per-instance paths.

---

## 1. Method: compare resolved values, not file text

`zeroclaw config list --config-dir …` on both, then compare **key by key**, parsing `Vec<String>` values and comparing them as sets rather than strings. Ordering differences in an allow-list are not drift; membership differences are.

That reduced 2,181 resolved keys to **six real differences** (plus five per-instance `obscura`/`pdf-oxide` paths, which *must* differ).

## 2. The six, and why each resolved the way it did

| # | Key | A | B | Resolution |
|---|---|---|---|---|
| 1 | `browser.enabled` | `false` | `true` | → **`false`** |
| 2 | `capability_graph.enabled` | `true` | *(section absent)* | → **`true`** |
| 3 | `runtime_profiles.agent_analyst_brain.parallel_tools` | `true` | unset | → **`true`** |
| 4 | `risk_profiles.default.auto_approve` | has `delegate` | missing | → **add** |
| 5 | `risk_profiles.agent_analyst_brain.auto_approve` | has `enrich_lead_contact`, `pdfoxide_fill_form` | missing both | → **add** |
| 6 | `tool_risk_tiers.reversible` | has `enrich_lead_contact` | missing | → **add** |

Four of the six (#3–#6) share one shape: an edit landed on A and was never mirrored to B. Those are unambiguous — B had simply fallen behind.

The two that pointed in *opposite* directions (#1, #2) needed an actual decision, not a merge:

- **`browser.enabled`** gates exactly one tool. Its description in `agent/loop_.rs`: *"Open approved HTTPS URLs in **system browser** (allowlist-only, no scraping)"*. There is no system browser on a headless VPS — instance B was advertising a tool that cannot do anything. Real browsing goes through the `lightpanda`/`obscura` MCP servers, which this flag does not touch. **A was right.**
- **`capability_graph.enabled`** is Aivory's own Phase 4.2 feature: it learns, per tenant, which deferred MCP tools get activated together and re-ranks future `tool_search` results. Its own module doc is explicit that every method is **fail-open** and that `rerank` *"returns the same set of names, reordered — never adds, removes, or deduplicates"* — it cannot grant or hide a tool, only order them. Half-enabled was the worst of the three possible states: it learned from only half the traffic and applied inconsistently. **A was right.**

Everything therefore aligned to A. `delegate` in #4 matters most in practice: without it, any agent falling back to the `default` risk profile on instance B could not delegate at all — the same fail-closed silent denial ADR-008 §4 documents.

## 3. Applying it

A single script with an assertion per edit, dry-run first against a copy. Two assertions earned their keep: one caught an anchor that matched six lines instead of one (`auto_approve` starts identically in every agent profile — the fix was to scope the match to a `[section]`), and the TOML parse check caught a double comma from appending to a list whose last entry already had a trailing one. Backups taken first (`config.toml.bak-pre-drift-align-20260904`).

## 4. Verified

Re-ran the same semantic comparison after restarting B:

```
REAL DRIFT: none — instances are semantically identical
~ risk_profiles.agent_analyst_brain.auto_approve: same members, different order (harmless)
~ risk_profiles.default.auto_approve: same members, different order (harmless)
~ tool_risk_tiers.reversible: same members, different order (harmless)
```

All three health endpoints (`:3100`, `:3101`, `:3105`) report `ok`; no journal warnings.

## 5. Note on `enrich_lead_contact`

The Lead Enrichment add-on is **on hold** — the backend is built but no provider API keys are configured, so the tool costs nothing and does nothing today. Aligning B to A does not activate it; it only ensures that if it is ever switched on, both instances behave the same. Nothing here should be read as resuming that feature.

## 6. Guarding against recurrence — done

Five of the six differences arose the same way: an edit applied to one instance and not the other. Nothing prevented that, so the same comparison used above now runs on a schedule.

`scripts/cerveau-config-drift-check.py` (deployed to `/usr/local/bin/`, driven by `cerveau-config-drift.timer` hourly, matching the existing `cerveau-health-check` pattern) runs the same method: resolved values from `config list`, `Vec<String>` compared as sets, the per-instance `obscura`/`pdf-oxide` paths excluded by an explicit allow-list. Quiet on success (one journal line), exit 1 with the offending keys on stderr when it finds drift, exit 2 if the check itself cannot run.

**Proven to fail, not just to pass.** A checker only ever seen returning green is not yet known to work, so both code paths were exercised against a deliberately drifted copy: a scalar difference (`browser.enabled: A=false | B=true`) and a list-membership one (`risk_profiles.agent_analyst_brain.auto_approve: only on A: [enrich_lead_contact]`). Both were caught, both exited 1. Production run afterwards: `drift: none (1807 keys compared)`.

**One thing the test surfaced, worth recording** because it looks like a bug and is not: instance B's *file* is missing `tool_search` from `risk_profiles.default.auto_approve`, which A's file has — but the checker stays green, correctly. The runtime appends `tool_search` when absent (the deferred-MCP mechanism needs it), so the two *resolved* values hold the same members and differ only in order. Comparing file text would have raised a false alarm here; comparing resolved values does not. That is the whole reason for the method.

## 7. One difference between the instances is deliberate — do not harmonise it

`AVRY_TENANT_SCHEDULE_SYNC=1` is set on **instance A only**, via `/etc/systemd/system/zeroclaw-cerveau.service.d/tenant-schedule-sync.conf`. Instance B must stay unset.

This is not drift. Both instances read the same avry-backend but keep separate cron stores, so a tenant schedule reconciled on both would fire — and bill — twice per period, with nothing in either instance able to notice (ADR-009 §11). Ownership has to be declared somewhere, and the systemd unit is where.

The hourly checker does not see this, and should not: it compares resolved Cerveau `config list` values, not process environment. The note exists so nobody "fixes" the asymmetry by hand later. If the pool ever grows past two, replace the manual flag with a backend-side lease rather than adding a second owner.

## 8. Event history was seven hours deep and had no archive — fixed 2026-09-05

Found while trying to confirm a log line from ADR-009 §14. The line was there; what was not there was any way to look further back than the same afternoon.

`log_persistence` was at its default, `rolling`, which keeps the newest `log_persistence_max_entries` (200) in the active file and **discards everything older permanently** — no archive, nothing to recover. Measured on the day: 200 entries spanned about seven hours on instance A and six on B, on a quiet day with almost no tenant traffic. Under the load that actually produces incidents that window collapses, and the `approval_resume` billing leak found the same day is the shape of the problem — a fail-open path that had been silently wrong for weeks with nothing to read back.

Both instances now use the `rotating` mode the runtime already supports, which the default never enabled:

```toml
[observability]
backend = "prometheus"
log_persistence = "rotating"
log_persistence_max_bytes = 33554432        # 32 MiB
log_persistence_rotate_daily = true
log_persistence_retention_max_files = 14
```

**Why these numbers.** At the observed ~509 bytes/event, 32 MiB is roughly 66k events — enough that a traffic spike rotates rather than producing one unreadable file, while an ordinary day rotates on the daily boundary instead. Fourteen files is a fortnight of history; at current volume that is single-digit megabytes, and even at a hundred times the traffic the size trigger bounds the worst case near 450 MB against 60 GB free. `retention_max_age_days` is left at `0` deliberately — the file count already bounds growth, and two overlapping retention caps are harder to reason about than one.

**`backend = "prometheus"` is a separate axis, not a side effect.** It selects the *metrics* sink, and `/metrics` was until now answering every request with *"Prometheus backend not enabled"*. The feature is compiled into the production binary (`observability-prometheus` is in the dist feature set), so this is a real exporter rather than the silent noop fallback the code falls back to on a build without it. Nothing scrapes it yet; the value today is that it can be read during an incident instead of returning a apology. Crucially it does **not** touch the JSONL: that is written by the separate `zeroclaw-log` crate, so the two settings cannot switch each other off — checked in the source before changing either.

**Verified:** identical one-hunk diffs on both configs (backups taken first), both restarted healthy on `:3100`/`:3101`/`:3105`, resolved `config list` values identical across the two, `/metrics` now returning real counters (2824 bytes vs 88), the trace file past the old 200-line ceiling, and the hourly drift checker green — *drift: none (1807 keys compared)*.

The edit script was scoped to the `[observability]` section and refuses to run if that section holds a key it does not recognise. `backend =` is an unremarkable string in a config with hundreds of sections, and an unanchored match is how you rewrite six risk profiles by accident — which had already happened once earlier in the same session.
