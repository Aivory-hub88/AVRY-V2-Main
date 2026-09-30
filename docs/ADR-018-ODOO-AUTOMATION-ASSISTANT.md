# ADR-018: Odoo Automation Assistant (natural language to Odoo automation rules)

**Status:** Proposed (2026-09-25). Nothing implemented.
**Date:** 2026-09-25
**Related:** [ADR-012](ADR-012-CERVEAU-ODOO-SHARED-MCP.md) (shared Od-MCP), [ADR-008](ADR-008-CERVEAU-MULTI-AGENT-COLLABORATION.md) (per-agent-type identity), [CERVEAU-ODOO-UI-WIDGET-PLAN](CERVEAU-ODOO-UI-WIDGET-PLAN.md), `services/aivory-cerveau-odoo/` (the `aivory_cerveau_odoo` addon), `backend/vps-bridge/server.js` (`WORKFLOW_CLARIFY_INSTR`, the Workflow Copilot clarify pattern).

---

## 1. Decision in one paragraph

A user describes an automation in plain language ("when an invoice is 7 days overdue, email the customer and cc the salesperson"). A Cerveau skill asks follow-up questions until a typed **automation spec** is complete, shows a plain-language preview and how many records the rule matches today, then creates a real Odoo `base.automation` rule. The rule is always created **inactive** and a human turns it on. The agent never writes raw `ir.actions.server` / `base.automation` values. It emits a spec. The spec goes through an allowlist validator that rejects anything that runs Python. Two execution paths: an `aivory_cerveau_odoo` addon method (preferred, needs no admin key) and an Od-MCP tool (fallback for Odoo Online, where custom addons can't be installed).

## 2. What exists today (verified 2026-09-25)

| Fact | How verified |
|---|---|
| Od-MCP v0.3.10 (live) has **no** automation-specific tool. Tools: search/read/read_group/report, 3-step gated write, `odoo_create/update/delete/create_batch`, `odoo_execute_method` (allowlisted). | `config/tools.json`, `src/handler.rs` at `origin/main` `ee7c01f` |
| The gated write path accepts **any** model name that passes `valid_model_name` (charset/length only). No model denylist. `execute_method` blocks only `create/write/unlink` by name. | `src/config.rs:145`, `src/odoo_client.rs` `execute_method` |
| On Odoo 19, `ir.actions.server` CRUD is granted to `base.group_system` only, and the `code` field is `groups='base.group_system'`. So **any credential that can create an automation can also write Python code**. Odoo's permission model can't separate "may create an email rule" from "may run Python". | `odoo/addons/base/security/ir.model.access.csv:107`, `ir_actions.py:643` in the `aivory-odoo-demo` container |
| Server-action states on Odoo 19: `object_write, object_create, object_copy, next_activity, mail_post, sms, followers, remove_followers, code, webhook, multi`. | live `_description_selection` on `demo` |
| Python-evaluating fields besides `state=code`: `ir.actions.server.evaluation_type='equation'` (the value is a Python expression), `base.automation.record_getter` (safe_eval, used by `on_webhook`), `filter_domain` / `filter_pre_domain` (safe_eval domain strings). | `ir_actions.py:682`, `base_automation.py:620` |
| Triggers on Odoo 19: `on_stage_set, on_user_set, on_tag_set, on_state_set, on_priority_set, on_archive, on_unarchive, on_create, on_create_or_write, on_write (deprecated), on_unlink, on_change, on_time, on_time_created, on_time_updated, on_message_received, on_message_sent, on_webhook`. | `base_automation.py:156` |
| odoo-demo: **`base_automation` is not installed.** `aivory-agent` groups: Accounting/Invoicing, Contact/Creation, Project Admin, Purchase Admin, Role/User, Sales Admin. No Settings, so it can't create automations today (correct, least-privilege). | `odoo shell` on `demo` |
| Cerveau already has a clarify pattern (Workflow Copilot: at most 1-2 questions per turn, focused on trigger/target/data/conditions, match the user's language). | `backend/vps-bridge/server.js:817` |

### 2.1 Side finding, independent of this ADR (RESOLVED: Od-MCP v0.4.0, live as 0.4.2)

> **Update 2026-09-26:** the rows above describe v0.3.10. Od-MCP v0.4.0 (`e2c2be2`) added the default write denylist below (including `base.automation`, with per-instance `write_allow_models` opt-in) and per-instance `allowed_methods`. v0.4.2 is live and its audit log shows `write_denied` refusals. Path B in §4 therefore also needs `write_allow_models: ["base.automation", "ir.actions.server"]` on that instance. The original finding is kept below for the record.

Because generic gated writes have no model denylist, a tenant who connects Od-MCP with an **admin** Odoo key (self-serve connect allows this; the key is theirs) gives every agent on that tenant a path to create `ir.actions.server` with `state=code`, `ir.cron`, or change `res.users` groups. The only thing in the way is the approval gate, and the approver sees a JSON payload. **Recommendation:** add a default model denylist to Od-MCP gated writes (`ir.*`, `base.automation`, `res.users`, `res.groups`, `res.company`, `ir.config_parameter`, `ir.module.module`), overridable per instance only by an explicit config flag. This is P0 below and ships whether or not the assistant goes ahead.

## 3. The automation spec (the only thing the LLM produces)

```jsonc
{
  "name": "Overdue invoice reminder (7 days)",      // stored as "[Aivory] <name>"
  "model": "account.move",                          // from MODEL_ALLOWLIST
  "trigger": { "type": "on_time", "date_field": "invoice_date_due",
               "delay": 7, "delay_unit": "day", "mode": "after" },
  "filter": [["move_type","=","out_invoice"],["state","=","posted"],
             ["payment_state","in",["not_paid","partial"]]],   // literal domain only
  "actions": [
    { "type": "mail_post", "template_ref": 42, "post_as": "email" },
    { "type": "next_activity", "activity_type": "mail.mail_activity_data_call",
      "summary": "Follow up overdue invoice", "due_in_days": 2,
      "assign_to": { "field": "invoice_user_id" } }
  ]
}
```

**Validator (deterministic code, never the LLM):**

- `model` is in `MODEL_ALLOWLIST` (P1: `crm.lead, sale.order, account.move, res.partner, project.task, purchase.order`) and exists on the instance.
- `trigger.type` is in the P1 set: `on_create, on_create_or_write, on_stage_set, on_state_set, on_user_set, on_time, on_time_created, on_time_updated`. Denied: `on_webhook` (Python `record_getter`), `on_change` (UI-side code path), `on_unlink`.
- `filter` is a literal JSON domain: every leaf is `[field, op, literal]`, every field exists on the model (checked against `fields_get`), no string expressions (`context_today()`, `uid`, `ref(...)`). A relative-date need is expressed through `on_time`, not the domain.
- `actions[].type` is in the P1 set: `mail_post` (existing template only), `next_activity`, `object_write` with `evaluation_type='value'` only, `followers`. Denied: `code`, `object_write` with `equation`, `object_create`, `object_copy`, `sms` (cost), `webhook` (exfil; P3 with a URL allowlist), `multi` (P3, each child validated).
- The executor builds `vals` from the spec itself. The spec keys map to a fixed set of fields, so `code`, `record_getter`, `evaluation_type` and `value` expressions can't be reached even if the LLM adds them.
- It's always created with `active=False`.

## 4. Two execution paths

| | A. Addon method (preferred) | B. Od-MCP tool (fallback) |
|---|---|---|
| Where the validator runs | Inside the customer's Odoo: `aivory.automation.create_from_spec(spec)` in `aivory_cerveau_odoo`, `sudo()` after validation | In Od-MCP (Rust), before a normal JSON-2 create |
| Credential the agent holds | The existing least-privilege agent key plus a new group **"Aivory: Automation Author"**, which grants only this method | An admin (`group_system`) key, which can also do everything in §2.1 |
| Works on | Self-hosted, Odoo.sh | Also Odoo Online |
| Called via | `odoo_execute_method` allowlist entry `aivory.automation.create_from_spec` (plus `…set_active`, `…list_mine`) | New tools `odoo_automation_preview` / `odoo_automation_create` |
| Verdict | **Default.** No admin key ever leaves the customer. | Opt-in per instance, with a UI warning. Only if Odoo Online demand is real. |

Path A's validator is the source of truth. Path B, if built, ports the same rules and the same fixture suite (§6).

## 5. Conversation flow (Cerveau skill `odoo-automation-author`)

1. **Parse** the request into a partial spec (LLM, structured output against the §3 schema).
2. **Clarify** only the missing required slots, at most 2 questions per turn, in the user's language. Slot order: model/record type, trigger, condition, action, recipient. When a slot has a sensible default, suggest it ("the salesperson on the invoice?") instead of asking an open question.
3. **Ground** against the live instance: fields exist (`odoo_get_model_metadata`), the template exists (`odoo_search_read` on `mail.template` for the model), and the **match count** (`odoo_count` with the filter) so the preview can say "matches 14 invoices today".
4. **Preview** in plain language plus the validator result. Nothing has been written yet.
5. **Create inactive** (approval tier: medium; it has no effect until turned on). A chatter note goes on the rule ("Created by <agent label> from request: …").
6. **Activate** only through human action: the user toggles it in Odoo, or approves an `irreversible`-tier `set_active` call. Deactivating (the rollback) is always allowed without approval.

Hosting: ship as a skill + tool bundle attached to `office_assistant` for the pilot. Don't add a sixth agent type until usage shows it's needed (each type carries its own risk profile, see ADR-008's 2026-09-06 addendum).

## 6. Phases

| Phase | Scope | Exit gate |
|---|---|---|
| **P0** | (a) Od-MCP model denylist from §2.1, deployed. (b) Install `base_automation` on odoo-demo, then re-freeze golden. (c) Build 3 reference rules by hand in the Odoo UI (overdue invoice email, new lead activity, SO confirmed follower) and record their `vals`. (d) Spec JSON schema + validator + fixture suite: every denied state/trigger/expression rejected, 3 references accepted. | Fixtures green; denylist live and verified with an admin-key probe. |
| **P1** | Path A: addon method + "Automation Author" group + `set_active` / `list_mine` + chatter note; Od-MCP allowlist entries on the demo instance only. | Rules created from spec match the hand-built references field-for-field; the agent key without the group is refused. |
| **P2** | Cerveau skill: parse, clarify, ground, preview, create. Eval set of 20 NL requests (EN + ID) in `evals/odoo-automation/`. | ≥ 16/20 produce the correct spec within 3 clarify turns; 0/20 produce a spec the validator should have rejected but didn't. |
| **P3** | Webhook actions with a URL allowlist, `multi`, new mail-template creation, dashboard list of `[Aivory]` rules. Path B only if an Odoo Online customer needs it. | Per-feature. |

## 7. Open questions for the product owner

1. Path B (admin key, Odoo Online): do we build it at all, or is "Odoo Online: not supported" acceptable for enterprise?
2. Pilot host: `office_assistant`, or does this belong with whoever does Odoo onboarding (`customer_service`)?
3. Should the create step (inactive rule) need approval, or only activation? This ADR proposes activation only.
4. `ODOO_MCP_ALLOWED_SIDE_EFFECT_METHODS` is still unset on live (open item from the Od-MCP 0.3.x work). P1 needs at least the three `aivory.automation.*` entries for the demo instance.

## 8. Non-goals

- Server actions with Python code, or anything that evaluates user- or LLM-written expressions.
- Editing automations the Assistant didn't create (only `[Aivory]`-prefixed rules owned by the method are listed or toggled).
- Replacing n8n / Workflow Copilot for cross-app automations. This ADR covers rules that live inside Odoo.
