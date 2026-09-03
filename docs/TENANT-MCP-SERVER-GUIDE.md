# Building a Tenant Custom MCP Server — Reference Guide

**Status:** Reference material, not a decision record. Supports [ADR-006](ADR-006-CERVEAU-CLIENT-DEPLOYMENT-API.md) Part B (environment adaptation via tenant-registered MCP servers). Research compiled 2026-08-15 while Part B's B5 deploy was in flight; the Cloudflare Workers `*.workers.dev` bot-protection gotcha in §2 was then independently confirmed live the same day, during B5's own verification against production — not theoretical.

**Who this is for:** anyone building the "thin shim" MCP server ADR-006 §B1 describes — an Enterprise tenant wiring their own systems into their Cerveau agent, or Aivory building a starter kit/template to hand tenants. Not implementation detail for Cerveau or avry-backend themselves (see ADR-006 and `CERVEAU-STATUS.md` for that).

**Why this exists:** an Aivory Cerveau agent only knows what Aivory curated for it by default. A tenant custom MCP server is what lets an agent read and act on *that specific business's* own systems — their inventory, their ticketing tool, their ERP — instead of staying limited to Aivory's own toolkit. The four qualities below (stateless, lightweight, easy to deploy, smart/token-efficient) are what make that shim practical to actually build and run, not just theoretically possible.

---

## 1. Stateless — and this is now the protocol's own default, not just a design choice

The MCP specification itself went stateless in the **2026-07-28** revision: the `initialize`/`initialized` handshake and `Mcp-Session-Id` were removed from the protocol core. Every request now carries its own protocol version and client info in a `_meta` parameter — no one-time handshake, no session to keep alive.

**Why this matters for a tenant shim:** without session state, any instance of the tenant's MCP server can answer any request — no sticky sessions, no shared session store, trivial horizontal scaling (or none needed at all if the shim is genuinely tiny). A remote MCP server under this spec is architecturally just a plain HTTPS endpoint.

**Backward compatibility is handled in the SDKs, not something a shim author needs to think about**: a new client falls back to the legacy `initialize` handshake automatically when it talks to an older server. Cerveau's own registration-time verification (`avry-backend`'s `tenant_mcp_servers.py`) still sends `initialize` before `tools/list` for exactly this reason — it costs nothing extra against a stateless-native server, and it's what makes older servers work too.

**Practical takeaway:** build the shim stateless from day one — no in-memory session, no per-connection state. If the underlying system needs a connection/session of its own (e.g. a database pool), keep that scoped per-request or in a short-lived pool, never tied to the MCP transport layer's own lifecycle.

---

## 2. Lightweight & resource-efficient — the runtime choice matters more than almost anything else

Real benchmark numbers for Streamable HTTP MCP servers, memory at idle:

| Language | Idle memory |
|---|---|
| Rust | ~7 MB |
| Go | ~18 MB |
| TypeScript (Node) | ~162 MB |
| Java | ~220 MB |
| C# (default GC) | up to ~2.1 GB |

Latency: Streamable HTTP sustains ~10ms/call even under load (shared-session deployments hit 290-300 RPS at 100% success in one benchmark). For a purely local, single-user integration `stdio` avoids the network stack entirely and is lighter still — but that model doesn't fit a tenant shim Cerveau connects to remotely, so it's not the relevant comparison here.

**Deployment platform matters as much as language.** Cloudflare Workers run on V8 isolates, not containers — near-zero cold start (milliseconds, vs. seconds-to-tens-of-seconds for container-based AWS Lambda/Vercel Functions) and near-zero idle cost, since nothing runs between requests at all. Cloudflare's Agents SDK added `createMcpHandler` (Nov 2025) specifically for MCP servers that only need tools/prompts/resources — exactly the shape of a tenant shim.

**Confirmed gotcha, found live during ADR-006 Part B's own B5 verification (2026-08-15), not theoretical:** a plain `*.workers.dev` preview subdomain has Cloudflare's own bot-fight/managed-challenge protection on by default, and it will **block server-to-server MCP traffic from any cloud/datacenter-origin IP** (confirmed against a real Tencent Cloud VPS — response carried `cf-mitigated: challenge` and an interactive JS challenge page, not a plain 403). This isn't specific to Cerveau's guarded fetcher or any particular HTTP client — the challenge requires executing JavaScript in a browser, so **no automated client can pass it**, full stop. Since Cerveau itself always calls from Aivory's own VPS (a datacenter IP by definition), a tenant shim left on a bare `*.workers.dev` subdomain will never be reachable by a real Cerveau tool call, even though it verifies and works fine when tested from a residential/office IP. **Fix: put the Worker behind a custom domain on your own Cloudflare zone** (custom domains don't carry the same default preview-subdomain bot protection) rather than the free `*.workers.dev` URL, or explicitly lower the zone's Security Level / add a WAF skip rule for the MCP endpoint's path if a custom domain isn't available yet.

**Practical takeaway:** for a tenant whose underlying system is a database or internal API rather than something that needs a long-lived process, prefer Rust or Go for a self-hosted shim, or skip choosing a language entirely and deploy on Cloudflare Workers (or an equivalent V8-isolate/edge-function platform) where the runtime cost approaches zero between calls — but put it behind a real custom domain, not a bare `*.workers.dev` URL, or Cerveau's own calls will be silently challenge-blocked.

---

## 3. Easy to deploy — generate the shim from what the tenant already has, don't hand-write it

Most real REST APIs already have (or can trivially get) an OpenAPI spec. Multiple tools now convert an OpenAPI document straight into a working MCP server:

