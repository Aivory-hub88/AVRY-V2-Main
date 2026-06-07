# Aivory — AI-Powered Business Transformation Platform

Aivory helps organizations assess AI readiness, design implementation blueprints, and automate operations with confidence. From diagnostic to deployment — one platform.

---

## One-Line Installation (Ubuntu VPS)

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/ClementHansel/aivery/main/install.sh)
```

This installs Docker, clones all services, prompts you to configure `.env`, then starts the full platform with TLS.

---

## Architecture

```
                        Internet
                            │
                    ┌───────▼────────┐
                    │    Traefik     │  :80/:443
                    │  (TLS + Route) │  Auto Let's Encrypt
                    └──┬────────┬───┘
                       │        │
          ┌────────────▼──┐  ┌──▼──────────────────────┐
          │   Frontend    │  │       Backend             │
          │               │  │                           │
          │ website  :9000│  │ avry-backend      :8081   │
          │ user-dash:9001│  │ avry-diagnostics  :8082   │
          │ admin    :9002│  │ avry-blueprint    :8083   │
          └───────────────┘  │ avry-roadmaps     :8084   │
                             │ avry-payments     :8085   │
                             │ avry-console      :8086   │
                             │ avry-workflows    :8087   │
                             │ avry-blog         :8088   │
                             │ avry-careers      :8089   │
                             │ avry-zeroclaw     :8090   │
                             └──────────┬────────────────┘
                                        │
                        ┌───────────────▼─────────────────┐
                        │          Infrastructure           │
                        │                                   │
                        │  avry-n8n (automation)   :5678   │
                        │  avry-n8n-mcp (AI tools) :3020   │
                        │  avry-n8n-as-code        :3500   │
                        │  zeroclaw-daemon (AI)    :3010   │
                        │  avry-prometheus         :9090   │
                        │  avry-grafana    monitoring.*.id  │
                        └───────────────────────────────────┘
```

### Domain Map (Production)

| Domain | Service | Port |
|--------|---------|------|
| `aivory.id` | avry-website | 9000 |
| `dashboard.aivory.id` | avry-user-dashboard | 9001 |
| `admin.aivory.id` | avry-admin-dashboards | 9002 |
| `console.aivory.id` | avry-console | 8086 |
| `api.aivory.id` | avry-zeroclaw (AI gateway) | 8090 |
| `backend.aivory.id` | avry-backend | 8081 |
| `n8n.aivory.id` | avry-n8n | 5678 |
| `monitoring.aivory.id` | avry-grafana | — |

---

## Repository Structure

This is the **entry repo** — it orchestrates all services as git submodules.

```
aivery/                          ← this repo (entry point)
├── install.sh                   ← one-line VPS installer
├── docker-compose.traefik.yml   ← Traefik reverse proxy (TLS)
├── docker-compose.production.yml ← full production stack
├── docker-compose.local.yml     ← local dev stack (no TLS)
├── .env.example                 ← template for all env vars
├── .gitmodules                  ← all submodules declared here
│
├── scripts/
│   ├── deploy-production.sh     ← deploy/redeploy all services
│   ├── update.sh                ← pull latest + restart changed
│   ├── restart.sh               ← restart one or all services
│   └── status.sh                ← health check all services
│
├── frontend/
│   ├── frontend-nextjs/         ← avry-website (submodule)
│   ├── avry-user-dashboard/     ← avry-user-dashboard (submodule)
│   └── avry-admin-dashboard/    ← avry-admin-dashboards (submodule)
│
├── backend/
│   └── avry-backend/            ← avry-backend (submodule)
│
└── services/
    ├── avry-console/            ← AI Console (submodule)
    ├── avry-diagnostics/        ← Diagnostics engine (submodule)
    ├── avry-blueprint/          ← Blueprint generator (submodule)
    ├── avry-roadmap/            ← Roadmap service (submodule)
    ├── avry-payments/           ← Payments (submodule)
    ├── avry-workflows/          ← Workflow builder (submodule)
    ├── avry-blog/               ← Blog CMS (submodule)
    ├── avry-careers/            ← Careers service (submodule)
    ├── avry-zeroclaw/           ← AI agent gateway (submodule)
    ├── avry-n8n/                ← n8n automation (submodule)
    ├── avry-vps-monitoring/     ← Prometheus + Grafana (submodule)
    └── avry-shared-libs/        ← Shared utilities (submodule)
```

---

## Installation — Step by Step

### Prerequisites

- Ubuntu 22.04 or 24.04 VPS
- 4 GB RAM minimum (8 GB recommended)
- Ports 80 and 443 open
- A domain pointed at the server's IP

### 1. Clone with submodules

```bash
git clone --recursive https://github.com/ClementHansel/aivery.git /opt/aivory
cd /opt/aivory
```

### 2. Configure environment

```bash
cp .env.example .env
nano .env
```

Required values:

| Variable | Where to get it |
|----------|----------------|
| `ACME_EMAIL` | Your email (for TLS certs) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API |
| `SUPABASE_JWT_SECRET` | Supabase → Project Settings → API → JWT Secret |
| `OPENROUTER_API_KEY` | https://openrouter.ai/keys |
| `JWT_SECRET` | `openssl rand -hex 32` |
| `INTERNAL_TOKEN` | `openssl rand -hex 32` |
| `N8N_BASIC_AUTH_PASSWORD` | Choose a strong password |
| `GF_SECURITY_ADMIN_PASSWORD` | Choose a strong password |

### 3. Install Docker (if needed)

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
```

