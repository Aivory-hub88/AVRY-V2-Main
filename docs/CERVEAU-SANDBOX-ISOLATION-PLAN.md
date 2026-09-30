# Cerveau Local Tool-Exec Isolation — Planning & Scope

**Status:** Landlock/sandboxing questions still open (see below). The `lightpanda` dead-reference finding is **closed**: `mcp_bundles.lightpanda-browsing.servers` fixed from `["lightpanda", "obscura"]` to `["obscura"]` on `tencent-vps` instance A (`~/.zeroclaw-cerveau/config.toml`, backed up first) and in the tracked `ops/cerveau-config/config.redacted.toml`, `zeroclaw-cerveau.service` restarted 2026-09-16 06:55 CST to apply, health-checked OK post-restart. Instance B was not touched — it's intentionally decommissioned (single-instance is sufficient; see memory `cerveau-dual-instance-abandoned`), not a live target.
**Created:** 2026-09-16
**Related:** `CERVEAU-TOOLKIT-EXPANSION-PLAN.md` (flagged the Landlock exec bug this plan responds to), `CERVEAU-TECHNICAL-REFERENCE.md` §5.3 (Obscura/Lightpanda risk-tier table), `ADR-002-CERVEAU-TENANT-DESIGN.md`

## Trigger

User asked to look at VM-style isolation for Cerveau agent tool execution (prompted by a GitHub repo, OpenMausBot, which turned out on inspection to be a Composio-based harness with no Rust/VM component — not actually relevant as prior art). That led to researching Firecracker/gVisor/WASM as isolation options in general, then narrowing to what Cerveau's *actual* local-exec surface is before proposing anything.

## What actually executes locally today (verified, not assumed)

Cerveau's Rust daemon spawns exactly four MCP tools as **bare stdio subprocesses directly on the VPS host** — no container boundary at all:

| Tool | Binary path (tencent-vps) | What it does |
|---|---|---|
| `officecli` | `.../mcp-tools/officecli/node_modules/.bin/officecli` | Office document manipulation |
| `lightpanda` | (headless browser, read-only) | 22 read-only browsing tools, no click/fill/submit |
| `obscura` | `.../mcp-tools/obscura/obscura` | Stealth browser — **includes `browser_evaluate` (arbitrary JS) and interactive tools (click/fill/type/press_key/select_option/fill_form)** |
| `pdf-oxide` | `.../mcp-tools/pdf-oxide/pdf-oxide-mcp-shim` | PDF read/create/fill/edit |

Everything else in Cerveau's toolkit (all Composio integrations, the native bridge on `127.0.0.1:4100`, n8n flows) is **HTTP-transport, not local spawn** — those run on Composio's/n8n's own infrastructure, not as processes on the Cerveau host. They're out of scope for process-level isolation; their risk is network/SSRF-boundary risk, already handled by `guarded_fetch`'s DNS-pinning and the `--block-private-networks` flags.

**So the entire local-exec attack surface is those 4 subprocesses**, and within them, the two that actually consume untrusted external content are:
- **Obscura**, parsing/rendering attacker-controlled web pages and evaluating arbitrary JS from them (prompt-injection-via-webpage is a live threat model here)
- **pdf-oxide**, parsing attacker-supplied PDFs (PDF parsers are a classic memory-safety attack surface)

## Isolation that's already designed in, and currently broken

Per `CERVEAU-TOOLKIT-EXPANSION-PLAN.md`'s incidental finding (2026-08-23, still open): these are meant to be **Landlock-sandboxed** (Linux kernel LSM, filesystem-access confinement, zero container/VM overhead — this is the "ringan" mechanism, consistent with how the rest of Cerveau is built). But `officecli`/`lightpanda`/`pdf-oxide` currently fail to exec with `Permission denied (os error 13)`, on both instances. Obscura was added 2026-09-02 partly as a working fallback for the browsing use case, but that sidesteps the bug rather than fixing it — and pdf-oxide's exec failure is still completely unmitigated.