- **FastMCP** (Python) — the de-facto community standard (~70% of MCP servers reportedly built on some version of it); `FastMCP.from_openapi()` converts an OpenAPI spec into MCP tools directly.
- **openapi-mcp-generator** — open-source CLI, generates a standalone TypeScript MCP server from an OpenAPI document.
- **Gram** — managed platform, instant hosting from an OpenAPI spec, no infra to run at all.

**Recommended pattern: auto-generate, then curate.** Generate the initial tool set from the OpenAPI spec, then trim it down to only what the agent should actually call, and rewrite tool `description`s to be genuinely useful for an LLM (auto-generated descriptions from OpenAPI `summary`/`description` fields are often too terse or too technical for an LLM to pick the right tool reliably). This matters doubly here: per ADR-006 §B5, every tool from a tenant custom server is tagged `Irreversible` and its description is untrusted, LLM-visible text — a clear, accurate description isn't just UX polish, it's what keeps the agent from misusing a tool it can't fully understand.

**Practical takeaway:** the fastest path for most tenants isn't "write an MCP server" — it's "point FastMCP (or equivalent) at your existing OpenAPI spec, curate the output for 30 minutes, deploy the result." A written-from-scratch MCP server should be the exception, reserved for systems with no OpenAPI spec at all.

---

## 4. Smart & token-efficient — Cerveau already does the hard part of this

The core problem: tool definitions eat context. ~50 tools ≈ 10-20K tokens, and an LLM's ability to pick the right tool degrades noticeably past 30-50 tools in its visible list. A naive MCP integration with hundreds of tools can burn hundreds of thousands of tokens before the model ever sees the user's actual question.

**Deferred/progressive tool loading** fixes this: list only tool *names* upfront, fetch full schemas on demand when the model actually wants to use one. Reported reduction: ~96% fewer input tokens on average. **Semantic search** (search tools by natural-language intent rather than browsing a flat list) does even better — reported ~1,300 tokens flat regardless of whether the toolset has 40 or 400 tools.

**This is not a future improvement for Aivory — Cerveau already ships it.** `[mcp].deferred_loading` (`crates/zeroclaw-config/src/schema.rs`) is exactly this pattern: when enabled, only tool names go into the system prompt and the LLM calls `tool_search` to fetch full schemas for whichever deferred tool it actually needs. A tenant custom MCP server's tools flow through the same mechanism automatically — nothing extra to build on the shim side for this to work.

**One newer protocol feature worth tracking:** `tools/list` responses can now carry `ttlMs`/`cacheScope` (SEP-2549) — the server tells the client how long a result is safe to cache, instead of the client guessing. A shim that sets sensible TTLs on relatively-static tool lists reduces repeat-fetch traffic without Cerveau needing any tenant-specific tuning.

**Practical takeaway for shim authors:** don't try to build your own tool-search/pagination layer — that's the client's (Cerveau's) job, and it's already handled. Focus the shim's own effort on: keeping each tool's `description` short, specific, and accurate (this is what deferred loading and semantic search both search over), and setting a reasonable `ttlMs` on `tools/list` if the underlying framework supports it.

---

## Summary recommendation

For a tenant building their own MCP shim to register with Cerveau (ADR-006 Part B):

1. **Transport:** Streamable HTTP (`transport: "streamable-http"` in the registration form) — Cerveau connects from outside the tenant's process, so `stdio`/local-only transports don't apply.
2. **Statelessness:** build it stateless from the start; the current MCP spec expects this natively, and it's what keeps a shim trivially scalable (or removes the need to think about scaling at all).
3. **Fastest path to a working shim:** if the underlying system has an OpenAPI spec, generate the shim from it (FastMCP or equivalent) rather than hand-writing MCP protocol code, then curate the generated tool descriptions.
4. **Lightest-weight hosting:** Cloudflare Workers (or an equivalent V8-isolate/edge platform) for near-zero idle cost; Rust or Go if self-hosting a standing process. **On Cloudflare specifically, use a custom domain, not a bare `*.workers.dev` URL** — confirmed live that the latter's default bot protection blocks Cerveau's own datacenter-origin calls entirely (§2).
5. **Token efficiency:** nothing to build — Cerveau's `deferred_loading` already handles this on the client side. Just write good, specific tool descriptions.

---

## Sources

- [The 2026-07-28 Specification — Model Context Protocol Blog](https://blog.modelcontextprotocol.io/posts/2026-07-28/)
- [Key Changes — Model Context Protocol changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog)
- [MCP Just Went Stateless: What Changes for Your Servers](https://www.digitalapplied.com/blog/mcp-2026-07-28-stateless-spec-agent-infrastructure-2026)
- [MCP Transport: Stdio vs Streamable HTTP — Architecture, Latency Benchmarks, and Enterprise Trade-offs](https://www.truefoundry.com/blog/mcp-stdio-vs-streamable-http-enterprise)
- [Multi-Language MCP Server Performance Benchmark — TM Dev Lab](https://www.tmdevlab.com/mcp-server-performance-benchmark.html)
- [How to Deploy an MCP Server on Cloudflare Workers — Fastio](https://fast.io/resources/deploy-mcp-server-cloudflare-workers/)
- [Comparing Progressive Discovery and Semantic Search for Powering Dynamic MCP — Speakeasy](https://www.speakeasy.com/blog/100x-token-reduction-dynamic-toolsets/)
- [Generating MCP tools from OpenAPI: benefits, limits and best practices — Speakeasy](https://www.speakeasy.com/mcp/tool-design/generate-mcp-tools-from-openapi/)
- [MCP Server Framework Comparison: TypeScript SDK vs FastMCP vs MCP-Go (2026) — AgentRank](https://agentrank-ai.com/blog/mcp-server-framework-comparison/)
