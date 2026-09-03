# Aivory Pulse — Real-Time Video Meetings

**Date:** 3 September 2026
**Status:** **Planning.** Engine decided: fork of videocall-rs. No implementation started.
**Scope:** A new Aivory product surface — browser-based video meetings with instant calls and AI. Product name: **Pulse**.
**v1 scope:** instant calls + AI (transcript, summary, action items). **Recording is deferred to a future enhancement** (decision, 3 September 2026).
**Engine:** fork of [security-union/videocall-rs](https://github.com/security-union/videocall-rs) (Rust, MIT OR Apache-2.0), rebranded as Pulse.
**Author's note:** every infrastructure figure here was measured on `tencent-vps` on 3 September 2026. Codebase claims were verified against the repository at commit `31a8b20`. Estimates are labelled as estimates.

---

## Table of Contents

- [Goal](#goal)
- [What Pulse Is](#what-pulse-is)
- [Engine Decision](#engine-decision)
- [What We Inherit, and What We Must Build](#what-we-inherit-and-what-we-must-build)
- [Current State](#current-state)
- [Infrastructure Reality](#infrastructure-reality)
- [Bandwidth & Capacity Model](#bandwidth--capacity-model)
- [Architecture](#architecture)
- [The Audio Tap](#the-audio-tap)
- [The AI Layer](#the-ai-layer)
- [Known Gaps in the Base, and How Pulse Closes Them](#known-gaps-in-the-base-and-how-pulse-closes-them)
- [Security & Privacy](#security--privacy)
- [Rebranding Surface](#rebranding-surface)
- [Packaging & Tiers](#packaging--tiers)
- [Build & Release (decided)](#build--release-decided-3-september-2026)
- [Implementation Plan](#implementation-plan)
- [Future Enhancements](#future-enhancements)
- [Open Questions](#open-questions)
- [Risks](#risks)
- [Non-Goals](#non-goals)

---

## Goal

Give Aivory a first-party video meeting product that a customer uses instead of Google Meet or Zoom, and that is better than both *for Aivory's customers* because the meeting feeds the rest of the platform — Cerveau agents, the user dashboard, and AVRY-Mail's calendar.

**Two hard requirements for v1:**

1. **Instant call** — create and join in one click, no scheduling, no install.
2. **AI-powered** — the meeting produces transcript, summary, and action items automatically.

### Recording is deferred — and why the distinction matters

Recording-to-storage is the single most expensive part of a meeting product: disk, CPU, retention obligations, and legal surface. Deferring it removes the three highest-severity risks from v1.

**But the AI layer still needs to hear the meeting.** These are two different capabilities, and separating them shapes the whole plan:

| | What it does | Status |
|---|---|---|
| **Audio tap** | Subscribes to the call's audio, streams it to transcription, **persists nothing** | **v1** — the AI layer depends on it |
| **Recording** | Persists media to storage, with retention, playback, and video | **Future enhancement** |

v1 builds the audio tap so that recording can later **extend** it rather than replace it: same subscribing client, same decode path, with a storage sink added.

## What Pulse Is

**Core loop for v1 (parity with Meet/Zoom):**

- Instant meeting creation from the dashboard or a URL; shareable join link
- In-browser join, no download; device selection and pre-join preview
- Grid and speaker layouts, active-speaker detection, mute, camera toggle
- Screen sharing
- In-call text chat
- Host controls: waiting-room admission, mute, remove, end meeting

**Differentiation:**

- **Live transcription** during the call
- **Post-call summary and action items**, delivered to the dashboard and by email
- **Searchable meeting archive** — transcripts land in Cerveau's memory graph, so past meetings become context an agent can actually use, not files in a folder
- **Continuity with Aivory** — a meeting can create tasks, update a deal in the Sales & Leads agent, or feed the Office Assistant

The last two points are the product argument. Transcription is a commodity. What Zoom cannot do is make the meeting part of the customer's operational memory — and that is only reachable by owning the media pipeline.

Worth noting: **the differentiation does not depend on recording.** A transcript and a summary deliver the archive and the agent context. Stored audio and video are convenience on top, which is exactly why deferring them costs the product little.

## Engine Decision

**Fork videocall-rs and rebrand it as Pulse.**

What the base gives us:

- **A complete Rust media stack**, server to browser: WebTransport/QUIC relay, WASM web client, VP9/Opus codecs, NetEQ adaptive audio jitter buffer, protobuf wire protocol
- **No ICE, no STUN, no TURN, no SDP.** A genuine operational advantage — a WebRTC stack would add TURN servers to run, monitor, and pay for. Pulse adds none
- **Permissive licence** (MIT OR Apache-2.0) — rebranding is legal; keep the LICENSE files and copyright notices
- **Consistent with the house architecture.** Cerveau/zeroclaw already established Rust in production at 6.6 MB resident. Same discipline, not a new one
- **A meeting layer already exists** — `meeting-api` handles OAuth login, meeting creation, waiting room, and signed JWT room-access tokens. Instant calls are largely configuration of something already built
- **Runtime configuration.** The web client reads `config.js` at runtime, so endpoints, bitrates, OAuth, and feature flags change without rebuilding WASM

The base is Beta, from a small team (1.8k stars, ~495 commits, active as of August 2026). Forking means we own it. That is the deal, and it is the same deal already accepted with Cerveau.

## What We Inherit, and What We Must Build

The key feasibility question was whether Pulse can get decoded audio out of a call on this base. **It can, and cheaply.** Verified in the repository:

| Building block | Status in the base | Verified at |
|---|---|---|
| Native WebTransport client | **Exists** — `videocall-transport` (web-transport-quinn) | `videocall-transport/` |
| Native room-joining client | **Exists** — the `bot` crate connects and joins over WebTransport | `bot/src/webtransport_client.rs` |
| **Native Opus decode** | **Exists** — `neteq` defaults to `native`, pulls `ropus` | `neteq/Cargo.toml` |
| Jitter buffer / adaptive audio | **Exists** — NetEQ, native and wasm | `neteq/`, `videocall-codecs/src/jitter_buffer.rs` |
| Native VP9 decoder | **Exists** — `native = ["libvpx"]` feature | `videocall-codecs/src/decoder/native.rs` |
| Native VP9 encoder | **Exists** | `videocall-codecs/src/encoder/libvpx.rs` |
| WAV file writing | **Exists** — `neteq`'s `audio_files` feature pulls `hound` | `neteq/Cargo.toml` |
| **Subscribing participant** | **Does not exist** — the `bot` crate is send-only | **to be built (v1)** |
| Muxing to MP4/WebM | **Does not exist** | future enhancement only |

**The correction that matters:** decoding is not the work. Opus audio and VP9 video both already decode natively in Rust in this codebase. The audio tap is a **new native client that subscribes instead of publishes** — reusing transport, protobuf types, jitter buffer, and decoders that all exist. `videocall-client` itself cannot be reused directly (it is WASM-only: `gloo`, `js-sys`, `web-sys`), but everything beneath it can.

Because Opus decode is already present and the tap persists nothing, **this is a modest v1 component** — the connection scaffolding already exists in the `bot` crate and needs reversing, not inventing.

## Current State

**Clean slate on the VPS.** Verified 3 September 2026 by full-filesystem scan of `tencent-vps`: no meeting infrastructure of any kind — no containers (30 checked), images, volumes, networks, systemd units, or listening media ports. A stale Traefik CSP entry for a third-party conferencing SaaS was removed the same day (backup: `aivory-secure.yml.bak-pre-livekit-removal-20260903-180701`).

**Two integration seams already exist:**

1. **AVRY-Mail already has the calendar hook.** `migrations/004_conferencing.sql` added `calendar_events.conferencing` and `calendar_events.conferencing_link`. The columns exist; no provider is implemented. Pulse slots in as a provider value — Phase 5, not new schema work.
2. **Cerveau already generates meeting summaries.** `office_assistant` shipped meeting-summary parity on 9 August 2026; the audio add-on has been design-only since. **Pulse is the audio source that add-on was designed around.** The AI layer is largely integration, not a new build.

## Infrastructure Reality

Measured on `tencent-vps` (129.226.155.216), 3 September 2026:

| Resource | Measured |
|---|---|
| CPU | 4 vCPU, Intel Xeon Platinum 8255C @ 2.50 GHz |
| RAM | 7.5 GB total, 2.5 GB used, **5.0 GB available** |
| Disk | 178 GB total, 116 GB used, **55 GB free (68% used)** |
| Load average | 0.13 / 0.26 / 0.73 |
| Running containers | 30 |

### C1 — Media transport and the Cloudflare boundary

UFW allows 80/443 **only from Cloudflare's ranges**. All public traffic enters via Cloudflare, then Traefik.

**WebTransport is QUIC, which is UDP, and cannot traverse Cloudflare's HTTP proxy.** Pulse needs a directly reachable UDP port for the fast path.

The base's design softens this considerably compared with a WebRTC stack:

- **Fast path:** WebTransport over QUIC on a dedicated UDP port, direct to the VPS, bypassing Cloudflare
- **Fallback path:** the built-in **WebSocket fallback over TCP/443**, which *can* stay behind Cloudflare and Traefik like every other Aivory service
- **No TURN or STUN servers to run at all**

A participant on a restrictive network still connects, over WebSocket, through the existing hardened path. That is a real benefit of this base and should be preserved rather than optimised away.

**Consequence to accept consciously:** once the QUIC port is open, the origin IP is exposed on that path and loses Cloudflare's DDoS shielding there. Mitigations for Phase 1: UFW/nftables rate limiting, and isolating media onto its own host so an attack cannot reach the application stack. CrowdSec gates HTTP through Traefik and **will not see the UDP media path** — both the intent and a gap to document.

> Related history: on **10 July 2026** CrowdSec LAPI resource starvation made the bouncer fail closed, causing bare 403s and ~5-second stalls across all Traefik routes. **Resolved the same day** (crowdsec raised to 2.0 CPU / 1024M after a two-round diagnosis; the second round only reproduced under ~50 concurrent asset requests, not sequential tests). Pulse's signalling and WebSocket-fallback paths sit behind the same ForwardAuth chain and inherit that class of failure — every Pulse asset and signalling request is one more gated request. The QUIC media path does not pass through it.

### C2 — Disk (largely defused by deferring recording)

**55 GB free of 178 GB (68% used).**

With recording deferred, **v1 stores no media at all.** The audio tap streams to transcription and discards. Storage in v1 is limited to transcripts and summaries in Postgres — kilobytes per meeting, not gigabytes.

This constraint returns in full when recording arrives, and the numbers should be sized then: composited 720p30 video is roughly 0.7–1.1 GB/hour (estimate), so 55 GB is about 50 hours, once. **Object storage and a retention policy are prerequisites for the recording feature, not for v1.**

### C3 — CPU and RAM

**The relay itself is cheap.** It forwards packets and does not transcode; upstream runs its WebTransport server on a 500m CPU / 256Mi memory limit. On 4 vCPU with 5 GB available, it fits comfortably.

**The audio tap is also cheap.** Opus decode is light, and with no video decode, no compositing, and no encoding, several concurrent meetings are realistic on this box. Real figures to be measured in Phase 3.

**The expensive component was video recording, and it is no longer in v1.** That removes the scenario where two concurrent composite recordings consume half the machine alongside Cerveau, n8n, Odoo, Postgres, and the avry-* stack. A separate media host becomes a question for the recording feature, not a v1 budget item.

## Bandwidth & Capacity Model

The relay fans out: every participant's stream is forwarded to every other participant. Without simulcast, server egress is N × (N−1) × bitrate.

At the base's default bitrates (1000 kbps video + 65 kbps audio ≈ 1.065 Mbps):

| Participants | Server egress per room | Downlink per client | Streams decoded per client |
|---|---|---|---|
| 4 | ~13 Mbps | ~3 Mbps | 3 |
| 6 | ~32 Mbps | ~5 Mbps | 5 |
| 10 | ~96 Mbps | ~9.6 Mbps | 9 |

Three consequences:

1. **Bandwidth, not CPU, is the recurring cost.** Tencent's traffic quota and overage pricing for this VPS must be established before committing — [Q3](#open-questions). This is a business-case blocker, not a detail.
2. **Client decode is a hard ceiling.** Each client decodes N−1 VP9 streams in WASM. The base sets `CANVAS_LIMIT: 20`; that is optimistic for mid-range laptops. Pulse should paginate the grid and subscribe only to visible tiles from the first version.
3. **Bitrate is the cheapest lever we control.** The defaults are runtime config. Lowering default video bitrate and capping resolution costs one config change and cuts the table proportionally.

**Working target for v1: comfortable up to 6 participants, hard cap at 8.** Deliberately conservative and honest about a base without simulcast. Revisit with real measurements at the Phase 1 gate.

## Architecture

```
                Cloudflare ──▶ Traefik ──▶ meeting-api + WS fallback   (TCP/443)
                                   │
  Browser ══════════════════════════╪═════▶ QUIC/UDP  (WebTransport fast path, direct)
                                   │
                            pulse-relay (fork of actix-api)
                                   │
                                 NATS
                                   │
                 ┌─────────────────┴─────────────────┐
                 ▼                                   ▼
          Pulse Audio Tap                      pulse-meeting-api
      (native Rust participant:            (fork of meeting-api: rooms,
       subscribe → decode → stream)         tokens, waiting room, tiers)
                 │                                   │
                 ▼                                   ▼
                STT                             avry-postgres
                 │                              (pulse.* schema)
                 ▼
          Cerveau (:3100) ──▶ dashboard + AVRY-Mail
       summary, actions, memory graph
```

**Components:**

| Component | Nature | Notes |
|---|---|---|
| `pulse-relay` | Fork + rebrand | `actix-api`'s `websocket_server` + `webtransport_server` |
| `pulse-meeting-api` | Fork + extend | `meeting-api` + Aivory auth and tier enforcement |
| **Pulse Audio Tap** | **Build** | Native Rust subscribing participant. The main new engineering in v1 |
| Web client | Fork + rebrand | `dioxus-ui`, surfaced inside `avry-user-dashboard` |
| NATS | Deploy | New dependency; the relay's scaling backbone |
| Schema | Build | `pulse.*` in `avry-postgres` — meetings, participants, transcripts |

**Reused as-is:** Postgres, Traefik, Cloudflare, dashboard auth, Cerveau, AVRY-Mail. **New daemons:** relay, meeting-api, audio tap, NATS. **No TURN, no STUN. No object storage in v1.**

**Dashboard note:** `avry-user-dashboard` has a global `main h1-h4` and `main p` prose rule that silently overrides Tailwind on any heading or paragraph tag, plus a `[class*="title"]` `!important` trap. Pulse's in-call UI must use `span`/`div` for small chrome. The dashboard is desktop-only today; whether Pulse changes that is [Q5](#open-questions).

## The Audio Tap

The one substantial new component in v1. **A native Rust client that joins a meeting as an invisible participant, subscribes to audio, decodes it, and streams it to transcription — persisting nothing.**

Reused from the base:

- `videocall-transport` — native WebTransport connection
- `bot/src/webtransport_client.rs` — proven room-joining scaffolding, reversed to receive
- `videocall-types` — protobuf `PacketWrapper` / `MediaPacket` parsing
- `neteq` with `native` — Opus decode and adaptive jitter buffering

To be written: the subscribe loop, per-participant track demultiplexing with speaker identity preserved, and the STT streaming client.

**Design constraint for v1:** build it so a storage sink can be added later without restructuring. The recording feature should be a new consumer of the same decoded stream, not a rewrite. Keeping video decode out of v1 is a scope decision, not an architectural one — `videocall-codecs`'s native VP9 decoder is already there when it is wanted.

**Participant visibility:** the tap joins as a participant, so it must be represented honestly in the UI — participants should be able to see that AI transcription is active. This is a product requirement, not a nicety. See [Security & Privacy](#security--privacy).

## The AI Layer

1. The audio tap is in the room with decoded audio — no second media path needed
2. Audio streams to **STT**, with speaker attribution from the participant identity in the packet
3. Live captions render in-call from the same stream
4. On meeting end, the transcript goes to **Cerveau**, producing summary, decisions, and action items — reusing the `office_assistant` capability already shipped
5. Output lands in the dashboard, is emailed via AVRY-Mail, and is written into Cerveau's memory graph
6. Action items can create tasks or update records through existing Cerveau tools

**STT is the significant open decision.** Self-hosted Whisper on 4 shared vCPUs will not keep up with real-time transcription alongside the relay and 30 existing containers — effectively ruled out on current hardware. A managed API is the realistic path, adding a per-minute cost line and a new data-processor relationship. See [Q2](#open-questions) and [Q4](#open-questions).

**Language matters.** Many Aivory customers meet in Bahasa Indonesia and code-switch with English mid-sentence. STT selection must be evaluated on **real Indonesian and mixed ID/EN audio**, not English benchmarks. That is a Phase 0 task, not a Phase 4 discovery.

## Known Gaps in the Base, and How Pulse Closes Them

Forking means owning these. Stated plainly rather than discovered later:

| Gap | Impact | Pulse's answer |
|---|---|---|
| **No simulcast** | Server sends one quality to all; the worst-connected participant drags everyone down via "lowest common denominator" adaptation | Cap participants at 8; tune default bitrates down; paginate the grid. Contributing simulcast upstream is **post-GA**, not v1 |
| **No Firefox support** | A customer on Firefox cannot join | A `firefoxEnabled` runtime flag already exists (default off). Phase 6 evaluates enabling and testing it honestly. Until then, browser requirements must be stated up front in-product, not discovered at join time |
| **No recording** | Was a headline requirement; now deferred | Future enhancement, built on the audio tap |
| **No chat/whiteboard/breakouts** | Feature gaps vs Zoom | Chat is Phase 2 scope; the rest are [Non-Goals](#non-goals) |
| **Docs contradict on E2EE** | Risk of a false security claim | See below — verify against deployed config every release |
| **Beta, small upstream team** | We own the fork | Same deal already accepted with Cerveau. Track upstream, merge selectively |

## Security & Privacy

**The E2EE tension applies to AI, not only to recording.** If the server can transcribe the meeting, it can read the media, and the call is not end-to-end encrypted. Deferring recording does not remove this — the audio tap creates it.

The base supports E2EE (hybrid RSA-2048/AES-128, client-side) behind an `enable_e2ee` flag. Pulse must make it an explicit per-meeting choice:

| Mode | Media | AI transcript & summary | Recording (future) |
|---|---|---|---|
| **Standard** (default) | Encrypted in transit; the relay can read it | Available | Available |
| **Private** (optional) | End-to-end encrypted; the relay cannot read it | **Unavailable** | **Unavailable** |

The UI must say which mode is active, in those terms, without marketing softening.

**Do not inherit the base's documentation error.** Upstream's `ARCHITECTURE.md` describes full E2EE while its README states media is *not* end-to-end encrypted — because the flag defaults off and is hardcoded `false` in several paths (`waiting_room.rs`, `meeting.rs:179`). **Pulse's security claims must match deployed configuration, re-verified each release.**

**Required at launch, even without recording:**

- **Transcription consent and a visible indicator.** Participants must know AI transcription is active. A transcript is a verbatim record of what people said; being transcribed without knowing is the same category of harm as being recorded without knowing
- Transcripts and summaries are personal data — access control, audit trail, deletion on request
- Disclosed data residency, including wherever STT processing happens
- Retention for transcripts enforced by job, not by policy document

## Rebranding Surface

Cheap, and verified by inspection:

- **User-visible brand strings in the web client: roughly ten.** The login title `"videocall.rs"`, Terms/Privacy links, and a Matomo analytics URL. The other ~90 matches for "videocall" in `dioxus-ui` are Rust crate names (`videocall_types`, `videocall_client`) that no user ever sees
- **Internal crate names stay.** Renaming them buys nothing and makes merging upstream changes harder
- **Endpoints are runtime config**, not compile-time — no WASM rebuild to repoint
- **Licence obligation:** keep `LICENSE-MIT` and `LICENSE-APACHE` and the copyright notices. The upstream name carries no trademark grant, which is why renaming is required, not merely permitted
- Assets to replace: logo, favicon, sounds (`hi.wav`, `knock.wav`), and the two joke GIFs shipped upstream

**Estimate: 1–2 days.** The rebrand is not the expensive part.

## Packaging & Tiers

Using the canonical tier vocabulary — **operational / business / enterprise**:

| Capability | Operational | Business | Enterprise |
|---|---|---|---|
| Instant calls | Yes, duration + participant limits | Yes, higher limits | Yes |
| Screen share, chat | Yes | Yes | Yes |
| AI transcript + summary | No | Yes | Yes |
| Transcript retention | — | Shorter | Longer |
| Meeting archive search | No | Yes | Yes |
| Custom branding / domain | No | No | Yes |
| *Recording* | *future enhancement* | *future enhancement* | *future enhancement* |

**Enterprise is not self-serve**, consistent with existing practice. Concrete limits are a commercial decision once Phase 1 gives real per-meeting cost figures.

## Build & Release (decided 3 September 2026)

**Decision: adopt upstream's Nix image builds in CI. Do not write our own Dockerfiles. Keep docker-compose for running, and do not adopt upstream's `make dev` dev stack.**

The framing "Nix versus Dockerfiles" turned out to be misleading. Verified in the fork:

- **Nix never touches the VPS.** It runs only in CI, and its output is an ordinary Docker image. docker-compose, Traefik, and the VPS see no difference from any other Aivory service — they pull a container like everything else. The usual objection (a strange toolchain in production) does not apply.
- **The pipeline already exists and works.** Five GitHub Actions workflows already run `nix-build release.nix -A images.<name> --no-out-link | docker load`, then tag and push. Images are already defined for exactly the components Pulse needs: `websocket-server`, `webtransport-server`, `meeting-api`, `dioxus-ui`, `metrics-server`, `media-server`, `bot`. We change the registry and the tags; we inherit the rest.
- **Locally it is one command.** The Makefile's `image-%` target wraps it — `make image-websocket-server`. Nobody has to learn Nix to produce an image.
- **A public Cachix binary cache** (`videocall-rs`, pull works without a token) means CI does not compile the world on every run.

**Why not our own Dockerfiles.** There is **no Dockerfile anywhere in the repository** to adapt — upstream deleted the Docker dev flow entirely. Writing our own means hand-rolling multi-stage builds for a Rust workspace plus a wasm32 target, trunk/dioxus-cli, Tailwind, and protobuf codegen, across roughly five images. The WASM UI build is the hard part.

**But the build effort is not the deciding cost — the merge tax is.** Pulse is a fork that intends to pull selective upstream fixes, which is why it carries full history rather than a shallow clone. Upstream will keep changing its build under Nix. Hand-written Dockerfiles would rot silently on every merge: each upstream dependency or toolchain bump becomes our debugging session. Nix keeps the build in step for free. This failure mode is not hypothetical in this estate — the live `vps-bridge` turned out not to be a git repository at all, and its drift went unnoticed for months.

**The decision splits in two, and upstream conflates them.** We take only the first half:

| Concern | Decision |
|---|---|
| Building images | **Nix, in CI** — inherit the working pipeline |
| Running services | **docker-compose**, exactly like the rest of the Aivory stack |
| Local dev stack (`make dev`: Nix + `process-compose`) | **Deferred.** A developer-experience choice, not a deployment one |

Adopting Nix for builds does not oblige us to adopt `make dev`. Images built in CI run locally under docker-compose like every other Aivory service. Most of Nix's friction lives in the daily dev loop, and that part is skippable.

**Follow-up, small but blocking the first image push:** upstream's Helm values point at `securityunion/*` images. Pulse needs its own registry — **GHCR under `Aivory-hub88` is the default choice**, since `gh` is already authenticated there with the `workflow` scope.

**Caveat to know before anyone runs it:** upstream's `make dev` auto-installs Nix on a developer machine via its `ensure-nix` target. That is intrusive; it should be a deliberate act, not a side effect of running a Makefile target.

## Implementation Plan

Each phase has an exit gate. **A phase is complete when its gate is demonstrated, not argued.**

### Phase 0 — Decisions and setup (no product code)
- Fork videocall-rs into the Aivory org; confirm licence files and notices are preserved
- Stand up the build path per the [Build & Release decision](#build--release-decided-3-september-2026): adopt upstream's Nix image builds in CI, publish to our own registry, keep docker-compose for running. Do **not** adopt `make dev`
- Evaluate STT providers on **real Indonesian and mixed ID/EN meeting audio** ([Q2](#open-questions))
- Obtain Tencent bandwidth quota and overage pricing ([Q3](#open-questions))
- Set a monthly infrastructure budget ceiling

**Gate:** the fork builds and produces runnable images on our own infrastructure.

### Phase 1 — Media spike (make-or-break)
- Deploy `pulse-relay` + NATS on the VPS; open the QUIC UDP port through UFW
- Prove a real call **from outside the network**, on mobile data and on a restrictive corporate network
- Verify the **WebSocket fallback works through Cloudflare and Traefik**
- Run genuine 4- and 6-person calls
- **Measure:** server egress bandwidth, CPU, RAM, and per-participant client CPU

**Gate:** a real external multi-party call works over both transports, with measured bandwidth and CPU inside the Phase 0 budget. *If this fails on bandwidth cost, stop and reconsider before building product on top.*

### Phase 2 — Pulse MVP
- Rebrand the client; surface it inside `avry-user-dashboard`
- `pulse-meeting-api`: instant-call creation, join links, waiting room, Aivory auth, tier checks
- `pulse.*` schema in `avry-postgres`
- Grid and speaker view, screen share, in-call chat, host controls
- Grid pagination and visible-tile-only subscription from the start

**Gate:** an Aivory user creates and runs a real meeting with an external guest, end to end, in production.

### Phase 3 — The audio tap
- Build the audio tap as a native subscribing participant
- Per-participant Opus decode with speaker identity preserved
- Represent the tap honestly in the participant list
- Concurrency cap; **measure CPU and RAM per active tap**, replacing this document's estimates
- Design the stream interface so a storage sink can attach later

**Gate:** a live meeting's audio arrives decoded and speaker-attributed at the tap, with measured cost documented.

### Phase 4 — The AI layer
- STT integration and live captions
- Transcript → Cerveau → summary and action items
- Delivery to dashboard and via AVRY-Mail; transcript into the memory graph
- Transcription consent flow and visible indicator

**Gate:** a real meeting produces an accurate Indonesian-language summary with correct action items, judged on a real customer-style call, not a scripted test.

### Phase 5 — Calendar integration
- Implement Pulse as a provider for `calendar_events.conferencing` in AVRY-Mail
- Scheduled meetings, invitations, join-from-calendar

**Gate:** a calendar event creates a working Pulse link and the invitee can join from the invitation.

### Phase 6 — Hardening
- Evaluate enabling the Firefox flag and test it honestly
- Tier gating enforced end to end; capacity limits and graceful degradation
- Security review; verify E2EE claims against deployed configuration

**Gate:** security review passed; load behaviour known and bounded.

### Phase 7 — GA
- Pricing published, limits enforced, documentation and support material complete

## Future Enhancements

Deliberately **out of v1**, listed so the architecture stays ready for them rather than surprised by them.

### Recording (deferred 3 September 2026)

Built as a storage sink on the existing audio tap, in this order:

1. **Audio recording** — per-participant Opus/WAV to object storage. Roughly 15 MB/hour per speaker; cheap on CPU because the decode already happens for the AI layer
2. **Video recording** — per-participant VP9 tracks muxed to WebM, using `videocall-codecs`'s existing native decoder. Expect roughly 1 vCPU per active recording
3. **Composite layout** — the expensive one; likely belongs on a separate media host

**Prerequisites before this work starts, none of which v1 needs:**

- Object storage chosen and provisioned (Cloudflare R2 or Tencent COS — a data-residency decision as much as a cost one)
- Retention policy per tier, enforced by job
- Recording consent flow and a persistent in-call indicator
- Disk and CPU headroom re-measured; a separate media host costed

### Other candidates

- Simulcast contributed upstream or carried as a fork patch ([Q6](#open-questions))
- In-dashboard playback with a transcript timeline (depends on recording)
- Firefox support, if the existing flag proves sound
- Native mobile applications

## Open Questions

> Numbering is stable: **Q1 (Nix vs. own Dockerfiles) was answered on 3 September 2026** — see [Build & Release](#build--release-decided-3-september-2026). Answered questions are removed rather than renumbered, so cross-references elsewhere in this document keep pointing at the right thing.

| # | Question | Blocks | Owner |
|---|---|---|---|
| Q2 | Which STT provider, and is it good enough on Indonesian and ID/EN code-switching? | Phase 4 and the cost model | Phase 0 |
| Q3 | Tencent bandwidth quota and overage price for this VPS? | The business case | Phase 0 |
| Q4 | Is a third-party STT processor acceptable for customer meeting audio, and what must customers be told? | Phase 4 | Irfan / commercial |
| Q5 | Does Pulse need mobile browser support at v1? The dashboard is desktop-only, but meetings are the one feature people genuinely join from phones | Phase 2 scope | Irfan |
| Q6 | Do we contribute simulcast upstream, carry it as a fork patch, or live without it? | Post-GA | After Phase 1 measurements |

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Bandwidth cost exceeds what the product can carry — worsened by the absence of simulcast | **High** | Phase 1 gate measures it before product is built; cap at 8 participants; tune default bitrates down |
| Firefox unsupported; users hit a wall at join time | **Medium** | State browser requirements up front in-product; evaluate the existing flag in Phase 6 |
| STT quality poor on Indonesian / code-switched audio | **Medium** | Evaluate on real audio in Phase 0, before the AI phase |
| Opening the QUIC UDP port exposes the origin IP | **Medium** | Rate limiting; WebSocket fallback keeps the hardened path available; media host isolation if needed |
| Transcription without clear consent is a privacy and trust failure | **Medium** | Consent flow and visible indicator are Phase 4 gate items, not later polish |
| We own a Beta fork from a small upstream team | **Medium** | Same deal already accepted with Cerveau; track upstream, merge selectively |
| Audio tap CPU competes with 30 existing containers on 4 vCPU | **Low–Medium** | Opus-only decode is light; measured at the Phase 3 gate; concurrency cap |
| Nix is an unfamiliar toolchain; a failed Nix build is unpleasant to debug | **Low–Medium** | Confined to CI image builds — it never runs on the VPS and never gates a deploy. `make image-<name>` wraps it locally. Escape hatch: hand-written Dockerfiles remain possible later, at the cost of the merge tax described in the decision |
| Dependence on upstream's public Cachix cache for build speed | **Low** | If it goes away, builds get slower, not broken. Mitigation: run our own Cachix or use the GitHub Actions cache |
| Scope creeps toward Zoom parity forever | **Medium** | Non-goals below are binding; differentiation is the AI layer, not feature parity |

> Deferring recording removed three previously **High**-severity risks from this table: disk exhaustion, recorder CPU contention, and recording-retention legal surface. They return with the recording feature and are tracked in [Future Enhancements](#future-enhancements).

## Non-Goals

Explicitly **out of scope**, to be defended against scope creep:

- Recording at v1 — see [Future Enhancements](#future-enhancements)
- Webinar mode with hundreds of view-only attendees
- PSTN dial-in and telephony
- Breakout rooms
- Live streaming to RTMP destinations
- Virtual backgrounds and video filters
- Native mobile applications (mobile *browser* support is [Q5](#open-questions))
- Replacing Calnode for booking — Calnode schedules, Pulse hosts the call
- Whiteboard and collaborative documents
- End-to-end encryption *with* AI transcription — technically impossible, see [Security & Privacy](#security--privacy)

---

## Related Documents

- [CERVEAU-STATUS.md](CERVEAU-STATUS.md) — Cerveau status; read before touching the AI layer
- [AGENT-FEATURE-OVERVIEW.md](AGENT-FEATURE-OVERVIEW.md) — agent capabilities Pulse will feed
- [DEPLOYABLE_AGENT_RUNTIME_PLANNING.md](DEPLOYABLE_AGENT_RUNTIME_PLANNING.md) — the phased-plan format this document follows, and the precedent for forking a Rust engine