**This is the actual highest-priority isolation gap right now**: not "we have no sandboxing," but "the sandboxing we already built and intended to run is silently broken and nothing alerts on it." Any new isolation layer (gVisor, Firecracker) would sit *on top of* this same broken foundation unless it's fixed first.

## Why Firecracker and WASM don't fit this scope

- **Firecracker**: checked directly on `tencent-vps` (129.226.155.216) — `systemd-detect-virt` reports `kvm` (the VPS is itself a KVM guest), no `vmx`/`svm` in `/proc/cpuinfo`, no `/dev/kvm`. Tencent Cloud does not expose nested virtualization to this instance class. Firecracker cannot run here without moving to a bare-metal/nested-virt-capable instance — an infra/cost decision, not a config change. **Ruled out unless that decision is made separately.**
- **WASM** (Wasmtime etc.): too narrow a syscall surface for what these 4 tools actually need to do (spawn a real browser engine, do real filesystem I/O for PDFs). Fits a *future* narrower case — e.g. sandboxing a specific skill/plugin script — not these tools as they exist.

## Real options for this scope

1. **Fix the Landlock permission bug first.** Lowest cost, matches the existing design intent, restores the isolation Cerveau was already supposed to have. Blocking question: root-cause unknown — need to check whether it's a Landlock ABI/kernel-version mismatch, a binary capability/xattr issue, or a Landlock ruleset bug in the spawn code, on the real VPS before guessing a fix.
2. **gVisor, but only after containerizing these 4 subprocesses.** `runsc` is confirmed installable on `tencent-vps` (Ubuntu 24.04.4, kernel 6.8, Docker 29.1.3, containerd 2.2.1, cgroup v2 — all compatible) as a Docker runtime. But today's daemon spawns these as bare child processes, not via Docker — so adopting gVisor means changing the spawn path to `docker run --runtime=runsc ...` per subprocess (or a long-lived containerized MCP server the daemon talks to over stdio/socket instead of a direct child process). That's a real architecture change to the daemon's tool-spawn code, not a one-line config flip. Worth doing for **Obscura and pdf-oxide specifically** (the two that touch untrusted external content) if Landlock alone isn't judged sufficient once it's working again.
3. **Do both, staged**: fix Landlock now (cheap, closes an existing known gap), evaluate gVisor containerization for Obscura/pdf-oxide as a follow-on hardening pass once Landlock is confirmed working and the marginal risk is reassessed.

## What's explicitly out of scope

- Composio toolkits, native bridge, n8n flows — no local spawn, not this plan's concern.
- `officecli`/`lightpanda` read-only tools — lower risk than Obscura's interactive/eval tools and pdf-oxide; not a first-wave target for containerization even if option 2 is pursued.
- Any tenant-submitted arbitrary code execution feature — doesn't exist in Cerveau today; if it's ever built, that's the case WASM or full Firecracker multi-tenancy would actually earn its keep, and should get its own plan.

## Live investigation on tencent-vps, 2026-09-16 — the Landlock bug did not reproduce

Checked directly on the real host before proposing any fix:

- Kernel: `CONFIG_SECURITY_LANDLOCK=y`, `landlock` present and active in the LSM stack (`lockdown,capability,landlock,yama,apparmor`). Landlock is genuinely available.
- Config: `officecli`, `obscura`, `pdf-oxide` all have a correct `tenant_workspace_root` in the live `config.toml`. Their tenant-workspace directories exist on disk with normal ownership/permissions — including a literal `tenant-workspaces/landlock-verify-tmp-001/{browsing,office-assistant,pdf-toolkit}` tree dated **Aug 23 15:35**, matching the day the original bug was found, so this exact path was already being exercised then.
- **Manual repro attempt failed to reproduce the bug.** Ran the daemon's own internal mechanism directly — `zeroclaw-cerveau internal-landlock-exec --workspace <dir> -- officecli mcp`, exactly mirroring how `LandlockSandbox::wrap_command` invokes it — and it exited cleanly (0), same as an unsandboxed direct exec. No `Permission denied`.
- `journalctl -u zeroclaw-cerveau.service` (retained back to Sep 4 only — earlier logs rotated out, so the original Aug 23 error itself is gone from logs) has **zero** lines mentioning Landlock, sandbox, or Permission denied, in either direction (success or failure).

