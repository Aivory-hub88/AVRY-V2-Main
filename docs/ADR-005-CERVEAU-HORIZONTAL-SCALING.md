# ADR-005 — Aivory Cerveau: Horizontal Scaling (LB + Shared Rate Limiter + Backpressure)

**Date:** 2026-08-08
**Status:** §§3b/3c (shared rate limiter + admission queue) implemented as patch 0023 and live-verified on a real 2-instance prototype the same day — see [CERVEAU-STATUS.md](CERVEAU-STATUS.md) §5 item 3 for the full account. §3a (the actual Traefik LB) remains design-only, deliberately deferred — see that same account for why (touching the shared production Traefik was judged too risky for a prototype whose LB capability itself wasn't in question).
**Context:** Phase 5 item 21 ([CERVEAU-STATUS.md](CERVEAU-STATUS.md) §5). Pairs with [ADR-004](ADR-004-CERVEAU-MEMORY-LIFECYCLE.md) (memory lifecycle) and the Phase 5 load-test findings (§2b).

---

## 1. The problem this design closes

Phase 5's 2026-08-08 100-concurrency re-run (§5 item 19) established that `tencent-vps` (4 vCPU / 7.5 GB) saturates its CPU at **~80–90 concurrent requests** to a single `zeroclaw-cerveau` process, well short of the 1,000–10,000-tenant target, and that overload currently surfaces as a wave of undifferentiated HTTP 500s (Finding 4) rather than a controlled response. Chasing the raw concurrency number on one bigger disposable VPS was rejected (§5 item 21) — it's expensive, and a single box's ceiling isn't representative of how this will actually run in production. The decided direction: **horizontal scaling** — a load balancer in front of N `zeroclaw-cerveau` instances, plus graceful backpressure instead of outright failure under load.

That decision creates one concrete correctness problem that did not exist with a single instance: **patches 0021/0022's per-tenant and per-IP rate limiters are in-process state** (`GatewayRateLimiter`, `crates/zeroclaw-gateway/src/lib.rs:262-370` — a `Mutex<HashMap<String, Vec<Instant>>>` sliding window per limiter). Behind an LB, a tenant's requests land on different instances across calls; each instance's limiter only ever sees its own slice of that tenant's traffic. A tenant could trivially get `N×` its configured quota just by having its requests spread across `N` instances — the exact fairness guarantee patch 0021 was built to prove (§2b) silently stops holding the moment a second instance exists.

## 2. What's already on `tencent-vps` — reuse before building

Checked directly (not assumed) before designing anything new, per this project's own established discipline:

- **Traefik v2.11** (`avry-traefik` container) is already the front door for everything on this box — TLS via Cloudflare, dynamic file-provider config at `/home/ubuntu/AVRY-V2-Main/traefik/dynamic/*.yml`. It already carries an **`inFlightReq` middleware** for a different set of "expensive LLM routes" (`llm-inflight`, capped at 30 concurrent by `requestHost`, in `aivory-secure.yml`) — i.e. concurrency-capping via Traefik is an existing, proven pattern in this exact infra, not a new idea being introduced here.
- **Redis 7** (`redis:7-alpine`, `--requirepass` set, AOF persistence on, host-bound `127.0.0.1:6379`) is already running and already reachable from anything on the host, including a Rust binary run directly by systemd (same reachability `avry-postgres` has). Current footprint: 6 keys, 2.1 MB used, **`maxmemory=0` / `maxmemory-policy=noeviction`** — unbounded by config today. Low risk at this size, but worth tightening once a second real consumer (rate-limit keys) lands on it — flagged in §6, not blocking.
- **BullMQ is already live** on this Redis — `vps-bridge`'s `diag-worker` PM2 process (`worker.js`, running 10+ days) uses it for async Deep Diagnostic jobs (submit → background worker → result polled/pushed later). This is a real, working, Redis-backed queue pattern already validated in production — but it's Node-specific (BullMQ's protocol is a set of Lua scripts + a key schema with no Rust client) and shaped for **asynchronous job processing with a result fetched later**, not a synchronous request/response path. Cerveau's `/webhook` is synchronous today (the bridge/channel adapters expect an inline reply) — adopting BullMQ's submit-and-poll model for Cerveau's own request path would mean changing that contract on the Telegram/Slack/WhatsApp bridge side too, which is Phase 6 territory, not this design. Noted as a real future option (§6), not part of this proposal.

Net effect: **this design adds one new Rust dependency (a Redis client) and a handful of config knobs — no new infrastructure, no new services, nothing that wasn't already true of this box.**

## 3. Design

Three independent pieces, each solving a different one of the three problems named in item 21.

### 3a. Load balancer — Traefik, not a new component

A new Traefik dynamic-config file (e.g. `cerveau-lb.yml`, same directory as the existing ones) defining:
- an HTTP **service** `cerveau` with N backend servers (`http://127.0.0.1:3100`, `:3101`, `:3102`, ...), Traefik's built-in **health check** against each instance's existing `/health` endpoint (already implemented, already used in every deploy's post-cutover verification), so a crashed or restarting instance is automatically taken out of rotation without a manual step.
- default **weighted round-robin** load balancing (Traefik v2's only built-in strategy for the file provider — no least-connections available without a paid/plugin build; round-robin across equal-capacity replicas is the right default here and costs nothing extra to adopt).
- **kept internal, no public DNS/Cloudflare entry yet** — nothing external calls `:3100` today (side-by-side testing only, per the current status doc; real production traffic is still `telegram-agent.js`). This LB is groundwork for Phase 6's eventual bridge cutover, not a new public attack surface today.

### 3b. Shared rate limiting — move `GatewayRateLimiter`'s state to Redis, keep its logic

The nuanced part of patches 0021/0022 — the auth-then-bypass ordering (invalid secret and non-tenant traffic still bound by the per-IP bucket; bridge-authenticated tenant traffic bypasses it and is charged per-tenant instead), and the three regression tests proving that ordering — is **domain logic that stays exactly where it is**, in `handle_webhook` (`crates/zeroclaw-gateway/src/lib.rs:2755-2960`). Only the **storage** backing `SlidingWindowRateLimiter::allow()` needs to become shared. Concretely:

- Introduce a small `RateLimitBackend` trait with two implementations: `InProcessLimiter` (today's `Mutex<HashMap<...>>`, kept as the **default** — single-instance and dev/test deployments are unaffected) and a new `RedisLimiter`.
- `RedisLimiter::allow(key)` implements the same sliding-window semantics as an atomic Lua `EVAL` (`ZADD` the current timestamp, `ZREMRANGEBYSCORE` anything older than the window, `ZCARD` to check against the limit, `EXPIRE` the key to the window length) — one round-trip, atomic, and **self-cleaning via the `EXPIRE`** (so idle tenants' keys age out on their own; no separate sweep job needed, unlike the in-process version's manual `RATE_LIMITER_SWEEP_INTERVAL_SECS`).
- **Fails open, not closed:** if the Redis call errors (timeout, connection refused), log a `WARN` and fall back to allowing the request rather than blocking all traffic on a Redis blip — the same fail-open posture already chosen for the F-2 idempotency ledger ("Ledger I/O failure fails open... rather than blocking every tool call", §6) and worth being consistent with. A rate limiter that can take down the whole gateway on a dependency hiccup is worse than one that occasionally over-admits for a few seconds.
- New `GatewayConfig` fields (additive, all optional, default preserves current in-process behavior): `rate_limit_backend: "in_process" | "redis"` (default `in_process`), `redis_url: Option<String>` (libpq-style caveat doesn't apply here — Redis URLs are fine with `redis://:<password>@127.0.0.1:6379`, no `@`/`#`-in-password issue since the current Redis password doesn't contain those characters, but worth a config-time check regardless of which password ends up used), `redis_key_prefix` (default `cerveau:ratelimit:`, namespaced so this shares the instance cleanly with `vps-bridge`'s BullMQ keys without collision).
- New Cargo dependency on `zeroclaw-gateway` only — a lightweight async client (`redis` crate with `tokio-comp` + `connection-manager` features, which handles reconnection automatically) — no dependency-graph inversion needed here (unlike patch 0021's cost-tracker hook), since `GatewayRateLimiter` already lives directly in `zeroclaw-gateway`, which is free to add HTTP/TLS-tier dependencies already.

### 3c. Backpressure — two tiers, because CPU-bound overload needs both a hard ceiling and local smoothing

Finding 4's leading hypothesis is CPU starvation producing 500s. Two complementary changes, at two different layers, each addressing a different failure mode:

1. **Fleet-wide hard ceiling (Traefik `inFlightReq` on the new `cerveau` service)** — reuses the exact middleware already live for other LLM routes on this box. Sized to whatever the fleet's known-safe aggregate is (e.g. 2 instances × ~40 = 80, matching the empirically-found single-box ceiling — see §5, this does **not** multiply capacity, see §6). Requests over this ceiling get an immediate `429` from Traefik, before ever reaching an already-saturated instance and making its overload worse. Zero new code — config only.
2. **Per-instance bounded admission queue (new, inside `handle_webhook`)** — a `tokio::sync::Semaphore` sized to that instance's own safe concurrency (new config knob `max_concurrent_llm_requests`, default unset = today's unbounded behavior, so this is opt-in), acquired right before the tenant-resolution/LLM-call path and released on completion. A request that can't get a permit immediately **waits**, bounded by a new `admission_queue_timeout_secs` (proposed default 10–15s) — this is the actual "queue" item 21 asked for, and it's what turns a momentary burst (a slot frees up half a second later) into a slightly-slower success instead of an outright rejection. If the timeout elapses with no permit, return a clean **`503` with `Retry-After`** — not today's undifferentiated `500` — so the caller (eventually the bridge, once Phase 6 wires this in) has a well-defined, retryable signal instead of an opaque failure.

Why both, not just one: a queue alone (no fleet ceiling) risks an unbounded pile-up of waiting requests during sustained (not momentary) overload, each holding a connection and consuming memory while it waits for a slot that isn't coming back soon — turning overload into a slow-motion resource exhaustion instead of a fast, clean failure. A ceiling alone (no queue) rejects requests that would have succeeded a moment later, which is unnecessarily lossy for brief bursts. Together: brief bursts get smoothed by the local queue; sustained overload gets shed fast and cleanly at the Traefik boundary before it can compound.

## 4. Config schema changes (summary)

| Field | Default | Purpose |
|---|---|---|
| `[gateway].rate_limit_backend` | `"in_process"` | Opt-in to Redis-backed shared limiter |
| `[gateway].redis_url` | `None` | Required when `rate_limit_backend = "redis"` |
| `[gateway].redis_key_prefix` | `"cerveau:ratelimit:"` | Namespacing on a shared Redis instance |
| `[gateway].max_concurrent_llm_requests` | `None` (unbounded, current behavior) | Per-instance admission-queue capacity |
| `[gateway].admission_queue_timeout_secs` | `15` | Max wait for a permit before `503` |

All additive, all defaulting to today's exact behavior — no existing single-instance deployment (vanilla `:3010`, or Cerveau `:3100` before this is opted into) changes until these are explicitly set, consistent with every prior patch in this series.

## 5. Prototype plan on the existing `tencent-vps` (no new infra spend — item 21/22's item 3)

Deliberately modest in instance count, because this box's total capacity doesn't grow just by running more processes on it (§6) — the goal here is proving the **mechanism**, not raw throughput:

1. Run a **second** `zeroclaw-cerveau` process on `:3101`, same binary, its own systemd unit + `LimitNOFILE=65536` drop-in (the Phase 5 item-19 fix, applied from day one this time), pointed at the same `avry-postgres`/`cerveau` schema (already safely multi-instance — every write is tenant-scoped and idempotent-ledgered, nothing assumes a single writer) and the same Redis.
2. Add the Traefik `cerveau-lb.yml` dynamic config (§3a) fronting `:3100` + `:3101`, internal-only.
3. Flip `rate_limit_backend = "redis"` on both instances' configs.
4. Set `max_concurrent_llm_requests` on both to roughly half the box's known ~80-90 ceiling (e.g. 40 each), so the two-instance fleet's aggregate stays within what this box has always safely handled — this run is validating correctness, not attempting to beat the CPU ceiling.
5. **Validation, reusing the existing `loadgen.js`/`loadtest-guardrail.sh` harness** (already built for Phase 5, still on disk) pointed at the Traefik address instead of one instance directly:
   - Confirm round-robin actually distributes requests across both PIDs (visible in each instance's own request-count logs).
   - **The one property that could not be tested before there was a second instance:** send a single tenant's burst large enough to exceed its per-minute cap, load-balanced across both instances — confirm it's blocked at the *aggregate* cap (proving the Redis-backed limiter is genuinely shared), not at `2×` the cap (which is what the old in-process limiter would silently do).
   - Confirm a non-tenant / invalid-secret burst is still correctly bound by the per-IP path, unaffected by the switch (regression, mirroring patch 0022's own verification style).
   - Drive load past the fleet's `inFlightReq` ceiling deliberately and confirm the response is a clean `429`/`503`, never a bare `500` — directly re-testing Finding 4's failure mode.
6. Full teardown afterward (extra systemd unit, Traefik dynamic file, and Redis rate-limit keys — the `EXPIRE`-based design means these should already be gone on their own, but confirm via `redis-cli KEYS 'cerveau:ratelimit:*'` before declaring done), same discipline as every prior load-test cleanup in this project.

## 6. What this does **not** solve (honest scope limits)

- **Does not increase this box's total capacity.** `tencent-vps` is still 4 vCPU / 7.5 GB; running N Cerveau processes on it divides that ceiling, it doesn't multiply it. This design proves the LB/shared-limiter/backpressure *mechanism* works — the actual 1,000–10,000-concurrent validation still needs genuinely more/bigger compute, which needs an explicit budget decision with the user first (unchanged from the existing item 4 in the task list).
- **Does not adopt BullMQ / async job-queue semantics for Cerveau's own request path.** That would be a larger, real future option (§2) — it would need the bridge and every channel adapter to change from "call and wait for a reply" to "submit and poll/callback," which is Phase 6 (or later) scope, not this design.
- **Does not harden Redis's `maxmemory`/eviction policy.** Currently `0`/`noeviction` — fine at today's 2.1 MB, but adding a second real key space (rate-limit keys, self-expiring) to a shared, unbounded-by-config instance is worth a small separate follow-up (`maxmemory` cap + `volatile-ttl` or `allkeys-lru` eviction) before this is relied on for anything load-bearing. Not blocking this design (the new keys are small and self-expiring), but flagged rather than silently left alone.
- **Does not change anything about `zeroclaw.service` (:3010, vanilla)** or any other deployment — everything here is additive and opt-in per §4.

## 7. Definition of done for the prototype phase

- Two-instance fleet behind Traefik, health-checked, round-robin confirmed via logs.
- Redis-backed rate limiter live-verified to cap a single tenant's *aggregate* rate across both instances (the property that is structurally impossible to prove with only one instance) — this is the one genuinely new correctness property this whole ADR exists to deliver.
- A deliberately-overloaded run produces `429`/`503` responses, not `500`s.
- Full teardown verified (systemd units, Traefik config, Redis keys) — production `cerveau` schema and `:3100`'s existing behavior confirmed unaffected throughout, same rigor as every prior deploy in this series.
- **Explicitly out of scope for "done" here:** any claim about the 1,000–10,000-concurrent target — that remains gated on the infra/budget decision in item 4, unchanged by this ADR.