### 4. Run the installer

```bash
chmod +x install.sh scripts/*.sh
sudo bash install.sh
```

---

## Day-to-Day Operations

### Check all service health

```bash
bash scripts/status.sh
```

### Restart a specific service

```bash
bash scripts/restart.sh avry-console
bash scripts/restart.sh avry-zeroclaw
bash scripts/restart.sh infra        # all infrastructure
bash scripts/restart.sh backend      # all backend services
bash scripts/restart.sh frontend     # all frontends
```

### Update the platform (pull latest + restart)

```bash
bash scripts/update.sh               # update everything
bash scripts/update.sh avry-console  # update one service
```

### View logs

```bash
docker compose -f docker-compose.production.yml logs -f avry-console
docker compose -f docker-compose.production.yml logs -f avry-zeroclaw
docker compose -f docker-compose.production.yml logs -f avry-n8n
```

### Stop everything

```bash
docker compose -f docker-compose.production.yml down
docker compose -f docker-compose.traefik.yml down
```

---

## Local Development

For verifying the stack locally (no TLS, direct port access):

**Windows:**
```powershell
.\scripts\start-local.ps1
```

**Linux/Mac:**
```bash
docker network create aivory-network
cp .env.example .env   # fill in dev values
docker compose -f docker-compose.local.yml up -d --build
```

Access:

| Service | URL |
|---------|-----|
| Website | http://localhost:9000 |
| User Dashboard | http://localhost:9001 |
| Admin Dashboard | http://localhost:9002 |
| AI Console | http://localhost:8086 |
| AI Gateway | http://localhost:8090 |
| n8n Editor | http://localhost:5678 |
| Backend API | http://localhost:8081 |

---

## After First Installation

### 1. Set up n8n API key

Visit `https://n8n.aivory.id` → Settings → API → Create API Key.
Add it to `.env`:
```
N8N_API_KEY=your-new-key
```
Then restart zeroclaw:
```bash
bash scripts/restart.sh avry-zeroclaw
```

### 2. DNS Configuration

Point these A records to your VPS IP:

```
aivory.id         → <VPS IP>
*.aivory.id       → <VPS IP>
```

Or individual records:
```
www               → <VPS IP>
dashboard         → <VPS IP>
admin             → <VPS IP>
console           → <VPS IP>
api               → <VPS IP>
backend           → <VPS IP>
n8n               → <VPS IP>
monitoring        → <VPS IP>
```

### 3. Verify TLS

Traefik auto-provisions Let's Encrypt certificates once DNS resolves. Check:
```bash
curl -I https://aivory.id
```

---

## Service Repositories

Each service is independently deployable:

| Repository | Port | Description |
|-----------|------|-------------|
| [avry-website](https://github.com/ClementHansel/avry-website) | 9000 | Marketing website |
| [avry-user-dashboard](https://github.com/ClementHansel/avry-user-dashboard) | 9001 | User dashboard |
| [avry-admin-dashboard](https://github.com/ClementHansel/avry-admin-dashboard) | 9002 | Admin panel |
| [avry-backend](https://github.com/ClementHansel/avry-backend) | 8081 | Core API (FastAPI) |
| [avry-diagnostics](https://github.com/ClementHansel/avry-diagnostics) | 8082 | AI Readiness engine |
| [avry-blueprint](https://github.com/ClementHansel/avry-blueprint) | 8083 | Blueprint generator |
| [avry-roadmaps](https://github.com/ClementHansel/avry-roadmaps) | 8084 | Roadmap planner |
| [avry-payments](https://github.com/ClementHansel/avry-payments) | 8085 | Payments (Midtrans) |
| [avry-console](https://github.com/ClementHansel/avry-console) | 8086 | AI Chat Console |
| [avry-workflows](https://github.com/ClementHansel/avry-workflows) | 8087 | Workflow Builder |
| [avry-blog](https://github.com/ClementHansel/avry-blog) | 8088 | Blog CMS |
| [avry-careers](https://github.com/ClementHansel/avry-careers) | 8089 | Careers |
| [avry-zeroclaw](https://github.com/ClementHansel/avry-zeroclaw) | 8090 | AI Agent Gateway |
| [avry-n8n](https://github.com/ClementHansel/avry-n8n) | 5678 | Workflow automation |
| [avry-vps-monitoring](https://github.com/ClementHansel/avry-vps-monitoring) | — | Prometheus + Grafana |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS v4, TypeScript |
| Backend | FastAPI (Python 3.11+) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase JWT |
| AI Gateway | ZeroClaw 0.7.5 (Rust) + OpenRouter |
| Automation | n8n (self-hosted) |
| Payments | Midtrans Snap SDK |
| Reverse Proxy | Traefik v3 (auto TLS) |
| Monitoring | Prometheus + Grafana |

---

## License

Proprietary — Aivory © 2026. All rights reserved.
