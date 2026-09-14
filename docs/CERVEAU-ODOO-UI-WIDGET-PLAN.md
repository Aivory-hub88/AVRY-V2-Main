# Cerveau × Odoo Native UI Widget — Planning & Scaffold Scope

**Status:** scaffold built and manually verified — architecture agreed 2026-09-14, target Odoo version picked 2026-09-14, module written at `services/aivory-cerveau-odoo/`, installed and round-trip-tested on a throwaway local Odoo 18 instance 2026-09-14 (passed 3x; two real bugs found and fixed along the way, see below). Tenant/agent identity (open question #3) resolved and re-verified the same day, then hardened further the same day so the agent roster is fetched live from a new backend endpoint instead of hardcoded (see "Agent roster" below) — **that new endpoint (`backend/avry-backend/app/routes/agent_roster.py`) is written and registered locally but not yet deployed**, so production Odoo installs currently fall back to a built-in list until it ships. Not yet tested against the real `tencent-vps` Cerveau instance.
**Created:** 2026-09-14
**Related:** `CERVEAU-ODOO-INTEGRATION-PLAN.md` (a completely different concern — Cerveau calling *into* Odoo's data via MCP for CRUD; this plan is the reverse direction: surfacing Cerveau's chat *inside* Odoo's own web client), `ODOO-MCP-SETUP-GUIDE.md`, `ADR-006-CERVEAU-CLIENT-DEPLOYMENT-API.md` (custom MCP server registration — the mechanism the data-access side already uses and this plan does not touch)

## Goal

A tenant running Odoo should be able to install a Cerveau addon module and get a Cerveau agent chat panel embedded natively in Odoo's own web client (systray icon, top-right — same row as Odoo's Discuss/Activities/user-menu icons), not a bolted-on iframe. This is a **UI surface** problem, distinct from `CERVEAU-ODOO-INTEGRATION-PLAN.md`'s data-access problem — a tenant could have one without the other (chat widget with no Odoo MCP connected, or Odoo MCP connected with no chat widget).

## Why this shape, not something else — decided in chat 2026-09-14

Researched first, not guessed: this is an established pattern in the Odoo ecosystem, not something novel. Precedent apps already ship exactly this UX — [`jd_ai_odoo_chat` / "AI Chat Assistant: Odoo Expert"](https://apps.odoo.com/apps/modules/19.0/jd_ai_odoo_chat) puts an AI icon in the systray with a configurable backend provider (including "Other" for a custom endpoint), and [`ais_iframe_widget`](https://apps.odoo.com/apps/modules/19.0/ais_iframe_widget) shows the iframe-embed alternative also has real precedent.

**Decision: native OWL systray widget, not an iframe embed**, for the reasons below — but structured so the iframe-vs-native choice can still be deferred without wasted work (see "Layering" below).

| | Native OWL component | Iframe embed |
|---|---|---|
| Feel | First-party, matches Odoo's own chrome/theme | Visibly bolted-on |
| Auth reuse | Odoo's logged-in session used directly | Needs its own session/token passthrough |
| Cross-origin | None (same-origin, own controller) | Real CORS/cross-origin complexity for anything beyond read-only display (file upload, clipboard, etc.) |
| Build cost | Higher — Odoo module packaging, OWL API differs across 17→18→19, needs per-version maintenance | Lower — host one page, embed it, done in days |
| Precedent | Matches how paid competitors already ship this | Also has precedent, but weaker fit for a "native Odoo app" story |

Given Aivory's enterprise/white-label positioning ([[aivory-target-market-enterprise]]), "installs like a real Odoo app" is the right target, not "opens a webpage in a box."

## Architecture — 3 layers, agreed in chat

1. **Frontend — OWL component registered to the systray.** Standard Odoo module structure (`__manifest__.py`, `static/src/js`, `static/src/xml`). Icon click opens a slide-over chat panel. Odoo 17/18/19 all use OWL, but the systray registration API has drifted across versions ([Odoo 17 guide](https://medium.com/cybrosys/how-to-add-an-icon-in-systray-in-odoo-17-5e23085ddddf), [Odoo 18 guide](https://medium.com/cybrosys/how-to-add-an-icon-in-systray-in-odoo-18-436c1ecbd3f1)) — **the scaffold session must pick one target version first** (see Open Questions) rather than trying to write version-agnostic code from the start.
2. **Backend — a thin Python `http.Controller` inside the same addon module**, acting as the *only* thing that talks to Cerveau. The browser never calls Cerveau directly. This gets us:
   - No CORS problem (browser → same-origin Odoo controller → server-side call to Cerveau)
   - No Cerveau bearer token ever reaching the browser
   - One place to do tenant-identity mapping (see below) before the request leaves Odoo's server
3. **Tenant identity mapping.** Odoo's `res.company` (or `res.users`, TBD — see Open Questions) id becomes the tenant identifier handed to Cerveau, consistent with the existing `t_<tenant>.<agent_type>` scoping convention ([[cerveau-memory-scoping-and-rag]]). This mapping needs to be configurable per-install (an Odoo System Parameter or a settings field on `res.config.settings`), not hardcoded, since each client's Odoo↔Cerveau tenant pairing will differ.

Cerveau's own transport is already confirmed live and reachable (`POST /webhook`, `GET /ws/chat`, `GET /api/*` — seen directly in `zeroclaw-cerveau.service` startup banner on `tencent-vps`, 2026-09-14). Whether the controller uses `/webhook` (simple request/response) or `/ws/chat` (real-time streaming) is an open question below.

### Layering — why iframe-vs-native can still be deferred

The controller (layer 2) and tenant-mapping (layer 3) are identical regardless of what layer 1 turns out to be. If the OWL systray widget (layer 1) proves too slow to ship for a given Odoo version, an iframe pointed at a hosted chat page can call the *same* controller endpoint without redoing layers 2–3. **Scaffold layers 2–3 first, thinnest-possible layer 1 second** (even a static placeholder panel), so the fallback option is never a wasted-work situation.

## Scope for THIS session: scaffold only

Explicitly a skeleton, not a production module. Concretely:

- [x] Odoo addon module skeleton: `__manifest__.py`, `__init__.py`, standard directory layout (`controllers/`, `models/`, `static/src/js`, `static/src/xml`) — at `services/aivory-cerveau-odoo/addons/aivory_cerveau_odoo/` (no `security/` needed yet: the module only extends `res.config.settings`, no new model)
- [x] One systray icon registered (`static/src/js/systray_icon.js` + `static/src/xml/systray_icon.xml`), opens a panel with a message list and input (not fully empty, but no Cerveau-specific chrome beyond the round trip)
- [x] One backend controller route `/aivory_cerveau/chat` (`controllers/main.py`) that accepts a message, calls Cerveau's `/webhook`, returns the reply — tenant id hardcoded to `scaffold-tenant` per open question #3 below
- [x] A `res.config.settings` field for the Cerveau base URL and a shared-secret field (`models/res_config_settings.py`, `views/res_config_settings_views.xml`) — tenant-mapping field still a placeholder (open question #3)
- [x] Manual verification: **done 2026-09-14** on a throwaway local Odoo 18 + Postgres 15 (Docker, steps in `services/aivory-cerveau-odoo/README.md`). Installed cleanly, systray icon renders, panel opens, a typed message round-trips through `/aivory_cerveau/chat` and the controller's config-check reply ("Cerveau base URL is not configured...") renders back in the panel. Stopped short of hitting the real `tencent-vps` Cerveau instance — that needs `CERVEAU_WEBHOOK_SECRET`, which isn't available locally and touches live production infra, so it wasn't attempted without it being asked for explicitly. Two real bugs found and fixed during this pass (see below); containers torn down after.

**Explicitly NOT in scope for this session:** real-time streaming (`/ws/chat`), production auth/token handling between the controller and Cerveau, multi-company tenant-mapping logic, packaging for the Odoo Apps Store, visual polish/theming, error-state UX, or support for more than one Odoo version.

### Bugs found and fixed during manual verification (2026-09-14)

1. **Settings view xpath didn't match Odoo 18.** The scaffold originally targeted `//div[hasclass('settings')]` (an older Odoo settings-page structure). Odoo 18's `base.res_config_settings_view_form` is an empty `<form>` — the real `app`/`block`/`setting` tag structure (used by `base_setup` and every first-party settings panel) has to be injected via `//form` position `inside`. Fixed in `views/res_config_settings_views.xml`.
2. **`useService("rpc")` no longer exists in Odoo 18.** The web framework removed the `rpc` service; the replacement is importing the `rpc` function directly from `@web/core/network/rpc` and calling it as a plain function. This one initially crashed the whole navbar (`OwlError` in the systray slot, blank backend page) until fixed in `static/src/js/systray_icon.js`.

### New information for the open questions below

Cerveau's real gateway auth (confirmed live, `docs/CERVEAU-STATUS.md`) is **`X-Webhook-Secret` + `X-Tenant-Id`/`X-Agent-Type` headers**, not the `x-bridge-key` pattern the scaffold's controller guessed at in open question #4 below — that guess was wrong and needs correcting before this goes past scaffold stage.

## Open questions for the scaffold session to resolve (not pre-decided here)

1. ~~**Target Odoo version first.**~~ **Decided 2026-09-14: Odoo 18** — current stable, most complete systray/OWL documentation, likely version for tenants when this ships. No dev Odoo instance has been set up yet; the scaffold module is written against Odoo 18's OWL/registry API but unverified against a running instance.
2. **`/webhook` vs `/ws/chat`.** Simple request/response is far less scaffold work; streaming is a better long-term UX (typing/partial-response feel) but adds real complexity (WS auth, reconnect handling). Recommend starting with `/webhook` for the scaffold and treating `/ws/chat` as a follow-up.
3. ~~**Tenant-identity source.**~~ **Decided 2026-09-14, in chat: identity follows the Cerveau *agent* the tenant is bound to, not a raw Odoo field.** Rather than deriving `X-Tenant-Id` from `res.company.id`/`res.users.id`, the admin explicitly sets two things in Settings: a **Cerveau Tenant ID** (still the "dedicated field, admin sets it during setup" option — no magic mapping) and a **Cerveau Agent** picker. The agent selection becomes the `X-Agent-Type` header. Implemented and verified 2026-09-14 in `models/res_config_settings.py` (`aivory_cerveau_tenant_id`, `aivory_cerveau_agent_type`), `views/res_config_settings_views.xml`, and `controllers/main.py`.

   **Considered and explicitly declined, same session:** pivoting the whole tenant/agent/auth model onto the *already-existing* `POST /api/v1/agent-api/message` + `X-Aivory-Api-Key` mechanism in `backend/avry-backend/app/routes/agent_api_keys.py` (`ADR-006-CERVEAU-CLIENT-DEPLOYMENT-API.md` Part A) — a key created in the Aivory dashboard is already bound to one `agent_type`, which would have made a separate Odoo-side tenant-id/agent picker unnecessary and come with tier-gating/rate-limiting/credit-checks for free. Asked in chat; the user chose to stay on the direct-to-Cerveau `/webhook` path instead. Worth remembering if this scaffold's direct-`/webhook` auth (open question #4) turns out to be a dead end in practice.

   **Agent roster, and the "no manual naming" follow-up (2026-09-14):** the picker's options were initially a hardcoded Python list copied from `frontend/avry-user-dashboard/lib/workspaceAccess.ts`'s `AGENT_DISPLAY_NAMES` (Geno/`autonomous`, Teo/`customer_service`, Lex/`leads_qualifier`, Finn/`finance_invoice_ops`, Ofira/`office_assistant` — verified against the actual current codebase, not memory, since the user's first recollection named a nonexistent "Linn"; agreed to keep Finn after checking). To stop the naming from being maintained by hand in yet a third place, added `GET /api/v1/agent-roster` (`backend/avry-backend/app/routes/agent_roster.py`, public/unauthenticated, static reference data) as a **new canonical source**, and made the Odoo addon's `aivory_cerveau_agent_type` selection fetch it live (`_fetch_agent_type_selection()` in `res_config_settings.py`, 5-minute in-process cache, 3s timeout) instead of hardcoding. A small hardcoded `FALLBACK_AGENT_TYPE_SELECTION` still exists purely so the settings page doesn't break if the roster call fails — verified this actually happens correctly (the real endpoint isn't deployed yet, so every local test hit it and fell back cleanly, logging a warning). **Not yet done:** deploying `agent_roster.py` to production (registered in `app/main.py` locally, not shipped), and pointing `frontend/avry-user-dashboard`'s `AGENT_DISPLAY_NAMES` and the backend's other `AGENT_TYPES` sets (`agent_profiles.py`, `telegram_service.py`) at this new roster instead of their own independent copies — those still exist untouched, so `agent_roster.py` is a fourth copy today, not yet a true single source of truth network-wide, only for this Odoo addon once deployed.
4. **Auth from the Odoo controller to Cerveau.** ~~A per-install shared secret... `x-bridge-key`...~~ **Partially resolved 2026-09-14:** the live gateway actually expects `X-Webhook-Secret` + `X-Tenant-Id`/`X-Agent-Type` headers (confirmed in `docs/CERVEAU-STATUS.md`), not `x-bridge-key` — fixed in the controller (2026-09-14, verified against a real settings round trip). Still open: where the per-tenant `X-Webhook-Secret` value should live on the Odoo side (System Parameter set manually per install vs. something provisioned automatically), and how it maps to `CERVEAU_WEBHOOK_SECRET` on the Cerveau side.
5. **Whether to reuse any Od-MCP research.** `CERVEAU-ODOO-INTEGRATION-PLAN.md` already solved "how does Cerveau read/write Odoo data" via custom MCP server registration — worth checking whether that plan's tenant/instance conventions should inform this one's tenant-mapping field, so a single Odoo install doesn't end up with two independent, inconsistent tenant-id schemes.
