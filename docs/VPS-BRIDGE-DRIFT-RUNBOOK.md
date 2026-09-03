# vps-bridge: deployment reality and drift runbook

**Status:** Reference / runbook. Written 2026-09-03 after the live bridge was found to exist only on one machine.

## The situation

`/home/ubuntu/AVRY/vps-bridge` on `tencent-vps` is the code that actually serves production. **It is not a git repo and never has been** — no `.git`, no remote, no history. It is edited in place over SSH, with hand-taken `*.bak-<reason>-<date>` copies as the only rollback mechanism (73 of them, ~4MB, as of this writing).

`backend/vps-bridge/` in this monorepo is a *mirror*, not the deployment source. Nothing deploys from it. Before 2026-09-03 it had drifted badly enough that **`lib/roadmapQueue.js` — `require`d by both `worker.js` and `server.js` — had never been committed anywhere**, so a fresh clone of this repo could not have run the service it appears to contain.

Commit `a445b7d` captured the live state. That fixed the *data loss* risk. It did **not** change how deployment works, so **drift resumes with the next in-place edit.**

## Processes (and the trap)

PM2 runs three processes out of that one directory:

| PM2 name | Script | Serves |
|---|---|---|
| `vps-bridge` | `server.js` | HTTP endpoints (enqueue routes, console/chat, webhooks) |
| `diag-worker` | `worker.js` | **All three BullMQ queues** — diagnostics, blueprints *and* roadmaps |
| `discord-listener` | `discord-listener.js` | Discord channel listener |

**The trap:** the name `diag-worker` predates blueprints and roadmaps being added to the same `worker.js`. Editing `lib/blueprintQueue.js` or `lib/roadmapQueue.js` and restarting only `vps-bridge` changes **nothing** — `server.js` merely enqueues; the queue code runs inside `diag-worker`. This cost real debugging time on 2026-09-02: a correct blueprint fix looked like it had failed because only `vps-bridge` had been restarted.

After editing queue code:

```bash
ssh tencent-vps "pm2 restart diag-worker"
```

After editing `server.js` / routes:

```bash
ssh tencent-vps "pm2 restart vps-bridge"
```

## Check for drift

Run this any time before trusting the repo copy, and after any in-place VPS edit:

```bash
bash scripts/check-vps-bridge-drift.sh
```

It compares SHA-256 of every tracked source file against the live VPS and prints only mismatches. Silence means the repo matches production.

## Re-capture the live state into the repo

Read-only against the VPS; touches nothing there and restarts nothing:

```bash
cd "$(git rev-parse --show-toplevel)"
rsync -av \
  --exclude='node_modules' \
  --include='.env.example' \
  --exclude='.env' --exclude='.env.*' \
  --exclude='*.log' --exclude='*.bak*' --exclude='backups-*' \
  --exclude='.git' \
  tencent-vps:/home/ubuntu/AVRY/vps-bridge/ ./backend/vps-bridge/
```

Then, **before staging**, always:

1. `git status --short backend/vps-bridge/` — confirm no `.env*` appeared.
2. Scan for credentials that live outside `.env` (this has bitten before — `.env.example` shipped a concrete secret-shaped `N8N_MCP_AUTH_TOKEN` and a `N8N_BASE_URL` pointing at the retired, miner-compromised `43.156.108.96`):

   ```bash
   grep -rnEi "(sk-[a-zA-Z0-9]{16,}|sk-or-v1-|eyJhbGciOi|xoxb-|ghp_|[0-9]{9,10}:AA[a-zA-Z0-9_-]{30,}|postgres(ql)?://[^'\"[:space:]]+:[^'\"[:space:]]+@)" \
     --include='*.js' --include='*.sh' --include='*.json' --include='.env.example' \
     backend/vps-bridge/ | grep -v node_modules
   ```
3. `node --check` every changed `.js` before committing.

## What is deliberately not in the repo

- `node_modules/`, `*.log`
- **Every `.env*`** — 11 files on the VPS holding live credentials (OpenRouter, n8n, DB, webhook secrets), including timestamped `.env.bak-*` rotation copies. `.gitignore` covers `.env` and `.env.*` with a `!.env.example` exception.
- **`*.bak*`, `*.backup*`, `backups-*/`** — 73 hand-taken snapshots, ~4MB. They remain on the VPS. Git history serves this purpose from here on; if any of that archaeology is ever needed, it is still sitting in `/home/ubuntu/AVRY/vps-bridge/`.

## The real fix, not done here

Making the VPS directory a git working copy would end drift permanently, but it changes the deployment model of a live, revenue-serving service and risks a `checkout` clobbering in-flight state. That is a deliberate, scheduled maintenance task — not something to do in passing. Until then, this runbook plus the drift script is the containment.