**Read on this: the Aug 23 bug most likely no longer reproduces as originally reported** — possibly fixed incidentally by a later daemon or Obscura binary redeploy (Obscura's binary is dated Sep 5) — but this can't be called fully closed from outside the running system; my manual repro may not perfectly match a real agent-turn's spawn conditions (env, cwd, concurrency). Confirming it needs a live trigger through an actual agent turn, not a manual CLI repro.

**Separate, newly-found, currently-real gap**: `lightpanda` is referenced in the `lightpanda-browsing` MCP bundle (used by nearly every agent type) but has **no `[[mcp.servers]] name = "lightpanda"` block anywhere in the live `config.toml`**. The server is unroutable as configured. This may be the actual reason Obscura became load-bearing as "the working fallback" — not necessarily an exec-permission fault, but a missing server definition for lightpanda specifically. `officecli` and `pdf-oxide` do have valid definitions and didn't reproduce a fault manually.

## Live-trigger confirmation, 2026-09-16 — real production trace, not a synthetic test

Rather than burn an LLM turn to force a fresh tool call, pulled the daemon's own recorded history via `zeroclaw-cerveau --config-dir /home/ubuntu/.zeroclaw-cerveau doctor traces --contains <tool>` — this reads `data/state/runtime-trace.jsonl`, which already logs every real MCP server connect/tool-call from actual agent turns. Cheaper and more conclusive than a manual repro:

- **`officecli`**: connects successfully, repeatedly, throughout 2026-09-15 real traffic (1 tool available each time). **Bug confirmed closed** — not just via manual repro, via real production usage.
- **`pdf-oxide`**: connects successfully, repeatedly (4 tools each time), with `tool_call_result: ok` entries — actually invoked and succeeding on real turns.
- **`obscura`**: connects successfully, repeatedly (23 tools each time).
- **`lightpanda`**: **zero occurrences anywhere in the trace log.** Not a failed-connect entry — no attempt at all. Confirms the missing `[[mcp.servers]]` block isn't causing a loud failure, it's causing the bundle resolver to silently skip lightpanda entirely. Every agent type whose bundle lists `lightpanda-browsing` has, in practice, only ever gotten Obscura.

**Net conclusion**: the original "officecli/lightpanda/pdf-oxide fail to exec" finding from Aug 23 was accurate at the time but is now stale for two of the three tools — only the `lightpanda` piece is still a real, live, currently-reproducing gap, and it's a missing-config issue, not a Landlock/permissions issue. Practical impact is low (Obscura already covers every real request), but `lightpanda-browsing` as a bundle name is misleading — it delivers Obscura only.

## Open questions for the user

1. **`lightpanda` dead reference** — confirmed via real trace history (see above), not just config inspection. Fix by either adding the proper `[[mcp.servers]]` block for it, or (since Obscura already covers 100% of real browsing traffic) formally dropping `lightpanda` from every bundle and renaming `lightpanda-browsing` → something accurate, instead of leaving a misleading dangling reference?
2. Landlock is confirmed working for `officecli`/`pdf-oxide`/`obscura` in real production traffic now — still want gVisor containerization scoped for Obscura + pdf-oxide as a defense-in-depth follow-on, or is working Landlock judged sufficient for now?
3. Alerting gap: the Aug 23 bug sat unnoticed until a control test surfaced it, and journal retention is only ~12 days (would already have lost this trip's evidence in a few more days — the trace-log approach used here doesn't have that problem since it's a persistent file, but nothing currently alerts on either source). Worth a health-check that pages on a tool that should connect but doesn't (would have caught `lightpanda` immediately), and/or longer journal retention for this service?
