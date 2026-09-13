# Handoff — 2026-09-13: Traefik outage fix + VPS infra checkout drift

Read this if you're touching Traefik, `mail.aivory.uk`, or any of the directories called "AVRY-V2-Main" on `tencent-vps`. This is a point-in-time incident + investigation log, not an architecture reference.

## TL;DR

- **Fixed:** `mail.aivory.uk` was returning `504 Gateway Timeout` for the whole webmail UI (including the new self-service MCP feature shipped tonight — see [`AVRY-Mail-audit/docs/HANDOFF_2026-09-13.md`](../../Aivory/AVRY-Mail-audit/docs/HANDOFF_2026-09-13.md) for that work). Root cause: `avry-traefik` was never a member of the `avry-mail-web-edge` Docker network that `avry-mail-web` runs on, so it had no route to it. Fixed live (`docker network connect`) and persisted declaratively in the compose file that actually drives the running container.
- **Discovered, not fixed:** the VPS directory `/home/ubuntu/AVRY-V2-Main` — which is the *real* deploy source for Traefik, the landing page, and most backend services — has ~300 tracked source files deleted from disk and never committed, a `docker-compose.prod.yml` with months of uncommitted drift, and other signs of long-running "edit live on the VPS, tag a Docker image as a rollback point" workflow instead of git-based deploys. This is a separate, larger problem than tonight's Traefik fix. See §3.
- **Not done:** any git reconciliation of that directory. Deliberately stopped short of it — see §4 for why and what's recommended instead.

## 1. The outage and the fix

**Symptom:** `https://mail.aivory.uk/settings` (and presumably every other page) returned `504 Gateway Timeout` after the `avry-mail`/`avry-mail-web` containers were rebuilt and recreated for tonight's self-service MCP deploy. The containers themselves were healthy; `docker exec avry-mail-web curl 127.0.0.1:3005/` worked fine from inside the container.

**Root cause:** `avry-mail-web` runs on an isolated network, `avry-mail-web-edge` (declared `external: true`, deliberately not on the shared `aivory-network` — see the comment in `AVRY-Mail-audit/docker-compose.mail-prod.hardening.yml`). Traefik discovers and routes to containers via Docker's API, but it can only actually *connect* to a container if Traefik itself is a member of a network the container is on. `avry-traefik` was never attached to `avry-mail-web-edge` — confirmed via `docker inspect avry-traefik` showing only `aivory-network`. Traefik's own logs showed it correctly resolving the target (`http://172.23.0.2:3005`) and then timing out after 30s trying to reach it — a clear "route resolved, network unreachable" signature, not a DNS or config problem.

This was very likely a **pre-existing gap**, not something tonight's redeploy caused — nothing about rebuilding `avry-mail`/`avry-mail-web` touches Traefik's own network membership. It's more likely nobody had done a hard-refresh (bypassing browser cache) against `mail.aivory.uk` in a while, so the breakage was invisible until tonight.

There is a draft fix for exactly this already sitting **uncommitted** in the local `AVRY-Mail-audit` checkout: `docker-compose.traefik-mail-edge.yml`, written by an earlier session but apparently never applied or committed. Its existence corroborates that this was a known-but-unactioned gap.

**Fix applied, in order:**
1. Live: `sudo docker network connect avry-mail-web-edge avry-traefik` — immediate, verified `mail.aivory.uk/settings` returns `200` afterward.
2. Persisted (uncommitted, disk-only) in `/home/ubuntu/AVRY-V2-Main/docker-compose.prod.yml` — **this is the file that actually governs the running `avry-traefik` container** (confirmed via `docker inspect --format '{{index .Config.Labels "com.docker.compose.project.config_files"}}'`), added `avry-mail-web-edge` to the `traefik` service's `networks:` list and declared it external at the bottom. Backed up first to `docker-compose.prod.yml.bak-pre-mail-edge-network-20260913`. **Not committed to git** — see §3 for why.
3. Also committed and pushed to `Aivory-hub88/AVRY-V2-Main` (`820feea`) the equivalent fix in `docker-compose.traefik.yml` — but note this file lives in `/home/ubuntu/avry-v2-main-src`, a checkout that **does not drive the live Traefik container**. This push is good hygiene for whoever eventually treats that checkout as canonical, but it has zero live effect today. Don't mistake this push for "the fix is deployed" — the disk-only edit in step 2 is the one that matters right now.

