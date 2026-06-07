# Aivory Platform — Complete Project Update & Technical Handover

**Date:** June 7, 2026  
**Prepared by:** Clement Hansel
**Status:** Complete — All systems restructured, integrated, and deployed to GitHub

---

## Executive Summary

This document records the complete transformation of the Aivory platform from its original state to its current architecture. The project went through three major phases:

1. **Platform Migration** — From a vanilla HTML/JS/CSS single-page application to a modern Next.js microservices architecture
2. **Midtrans & UI/UX Integration** — Incorporating the Midtrans team's frontend delivery and aligning the entire website to the new design language
3. **Repository Separation & Deployment** — Breaking the monorepo into 18 independent, Docker-ready repositories with full documentation

The result is a production-ready, maintainable platform where each service can be developed, tested, and deployed independently.

---

## Table of Contents

- [Repository Links & Status](#repository-links--status)
- [Phase 1: Platform Migration (HTML → Next.js, Monolith → Microservices)](#phase-1-platform-migration)
- [Phase 2: Midtrans Team Integration & UI/UX Alignment](#phase-2-midtrans-team-integration--uiux-alignment)
- [Phase 3: Repository Separation & Deployment](#phase-3-repository-separation--deployment)
- [Architecture — Complete Before & After](#architecture--complete-before--after)
- [Frontend Deep Dive](#frontend-deep-dive)
- [Backend Deep Dive](#backend-deep-dive)
- [Infrastructure Deep Dive](#infrastructure-deep-dive)
- [How to Work With the New Structure](#how-to-work-with-the-new-structure)
- [Verification & Quality Assurance](#verification--quality-assurance)
- [Next Steps](#next-steps)

---

## Repository Links & Status

### Main Entry
| Repository | URL | Purpose |
|-----------|-----|---------|
| **aivory** | https://github.com/ClementHansel/aivory | Platform entry point — architecture docs, env examples, links to all repos |

### Frontend Applications
| Repository | URL | Port | Purpose |
|-----------|-----|------|---------|
| **avry-website** | https://github.com/ClementHansel/avry-website | 9000 | Marketing website & homepage (Next.js 16) |
| **avry-user-dashboard** | https://github.com/ClementHansel/avry-user-dashboard | 9001 | User dashboard — diagnostics, blueprints, workflows |
| **avry-admin-dashboards** | https://github.com/ClementHansel/avry-admin-dashboards | 9002 | Admin panel — user management, analytics |

### Backend Services
| Repository | URL | Port | Purpose |
|-----------|-----|------|---------|
| **avry-backend** | https://github.com/ClementHansel/avry-backend | 8081 | Core API — auth, users, orchestration (FastAPI) |
| **avry-diagnostics** | https://github.com/ClementHansel/avry-diagnostics | 8082 | AI Readiness Diagnostic engine |
| **avry-blueprint** | https://github.com/ClementHansel/avry-blueprint | 8083 | AI System Blueprint generator |
| **avry-roadmaps** | https://github.com/ClementHansel/avry-roadmaps | 8084 | Implementation Roadmap service |
| **avry-payments** | https://github.com/ClementHansel/avry-payments | 8085 | Payment processing (Midtrans) |
| **avry-console** | https://github.com/ClementHansel/avry-console | 8086 | AI Console — conversational assistant |
| **avry-workflows** | https://github.com/ClementHansel/avry-workflows | 8087 | Workflow Builder engine |
| **avry-blog** | https://github.com/ClementHansel/avry-blog | 8088 | Blog CMS service |
| **avry-careers** | https://github.com/ClementHansel/avry-careers | 8089 | Careers/job listings service |
| **avry-zeroclaw** | https://github.com/ClementHansel/avry-zeroclaw | 8090 | AI Agent deployment engine |

### Infrastructure
| Repository | URL | Purpose |
|-----------|-----|---------|
| **avry-vps** | https://github.com/ClementHansel/avry-vps | VPS orchestration, Nginx, deployment scripts |
| **avry-vps-monitoring** | https://github.com/ClementHansel/avry-vps-monitoring | Health monitoring, metrics, alerting |
| **avry-n8n** | https://github.com/ClementHansel/avry-n8n | n8n workflow automation (self-hosted) |
| **avry-shared-libs** | https://github.com/ClementHansel/avry-shared-libs | Shared utilities, types, SDK packages |

---

## Phase 1: Platform Migration

### The Original State — What We Started With

The Aivory platform originally existed as:

**A single `index.html` file** with inline CSS and vanilla JavaScript. Everything — the hero section, pricing tables, diagnostic questionnaire, payment modal, authentication, dashboard — lived in one HTML file with supporting JS scripts loaded via `<script>` tags.

```
Original structure:
frontend/
├── index.html                    ← entire website in one file
├── free-diagnostic.html          ← diagnostic questionnaire
├── workflows.html                ← workflow builder page
├── logs.html                     ← logging page
├── settings.html                 ← settings page
├── styles.css                    ← all styles
├── design-system.css             ← design tokens
├── app.js                        ← main application logic
├── auth-manager.js               ← authentication (localStorage)
├── auth-modals.js                ← login/signup modals
├── payment-modal.js              ← Midtrans payment handling
├── console-streaming.js          ← AI console with streaming
├── dashboard.js                  ← dashboard logic
├── hero-typewriter.js            ← hero text animation
├── led-hero-background.js        ← LED grid background effect
├── vps-bridge-client.js          ← API communication
├── user-state-manager.js         ← user state persistence
├── tier-sync.js                  ← subscription tier management
├── workflow-preview.js           ← workflow rendering
├── diagnostic-questions-paid.js  ← paid diagnostic questions
├── diagnostic-questions-snapshot.js
├── ... (30+ more JS files)
└── ... (SVG/PNG assets scattered throughout)
```

**Problems with this approach:**
- No component reuse — copy-paste across pages
- No type safety — pure JavaScript with no TypeScript
- No build optimization — all JS loaded in full on every page
- No server-side rendering — blank page until JS executed
- No testing — impossible to unit test inline DOM manipulation
- No code splitting — entire app loaded for every visitor
- Authentication was localStorage-based with no JWT validation
- No SEO — search engines couldn't index the content
- Styling was global CSS with constant specificity conflicts
- Deployment was "upload files to server via SCP"

**The backend** was a single Python/FastAPI monolith (`avry-backend`) that handled everything — auth, diagnostics, blueprints, payments, workflows, agents — in one process.

### What We Migrated To

#### Frontend: Next.js Application Framework

We rewrote the entire frontend as a **Next.js 16** application with:

**React 19 component architecture** — Every section of the site is a reusable component. The hero, pricing cards, feature showcases, navigation, and footer are all isolated components that can be tested, modified, and composed independently.

**TypeScript throughout** — Every file is typed. API responses have defined interfaces. Component props are typed. Event handlers are typed. This catches entire categories of bugs at compile time that the old JS approach would only surface at runtime.

**Tailwind CSS v4** — Utility-first styling with a design token system defined in CSS custom properties. No more global CSS conflicts. Styles are co-located with components and tree-shaken at build time.

**App Router (file-based routing)** — Each page is a file in the `app/` directory. No manual route configuration. Dynamic routes for blog posts, career listings, and diagnostic results are handled by Next.js conventions.

**Server-side rendering + static generation** — Pages that don't need dynamic data (About, Privacy, Terms, Product) are pre-rendered at build time. Pages that need auth (Dashboard, Payment) render on the client. This gives search engines indexable HTML and users a fast initial load.

**next/font optimization** — Fonts (Manrope, Inter Tight, JetBrains Mono) are loaded via Next.js font optimization, self-hosted from the build output rather than making external Google Fonts requests at runtime.

**next/image optimization** — The brand logo and any images go through Next.js's image pipeline for automatic format conversion, resizing, and lazy loading.

#### Backend: Microservices Architecture

The single FastAPI monolith was broken into **12 independent services**, each responsible for one domain:

| Service | Domain Responsibility |
|---------|----------------------|
| avry-backend | Authentication, user management, orchestration |
| avry-diagnostics | AI readiness scoring, question engine, result analysis |
| avry-blueprint | Architecture generation from diagnostic data |
| avry-roadmaps | Phased implementation planning |
| avry-payments | Midtrans integration, subscription management, credits |
| avry-console | Conversational AI (LLM streaming, context management) |
| avry-workflows | Visual flow builder, n8n integration, execution |
| avry-blog | Article CRUD, reactions, comments, WebSocket updates |
| avry-careers | Job listings, applications, WebSocket notifications |
| avry-zeroclaw | AI agent deployment to Telegram/Slack/WhatsApp |
| avry-n8n | Self-hosted n8n for automation orchestration |
| avry-shared-libs | Common utilities shared by all Python services |

**Why separate services:**
- A bug in the blog service cannot crash the payment system
- Each service can scale independently (diagnostics gets more traffic than careers)
- Different teams can own different services without stepping on each other
- Deployment of one service doesn't require redeploying everything
- Each service can have its own release cycle

#### Authentication: localStorage → Supabase JWT

The old system stored user credentials in localStorage with no server validation. Any user could modify their `account_type` in localStorage and gain admin access.

The new system uses **Supabase Auth** with proper JWT tokens:
- Login/signup goes through Supabase or the backend auth service
- JWTs are cryptographically signed and validated on every API request
- User roles (`free`, `admin`, `superadmin`) are stored in Supabase user_metadata
- Session persistence uses Supabase's built-in storage (still localStorage, but the token is validated server-side)
- All microservices verify the JWT independently — no service trusts the client

#### Payment: Script Tag → Midtrans Snap SDK

The old system loaded Midtrans via a `<script>` tag and called `snap.pay()` directly from inline JavaScript. There was no server-side price validation — the price shown in the UI was what got charged.

The new system:
- Loads the Midtrans Snap SDK via a React component (`MidtransLoader`)
- Prices are defined in a single source of truth (`lib/pricing.ts`)
- The backend validates the price before creating a Midtrans transaction
- The frontend only passes the product ID — never the price
- Payment completion triggers backend webhooks that update the user's subscription

#### Deployment: SCP Upload → Docker Containers

The old deployment was:
```bash
scp index.html user@vps:/var/www/html/
```

The new deployment for each service:
```bash
docker build -t avry-website .
docker run -p 9000:3000 --env-file .env avry-website
```

Each service has a multi-stage Dockerfile:
1. **Dependencies stage** — installs packages (cached between builds)
2. **Build stage** — compiles the application
3. **Production stage** — minimal Alpine image with only runtime files

The website Dockerfile produces a ~150MB image (down from the full Next.js node_modules at 1.5GB) using Next.js standalone output mode.

---

## Phase 2: Midtrans Team Integration & UI/UX Alignment

### What the Midtrans Team Delivered

The Midtrans team delivered a separate Next.js project (`Frntend-nxt-main`) focused on payment-flow and Indonesian market requirements. Their delivery was built on **Next.js 14 with React 18** (different versions from our production app on Next.js 16 with React 19).

Their project included:

**Currency system:**
- A `LanguageContext` providing EN/ID language switching
- A `formatPrice()` function that converts USD to IDR using live exchange rates
- An API route (`/api/exchange-rate`) fetching from exchangerate-api.com
- IDR display using shorthand notation: "Rp 464 rb" (thousands), "Rp 1.6 jt" (millions)

**New page designs:**
- Company page (hero with gradient accent, mission/vision/values, CTA)
- Product page (interactive grid showcase, spotlight hover effects, tech lab section)
- Privacy Policy (full legal content on dark background)
- Terms of Service (full legal content on dark background)
- Free Diagnostic (self-contained questionnaire with downloadable PNG cards)

**Design language:**
- Manrope font family (variable weights 200-800)
- Doto monospace font for technical labels
- Dark background (#050505, #000) with white/sage text
- Animated scroll reveals via IntersectionObserver
- Spotlight cursor-follow effects on cards
- Light sage/grey (#dfe4e5) backgrounds for pricing sections
- GSAP replaced with CSS-only animations

**Homepage structure (their version):**
- Hero with video background + parallax + animated entry
- "AI is ready" text section
- Interactive product showcase (scrollytelling with sticky panel)
- Animated stats counters (100+, 50+, 8, 5, 1)
- Step 1 pricing (one-time products) with zoom:0.85 scaling
- Step 2 pricing (subscriptions) with zoom:0.85 scaling
- Privacy section with GDPR badges
- Pre-footer CTA with service cards
- Footer with 5-column grid

### How We Integrated Their Work

We could not simply replace our frontend with theirs because our production app had critical systems they lacked:
- Supabase authentication (they had a placeholder login modal)
- Midtrans Snap SDK (they only showed prices, no actual payment processing)
- Blog and careers pages with WebSocket real-time updates
- Contact form with backend submission
- Diagnostic flow connected to the diagnostics microservice
- Payment history and credit marketplace
- Test suite with 388+ passing tests

Instead, we **merged their functional requirements and design patterns into our existing production app:**

| Their Feature | Our Integration |
|--------------|-----------------|
| `LanguageContext` + `formatPrice()` | Added to our existing `TranslationContext` — now provides `language`, `setLanguage`, `exchangeRate`, `formatPrice` |
| `/api/exchange-rate` route | Created in our App Router at `src/app/api/exchange-rate/route.ts` |
| EN/ID toggle in navbar | Added to `HomeNavbar` alongside existing auth controls |
| Product/Company nav links | Added to `HomeNavbar` linking to our new pages |
| IDR formatting in pricing | Updated `PricingSection`, `SubscriptionSection`, and `CreditMarketplaceSection` to use `formatPrice()` instead of `formatUsd()` |
| Company page content | Created `CompanyHero`, `CompanyContent`, `CompanyCTA` components, replaced placeholder |
| Product page | Created `ProductHero`, `ProductGrid`, `ProductCTA` components, new route |
| Privacy Policy content | Replaced "under construction" placeholder with full policy text |
| Terms of Service content | Replaced "under construction" placeholder with full terms text |
| Footer "Get in Touch" column | Added to `HomeFooter`, updated all links to point to real pages |
| Interactive showcase (scrollytelling) | Created `InteractiveShowcase` component — sticky demo panel with 5 animated product visualizations |
| Stats section (animated counters) | Created `StatsSection` component with easeOutExpo count-up animation |
| Scroll reveal animations | Added `useScrollAnimation` hook and CSS classes (`animate-on-scroll`, `animate-fade-in-up`, etc.) |
| Spotlight card effects | Added CSS (`spotlight-card::before` radial gradient following cursor) |

### What Changed on the Homepage

**Before (our pre-integration homepage):**

```
Section 1: Hero
  - Video background (black sphere)
  - "Make AI make sense." headline
  - Rotating subtitle (green text, cross-fade animation)
  - Ghost-border CTA button → /diagnostic

Section 2: Features (GSAP Stacking Cards)
  - 6 sticky cards scrolling over each other
  - Each card: left text + right SVG diagram
  - Cards: Diagnostic, Blueprint, Roadmap, Console, Workflows, Agents
  - Static SVG illustrations for each product

Section 3: Pricing (One-Time Products)
  - White background
  - 3-column grid: Deep Diagnostic $29, Blueprint $85, Full Stack $99
  - USD only, no currency switching

Section 4: Subscriptions
  - White background
  - 3-column grid: Foundation $20/mo, Pro $44/mo, Enterprise $499/mo
  - USD only

Section 5: Credit Marketplace
  - Light gray background
  - Starter packs (50-1000 IC) + Scale packs (2500-10000 IC)

Section 6: Privacy & Expert Guidance
  - Dark background
  - GDPR badges + service consultation cards

Section 7: Footer
  - 5-column grid (Product, Company, Legal, spacer, logo)
  - Product links → /#hero (same page anchor)
  - Company links → placeholder pages
```

**After (post-integration homepage):**

```
Section 1: Hero (unchanged in function, enhanced animations)
  - Same video background
  - Same headline and rotating text
  - Now has entry slide-up animations (animate-slide-up-1/2/3)
  - CTA still routes to /diagnostic

Section 2: Interactive Showcase (REPLACED features section)
  - Left column: scrollable product descriptions (5 products)
  - Right column: sticky dark panel with animated demos
    - Intro state: "YOUR AI TRANSFORMATION STARTS HERE"
    - Diagnostic: animated score gauge (SVG circle, counting to 78)
    - Blueprint: pipeline visualization (4 connected nodes)
    - Roadmap: wave nodes + milestone checklist
    - Console: mock chat with agent analysis response
    - Workflow: 3-node generated workflow animation
  - IntersectionObserver detects which product is in viewport
  - Active product shows full opacity, others dim to 30%

Section 3: Stats Section (NEW)
  - 5 animated counters: 100+, 50+, 8, 5, 1
  - Count-up animation with easeOutExpo easing (2 seconds)
  - Triggered when section enters viewport (threshold 0.3)
  - Vertical laser dividers between stats on desktop
  - Horizontal laser line animations at top/bottom edges

Section 4: Pricing (enhanced)
  - Same products and prices
  - NOW: shows IDR when language is set to Indonesian
  - "$29" → "Rp 464 rb" (live exchange rate conversion)
  - "One time" → "One time" (no translation of frequency labels)

Section 5: Subscriptions (enhanced)
  - Same tiers and prices
  - NOW: shows IDR when Indonesian
  - "/month" → "/bulan" when in Indonesian mode

Section 6: Credit Marketplace (enhanced)
  - Same packs
  - NOW: shows IDR pricing

Section 7: Privacy & Expert Guidance (unchanged)

Section 8: Footer (enhanced)
  - Product links → /product (real page)
  - Company links → /about, /blog, /careers, /contact (real pages)
  - Legal links → /privacy, /terms (real pages with content)
  - Added "Get in touch" column with hello@aivory.uk
```

### New Pages Added

**`/about` (Company page)**

Three-section layout on black background:
1. **CompanyHero** — full-viewport centered section with gradient accent glow, main headline "Aivory is an AI adoption platform", two paragraphs explaining the value proposition, and a scroll indicator at the bottom
2. **CompanyContent** — Mission statement, Vision statement, and a 2x2+1 grid of company values (Clarity over complexity, Speed over ceremony, Outcomes over outputs, Accessible by design, Honest by default)
3. **CompanyCTA** — Call to action with "Talk to Us" (mailto) and "Start Free Diagnostic" (/diagnostic) buttons

All sections use the `useScrollAnimation` hook for entrance reveals as user scrolls.

**`/product` (Product showcase)**

Three-section layout on black background:
1. **ProductHero** — Centered headline "AI-Powered Business Transformation" with gradient accent
2. **ProductGrid** — Two subsections:
   - "Core Products" (3-card grid): Deep Diagnostic, AI Blueprint, AI Roadmap
   - "Deployment Tools" (2x2 grid): Workflow Builder, AI Console, AI Agent, Automation Templates
   - Each card shows tagline (mint green), title, description, and feature bullet list
3. **ProductCTA** — Same pattern as company page CTA

**`/privacy` (Privacy Policy)**

Full legal content with 10 sections covering data collection, usage, sharing, security, retention, user rights, cookies, children, changes, and contact. Uses brand-consistent dark background with light grey body text and white section headings.

**`/terms` (Terms of Service)**

Full legal content with 10 sections covering identity, accounts, permitted use, content ownership, platform IP, payments/refunds, reliability, termination, changes, and liability. Same visual treatment as privacy page.

### Navigation Changes

**Navbar before:**
```
[Logo]                    [Sign In]  [Dashboard]
```

**Navbar after:**
```
[Logo]        [EN|ID]  [PRODUCT]  [COMPANY]  [Sign In]  [Dashboard]
```

The language toggle persists selection to localStorage. When switched to ID:
- All pricing numbers convert to IDR at live exchange rates
- "/month" labels switch to "/bulan"
- The exchange rate is fetched once on page load and cached

---

## Phase 3: Repository Separation & Deployment

### Why We Separated

The monorepo had become unmanageable:
- **3,100+ uncommitted changes** in `git status`
- **Leaked API keys** in git history blocking all pushes to GitHub
- **Legacy files** scattered everywhere (temp Python scripts, old HTML files, test reports, build artifacts)
- **No clear ownership** — touching one folder risked breaking unrelated services
- **Deployment coupling** — rebuilding the blog required pulling 3GB of unrelated code

### What We Did

**Step 1: Identified all deployable units**

We mapped every folder to a logical service:
- `frontend/frontend-nextjs/` → independent Next.js app
- `frontend/avry-user-dashboard/` → independent Next.js app
- `frontend/avry-admin-dashboard/` → independent Next.js app
- `backend/avry-backend/` → independent FastAPI service
- `services/*` → 12 independent services
- `vps/` → independent infrastructure config

**Step 2: Prepared each for standalone deployment**

For each service, we ensured:
- A proper `.gitignore` (language-appropriate exclusions)
- A `README.md` (description, setup, Docker, deployment)
- A `.env.example` (all required variables documented)
- A `Dockerfile` (multi-stage, production-ready)
- A `docker-compose.yml` (single-command local dev)

**Step 3: Pushed to individual repos**

Each service got its own fresh git history (no secrets from the monorepo):
```
git init
git remote add origin https://github.com/ClementHansel/<repo>.git
git add -A
git commit -m "feat: initial release — <description>"
git push -u origin main --force
```

**Step 4: Created the entry repo**

The `aivory` repo was cleaned to contain only:
- `README.md` — full architecture diagram and links to all repos
- `docs/` — architecture diagrams and this handover document
- `.env.example` — shared environment variable reference
- `.gitignore` — excludes all sub-project build artifacts

It has a fresh git history with no leaked secrets.

**Step 5: Cleaned local workspace**

Removed from `frontend/`:
- 50+ legacy HTML/JS/CSS files from the old vanilla site
- SVG/PNG assets (now in each app's `public/` folder)
- The Midtrans team's zip delivery (already integrated)
- Old `components/` and `utils/` directories

Removed from root:
- 100+ temp Python scripts (`tmp_*.py`, `inspect_*.py`, `fix_*.py`)
- All test report JSON files
- All deployment/fix shell scripts
- `vps-bridge/`, `nextjs-console/`, `graphify-out/` (now in their own repos)
- Old workspace files, package.json at root level
- `zeroclaw-*` directories

**Final local workspace:**
```
aivory/
├── .git/               ← clean history, points to ClementHansel/aivory
├── docs/               ← architecture diagrams + this document
├── backend/avry-backend/     ← has own .git → ClementHansel/avry-backend
├── frontend/
│   ├── frontend-nextjs/      ← has own .git → ClementHansel/avry-website
│   ├── avry-user-dashboard/  ← has own .git → ClementHansel/avry-user-dashboard
│   └── avry-admin-dashboard/ ← has own .git → ClementHansel/avry-admin-dashboards
├── services/
│   ├── avry-blog/            ← has own .git → ClementHansel/avry-blog
│   ├── avry-blueprint/       ← has own .git → ClementHansel/avry-blueprint
│   ├── ... (12 services)
│   └── avry-zeroclaw/        ← has own .git → ClementHansel/avry-zeroclaw
├── vps/                      ← has own .git → ClementHansel/avry-vps
├── .env.example
├── .env.production.example
├── .gitignore
└── README.md
```

---

## Architecture — Complete Before & After

### Original Architecture (HTML Era)

```
┌──────────────────────────────────────┐
│           User's Browser             │
│                                      │
│  index.html (everything in one file) │
│  ├── <script> auth-manager.js        │
│  ├── <script> payment-modal.js       │
│  ├── <script> console-streaming.js   │
│  ├── <script> dashboard.js           │
│  └── ... (30+ script tags)           │
└──────────────┬───────────────────────┘
               │ fetch() calls
               ▼
┌──────────────────────────────────────┐
│     Single FastAPI Backend           │
│     (one process, all routes)        │
│                                      │
│  /auth/login                         │
│  /diagnostics/run                    │
│  /blueprints/generate                │
│  /payments/create                    │
│  /workflows/create                   │
│  /agents/deploy                      │
│  ... (everything in one app)         │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│         PostgreSQL (Supabase)         │
│         All tables in one schema      │
└──────────────────────────────────────┘
```

### Current Architecture (Microservices Era)

```
┌─────────────────────────────────────────────────────────────┐
│                    Internet / DNS                             │
│                                                              │
│  aivory.id → avry-website        (marketing)                │
│  dashboard.aivory.id → avry-user-dashboard                  │
│  admin.aivory.id → avry-admin-dashboards                    │
│  api.aivory.id → reverse proxy → backend services           │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              Reverse Proxy (Nginx/Traefik)                    │
│              SSL termination, path routing                    │
└───┬────────────────┬─────────────────┬──────────────────────┘
    │                │                 │
┌───▼────┐    ┌──────▼──────┐    ┌────▼─────────────────────┐
│Frontend│    │  Core API   │    │   Specialized Services    │
│ Layer  │    │             │    │                           │
│        │    │ avry-backend│    │ avry-diagnostics  :8082   │
│:9000   │    │    :8081    │    │ avry-blueprint    :8083   │
│:9001   │    │             │    │ avry-roadmaps     :8084   │
│:9002   │    │ • Auth      │    │ avry-payments     :8085   │
│        │    │ • Users     │    │ avry-console      :8086   │
│        │    │ • Routing   │    │ avry-workflows    :8087   │
│        │    │             │    │ avry-blog         :8088   │
└───┬────┘    └──────┬──────┘    │ avry-careers      :8089   │
    │                │           │ avry-zeroclaw     :8090   │
    │                │           └────┬─────────────────────┘
    │                │                │
    └────────┬───────┴────────────────┘
             │
    ┌────────▼────────────────────────────────────────────┐
    │                  Data Layer                           │
    │                                                      │
    │  ┌─────────────┐  ┌──────────┐  ┌───────────────┐  │
    │  │  Supabase   │  │ Midtrans │  │   OpenRouter   │  │
    │  │  (Auth+DB)  │  │(Payments)│  │   (LLM API)   │  │
    │  └─────────────┘  └──────────┘  └───────────────┘  │
    │                                                      │
    │  ┌─────────────┐  ┌──────────────────────────────┐  │
    │  │    n8n      │  │  Exchange Rate API            │  │
    │  │(Automation) │  │  (exchangerate-api.com)       │  │
    │  └─────────────┘  └──────────────────────────────┘  │
    └──────────────────────────────────────────────────────┘
```

### Communication Flow

```
User visits aivory.id
    │
    ▼
avry-website (Next.js SSR) renders homepage HTML
    │
    ├── Fetches exchange rate from /api/exchange-rate
    ├── Loads Midtrans Snap SDK (async)
    └── Checks localStorage for Supabase session
            │
            ▼
User clicks "Start Deep Diagnostic"
    │
    ▼
avry-website routes to /diagnostic page
    │
    ├── 12-question questionnaire (client-side)
    └── On submit → POST to avry-diagnostics service
            │
            ▼
avry-diagnostics validates JWT, runs scoring engine
    │
    └── Returns score, category, insights, recommendations
            │
            ▼
avry-website renders results with download-as-PNG option
    │
User clicks "Generate Blueprint" (requires payment)
    │
    ▼
avry-website → avry-payments → Midtrans Snap popup
    │
    └── On payment success → webhook → avry-payments updates user tier
            │
            ▼
avry-backend marks user as "has_blueprint" in Supabase
    │
    ▼
avry-user-dashboard shows Blueprint section (previously locked)
    │
    └── POST to avry-blueprint → generates architecture plan
```

---

## Frontend Deep Dive

### Technology Decisions

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Framework | Next.js 16 | Server-side rendering for SEO, App Router for clean routing, React Server Components for performance |
| React version | 19 | Latest stable with concurrent features, better hydration |
| Styling | Tailwind CSS v4 | Utility-first avoids specificity wars, design tokens via CSS variables, tree-shaking removes unused styles |
| TypeScript | 5.x (strict mode) | Catches bugs at compile time, self-documenting APIs |
| Fonts | next/font (Manrope, Inter Tight, JetBrains Mono) | Self-hosted, no FOIT/FOUT, optimized loading |
| Testing | Vitest + React Testing Library | Fast, compatible with React 19, browser-like DOM |
| Animation | CSS + IntersectionObserver | No runtime library overhead (removed GSAP dependency from bundle) |
| Payments | Midtrans Snap SDK | Required for Indonesian market (Midtrans team partnership) |
| Auth | Supabase JS client | Consistent with backend auth, automatic token refresh |

### Pricing Architecture

All pricing is defined in a single file (`lib/pricing.ts`) with these guarantees:
- Every product has a unique ID, canonical name, and authoritative price
- The UI, payment modal, and backend all consume this same source
- Prices cannot drift between what's displayed and what's charged
- Adding a product means adding it in one place

The `formatPrice()` function in `TranslationContext` transforms prices for display:
- English: `formatPrice(29)` → `"$29"`
- Indonesian: `formatPrice(29)` → `"Rp 464 rb"` (using live exchange rate)

The exchange rate API caches for 2 hours (ISR revalidation) and falls back to 16,000 IDR/USD if the external API is unavailable.

### Component Architecture

```
Homepage (app/page.tsx)
├── MidtransLoader (loads Snap SDK in background)
├── HomeNavbar
│   ├── BrandLogo
│   ├── LanguageToggle (EN | ID)
│   ├── NavLinks (Product, Company)
│   ├── AuthControls (Sign In / Welcome, user / Logout)
│   └── DashboardButton (role-aware routing)
├── HeroSection
│   ├── VideoBackground (autoplay, muted, loop)
│   ├── GridCanvas (5x8 animated overlay)
│   ├── RotatingSubheadline (6 messages, 4.5s interval)
│   └── CTAButton (ghost border, → /diagnostic)
├── InteractiveShowcase
│   ├── IntroBlock (heading + subtitle)
│   ├── ProductBlocks[5] (scroll-triggered opacity)
│   └── StickyDemoPanel (6 visualizations)
├── StatsSection
│   ├── StatCounters[5] (count-up on intersection)
│   └── LaserDividers (animated horizontal lines)
├── PricingSection (one-time, uses formatPrice)
├── SubscriptionSection (monthly, uses formatPrice)
├── CreditMarketplaceSection (credit packs, uses formatPrice)
├── PrivacySection (GDPR badges + expert guidance)
├── HomeFooter (5-column grid, real page links)
└── HomePageClient (login modal event listener)
```

---

## Backend Deep Dive

### Service Communication Pattern

All services follow the same pattern:
1. Frontend sends request with `Authorization: Bearer <supabase_jwt>` header
2. Service validates JWT signature against Supabase public key
3. Service extracts user_id, account_type, tier from JWT claims
4. Service checks if user is authorized for the requested operation
5. Service performs business logic
6. Service returns JSON response

No service trusts another service's response about user identity. Each validates independently.

### Database Strategy

All services share a single Supabase PostgreSQL instance but use **separate schemas/tables**:
- `auth.*` — Supabase-managed auth tables
- `public.users` — user profiles and metadata
- `public.diagnostics` — diagnostic results
- `public.blueprints` — generated blueprints
- `public.payments` — payment records
- `public.workflows` — workflow definitions
- `public.blog_posts`, `public.comments` — blog content
- `public.job_listings`, `public.applications` — careers content

Each service only reads/writes its own tables. Cross-service data is accessed via API calls, not direct database queries.

---

## Infrastructure Deep Dive

### Docker Strategy

Every service uses multi-stage Docker builds:

**Python services (FastAPI):**
- Stage 1: `python:3.11-slim` — install dependencies from requirements.txt
- Stage 2: Copy app code, set non-root user, expose port, run uvicorn

**Next.js applications:**
- Stage 1: `node:20-alpine` — install npm dependencies (cached layer)
- Stage 2: Copy source, run `next build` with `output: standalone`
- Stage 3: `node:20-alpine` — copy only standalone output + static files + public assets

The standalone output shrinks the Next.js production image from ~1.5GB (full node_modules) to ~150MB.

### Environment Configuration

Each service documents its required environment variables in `.env.example`. Common patterns:

```
# Every service needs:
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...  (backend services)
# or
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...  (frontend apps)

# Service-specific:
PORT=808X
DATABASE_URL=postgresql://...
```

Frontend apps use `NEXT_PUBLIC_*` prefixed variables (inlined at build time). Backend services use regular environment variables (read at runtime).

### VPS Layout

```
VPS (Ubuntu)
├── Nginx (reverse proxy, SSL)
│   ├── aivory.id → localhost:9000
│   ├── dashboard.aivory.id → localhost:9001
│   ├── admin.aivory.id → localhost:9002
│   └── api.aivory.id → localhost:8081 (with path routing to services)
├── Docker containers
│   ├── avry-website:9000
│   ├── avry-user-dashboard:9001
│   ├── avry-admin-dashboards:9002
│   ├── avry-backend:8081
│   ├── avry-diagnostics:8082
│   ├── avry-blueprint:8083
│   ├── avry-roadmaps:8084
│   ├── avry-payments:8085
│   ├── avry-console:8086
│   ├── avry-workflows:8087
│   ├── avry-blog:8088
│   ├── avry-careers:8089
│   └── avry-zeroclaw:8090
└── External services
    ├── Supabase (managed, cloud)
    ├── Midtrans (payment gateway)
    ├── OpenRouter (LLM API)
    └── n8n (self-hosted on same VPS or separate)
```

---

## How to Work With the New Structure

### For frontend developers (website)

```bash
git clone https://github.com/ClementHansel/avry-website.git
cd avry-website
cp .env.example .env.local
# Fill in Supabase + Midtrans keys
npm install
npm run dev
# → http://localhost:9000
```

You only need the website repo. Point `NEXT_PUBLIC_API_BASE_URL` at staging or local backend.

### For frontend developers (dashboard)

```bash
git clone https://github.com/ClementHansel/avry-user-dashboard.git
cd avry-user-dashboard
cp .env.example .env.local
npm install
npm run dev
# → http://localhost:9001
```

### For backend developers

```bash
git clone https://github.com/ClementHansel/avry-backend.git
cd avry-backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Fill in database URL + JWT secret
uvicorn app.main:app --host 0.0.0.0 --port 8081 --reload
# → http://localhost:8081/docs (Swagger)
```

### For deploying a single service update

```bash
cd avry-payments
git pull origin main
docker build -t avry-payments .
docker stop avry-payments && docker rm avry-payments
docker run -d --name avry-payments -p 8085:8085 --env-file .env avry-payments
```

### For running the full platform locally

Clone all repos into one directory and use each service's docker-compose:
```bash
mkdir aivory-platform && cd aivory-platform
git clone https://github.com/ClementHansel/avry-backend.git
git clone https://github.com/ClementHansel/avry-website.git
# ... (all repos)

# Start everything
for dir in avry-*/; do (cd "$dir" && docker compose up -d); done
```

---

## Verification & Quality Assurance

### Build Verification

| Check | Result |
|-------|--------|
| `avry-website` builds with `next build` | ✅ Zero TypeScript errors |
| All 15 routes compile and pre-render | ✅ |
| Exchange rate API route responds | ✅ (2h ISR cache) |
| Midtrans SDK loads without errors | ✅ |
| Docker image builds successfully | ✅ |

### Test Results (avry-website)

| Test Category | Passing | Failing | Notes |
|--------------|---------|---------|-------|
| Business logic (`lib/`) | 156/156 | 0 | All pricing, auth, payment, config, helpers |
| Auth components | 72/72 | 0 | Login modal, auth guard |
| Blog components | Pass | 0 | Reactions, comments, WebSocket |
| Careers components | Pass | 0 | Application form, WebSocket |
| UI visual assertions | 286/388 | 102 | Old design snapshots need updating |

The 102 failing tests are **visual assertion tests** that check exact CSS classes and text from the pre-integration design (e.g., "renders section on white background" when we moved to new color scheme). All functional/business logic tests pass. These visual tests should be updated to match the new design.

### All Repos Pushed

| Repository | Push Status |
|-----------|-------------|
| aivory | ✅ Clean history (no secrets) |
| avry-website | ✅ 168 files |
| avry-backend | ✅ 40 files |
| avry-user-dashboard | ✅ 401 files |
| avry-admin-dashboards | ✅ 423 files |
| avry-vps | ✅ 242 files |
| avry-blog | ✅ Pushed |
| avry-blueprint | ✅ Pushed |
| avry-careers | ✅ Pushed |
| avry-console | ✅ Pushed |
| avry-diagnostics | ✅ Pushed |
| avry-n8n | ✅ Pushed |
| avry-payments | ✅ Pushed |
| avry-roadmaps | ✅ Pushed |
| avry-shared-libs | ✅ Pushed |
| avry-vps-monitoring | ✅ Pushed |
| avry-workflows | ✅ Pushed |
| avry-zeroclaw | ✅ Pushed |

---

## Next Steps

| Priority | Task | Owner |
|----------|------|-------|
| High | Rotate the leaked OpenRouter API key | DevOps |
| High | Update VPS deployment scripts to pull from new repos | DevOps |
| High | Set up CI/CD (GitHub Actions) per repo | DevOps |
| Medium | Update 102 visual assertion tests to match new design | Frontend |
| Medium | Set up staging environment with per-service deploys | DevOps |
| Medium | Add health check endpoints to all backend services | Backend |
| Low | Add GSAP back for hero parallax (currently CSS-only) | Frontend |
| Low | Port the team's `InteractiveGrid` component (app integrations showcase) | Frontend |
| Low | Add the team's `ContactModal` component to the pre-footer CTA | Frontend |

---

## Appendix: Technology Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| Marketing Website | Next.js | 16.2.6 |
| React | React | 19.2.4 |
| Styling | Tailwind CSS | 4.x |
| Language | TypeScript | 5.x |
| Backend Framework | FastAPI | Latest |
| Backend Language | Python | 3.11+ |
| Database | PostgreSQL (Supabase) | 15 |
| Authentication | Supabase Auth | Latest |
| Payments | Midtrans Snap | v2 |
| LLM Provider | OpenRouter | GPT-4, Claude |
| Automation | n8n | Self-hosted |
| Container Runtime | Docker | 24+ |
| Container Orchestration | Docker Compose | v2 |
| Reverse Proxy | Nginx | Latest |
| Version Control | Git + GitHub | — |
| Testing (Frontend) | Vitest + React Testing Library | 2.x |
| Testing (Backend) | Pytest | Latest |
| CI/CD | GitHub Actions | (to be set up) |

---

*Document prepared June 7, 2026.*  
*For questions, refer to the main repository README at https://github.com/ClementHansel/aivory or contact the engineering team.*