**Verification:** `curl -s -o /dev/null -w '%{http_code}' https://mail.aivory.uk/settings` → `200`. Confirmed via `docker exec avry-mail curl .../v1/me/mcp/grants` that the new self-service MCP feature works end-to-end through the real domain (not just container-internal).

## 2. The three "AVRY-V2-Main" directories — still true, now with more detail

Per the existing memory note (`avry-v2-main-submodule-pin-drift`), there are three things called "AVRY-V2-Main":

1. **`/home/ubuntu/AVRY-V2-Main`** — despite the name, this is a checkout of **`Aivory-hub88/Frntend-nxt`** (confirmed: `git remote -v` → `Frntend-nxt.git`). This is correct and intentional — see `deployed-landing-repo` memory. **This is the one that actually drives production**: `avry-traefik`, `avry-website`, `avry-backend`, `avry-postgres`, `avry-user-dashboard`, `avry-admin-dashboards`, `avry-blog`, `avry-careers`, `avry-diagnostics`, `avry-roadmap`, `avry-blueprint`, `avry-payments`, `avry-workflows`, `aivory-collab` are all managed from its `docker-compose.prod.yml` (confirmed via compose project labels on every one of those containers). Do not confuse this with the real AVRY-V2-Main monorepo.
2. **`/home/ubuntu/avry-v2-main-src`** — the real `Aivory-hub88/AVRY-V2-Main` monorepo checkout. Drives exactly one live thing: `avry-zeroclaw-daemon`, via its own `docker-compose.production.yml` (a different file than `docker-compose.traefik.yml`, which is what tonight's first, ultimately-irrelevant fix touched). Otherwise parked.
3. **The local Mac checkout** (`/Users/ireichmann/Documents/Aivory V2`, this repo) — same monorepo, different remote setup, used for day-to-day work.

## 3. What's actually wrong with checkout #1 (the live one)

This is the part worth someone's dedicated attention, separate from the mail work:

- `git status` on `/home/ubuntu/AVRY-V2-Main` shows **~300 tracked files deleted** from disk relative to its own committed HEAD (`8576d17`) — essentially the entire Next.js `src/`, `public/`, and root config (`package.json`, `next.config.js`, `Dockerfile`, `tsconfig.json`, etc.) are gone. Verified this is a real filesystem deletion, not a git display artifact (`ls src/app/page.tsx` → `No such file or directory`).
- **This did not break anything yet** because `avry-website` runs from a pre-built Docker image (`avry-v2-main-avry-website:latest`, built 2026-09-08 10:45) that doesn't need the source tree at runtime. But **the next time anyone needs to rebuild `avry-website` from source, the build will fail** — there's nothing left to build from in this checkout.
- `docker-compose.prod.yml` itself is locally modified relative to its own git history, and untracked backup files (`docker-compose.prod.yml.bak-*`, over a dozen of them, dated 2026-08-22 through 2026-09-10) litter the directory alongside `.security-backups/` snapshots.
- `.gitmodules` is present on disk (declaring 15+ submodules matching the *real* AVRY-V2-Main monorepo's structure — `backend/avry-backend`, `frontend/avry-admin-dashboard`, `services/avry-*`) but is itself **untracked** by this checkout's own git history, and a `traefik` path shows as a modified submodule-style gitlink diff. The submodule configuration and the checkout's actual git identity (Frntend-nxt) don't match — this directory has been treated as a hybrid of both projects for some time.
- A real secret-handling gap: `.env.bak-pre-fx-margin-3pct-20260829` sits in the working tree, untracked, presumably containing a raw copy of production secrets — the `.gitignore` here only excludes `.env`/`.env.local`/`.env.production` exactly, not the `.env.bak-*` pattern. It was never staged or committed (confirmed), but it should be deleted or the gitignore pattern broadened so a future `git add -A` can't catch it.
- `docker images` shows **~50 timestamped `avry-website` tags** (`pre-grain-boost-20260905...`, `pre-headline-...`, `rollback-20260908-...`, etc.) spanning 2026-08-30 through 2026-09-10, roughly one every 20–90 minutes during active work — a clear pattern of iterating by editing live on the VPS and tagging a Docker image as the rollback mechanism, instead of committing to git and redeploying from a clean checkout. This is almost certainly how the ~300 files ended up deleted: at some point in that process a cleanup/reset step (`git clean -fdx`, a stray `rm -rf`, or similar) removed the working tree's source without anyone noticing, because the already-built image kept serving traffic regardless.
- `services/collab/._Cargo.lock`, `._Dockerfile`, etc. — literal macOS AppleDouble sidecar files — are present untracked. These only get created when files are copied off a Mac (Finder, AirDrop, an extracted zip) rather than via git or scp of the raw files. Another sign of ad hoc file shuffling rather than version-controlled deploys.

**Whose work is this:** there's no single commit or log entry to point to — this is all uncommitted local drift, and Docker image tags don't record who ran the build. The naming conventions (`.bak-<feature-name>-<timestamp>`, descriptive rollback tags per small UI tweak) match the working style Claude Code sessions have used on this exact host all along, including this session's own `docker-compose.traefik.yml.bak-*` earlier tonight. This is very likely the accumulated result of many AI-assisted sessions over the past ~3 weeks doing rapid live-edit-and-image-tag iteration on the landing page, not one identifiable incident or person. The pattern itself — edit-in-place on a production host with Docker tags as the safety net instead of git commits — is the thing to stop doing going forward, more than any single session's specific mistake.

## 4. Why reconciliation was deliberately NOT attempted tonight

User asked for the three checkouts to be reconciled. Investigation escalated the scope significantly (see §3) partway through, and it was stopped there rather than pushed to a conclusion, because:

- Checkout #1's git remote (`Frntend-nxt`) is **correct**, not a mistake to fix — an earlier version of tonight's plan to "repoint the remote" would have broken the legitimate, working landing-page deploy link. (Caught and corrected mid-session — see the conversation for the reasoning trail if useful.)
- Committing checkout #1's current state as-is would permanently record ~300 file deletions and a modified `docker-compose.prod.yml` into git history for a repo (Frntend-nxt) that's also the source of truth for a currently-working production deploy. If any of that deletion was accidental rather than deliberate, that's a decision someone should make deliberately, not one that should happen as a side effect of "let's snapshot this for safety" at the end of a long session.
- No working git push credentials are confirmed for the Frntend-nxt remote from the VPS (per existing memory) — meaning even a safe local commit might not be push-able, so "snapshot for durability" wouldn't actually achieve durability without further work anyway.
- This directory drives Traefik for **every** production domain, not just mail. Getting a git-surgery step wrong here has a much larger blast radius than anything mail-specific tonight.

## 5. Recommended next steps (not done, for whoever picks this up)

1. **Decide on purpose, deliberately, before touching git in checkout #1**: is the ~300-file deletion intentional (e.g., a decision was made that this checkout only needs to serve a pre-built image and never rebuild from source again) or accidental (and the real source lives only in the local Mac checkout / dashboard forks and needs to be re-synced here)? This determines everything else.
2. If rebuilding from source will ever be needed again: restore `src/`, `public/`, and the root config files from whatever the last-known-good source actually is (possibly the local Mac checkout's `frontend/frontend-nextjs/`, per the path-mapping note in `deployed-landing-repo` memory — but verify, don't assume, since the local checkout is also known to run a different Next.js/React version).
3. Delete `.env.bak-pre-fx-margin-3pct-20260829` from the VPS (or move it somewhere outside any git working tree) — it's a live secrets-exposure risk sitting in a directory that periodically gets `git add`-ed to for other reasons.
4. Stop the "edit live on VPS + tag a Docker image as rollback" pattern going forward for this host. If a future session (AI-assisted or not) needs to make a landing-page tweak, prefer: edit the source in a proper checkout, commit, build, deploy — even if slower than the live-edit loop this directory has clearly been through for weeks.
5. Separately and at leisure: reconcile `/home/ubuntu/avry-v2-main-src` (checkout #2) with current `origin/main` — this one is genuinely low-risk to fix properly since nothing except `avry-zeroclaw-daemon` depends on it, and its history is a clean prefix of the real monorepo's current history (its old HEAD, under a pre-rewrite SHA, corresponds content-wise to `origin/main`'s `091d979`).

## 6. Quick reference

- Live Traefik container's actual config: `/home/ubuntu/AVRY-V2-Main/docker-compose.prod.yml` (Frntend-nxt checkout, NOT the real AVRY-V2-Main monorepo).
- `avry-mail-web-edge` network fix is live (`docker network connect`, done) and persisted on disk in that file (done, uncommitted).
- Draft-but-unapplied version of this same fix, now properly committed: `Aivory-hub88/AVRY-V2-Main@820feea` (`docker-compose.traefik.yml` in the *real* monorepo — irrelevant to production today, but correct for whenever `avry-v2-main-src` is reconciled).
- Mail-side work tonight (self-service MCP, permanent v2 enable): `AVRY-Mail-audit/docs/HANDOFF_2026-09-13.md`.
