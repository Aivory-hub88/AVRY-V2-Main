# Aivory Cerveau — Product Overview

*A plain-language look at what Cerveau is and what it can do today. For engineering detail, see `docs/CERVEAU-TECHNICAL-REFERENCE.md`.*

## What is Cerveau?

Cerveau ("brain" in French) is the engine behind Aivory's deployable AI agents — the piece of technology that lets a customer's agent actually connect to their real business tools (Gmail, an ERP system, a support desk) and take real action, safely, rather than just answering questions in a chat window.

It's built on a battle-tested open-source foundation that already runs lean and reliable in Aivory's own production systems, and it's been engineered from the ground up for one hard requirement: many different customers' agents, running side by side, with zero risk of one customer's data or actions ever touching another's.

## What it can do today

**Connect to the tools a business already uses.** An agent can read and act on:
- Gmail and Google Calendar
- Trello and Linear (project/task management)
- ERPNext and Odoo (full business-system access — sales orders, invoices, customers, inventory)
- Zendesk, HubSpot, Asana, Slack (as data sources the agent can act on)
- Microsoft Word, Excel, and PowerPoint files
- The web, for lookups and research
- PDFs, for reading and extraction

Connecting is a one-click authorization for most of these — the same familiar "sign in with Google"-style flow. For Odoo specifically (and, in future, SAP-class systems), where no such one-click option exists in the market today, a customer's own IT team can point their instance at Cerveau directly.

**Take real action, without unsupervised risk.** This is the part that matters most for trust: every action that can't be undone — sending an email, posting an invoice, deleting a record — stops and asks a human first, every single time. There is no setting that turns this off. Read-only lookups and routine internal notes happen automatically; anything irreversible waits for a real "yes."

**Ask for approval wherever the business already works.** Today, that approval request can reach a business through:
- A dedicated Approvals page in the Aivory dashboard (works for every customer, always)
- A Slack notification with a link to approve or deny
- A message posted directly into the customer's own Odoo internal chat

Support for approving directly from Telegram and Discord, with a single tap, is designed and next in line to build.

**Deploy the agent where the business's people and customers already are.** An agent can be reached through Telegram, a Slack app, Discord, or a plain API — no coding required to set one up. Every interaction is designed to work through natural conversation, not commands only a developer would know how to type — because most Aivory customers aren't coders.

**Do multi-step, cross-system work reliably.** For a small number of genuinely multi-step business processes — like routing an approved invoice into notifications automatically — Cerveau hands off to a dedicated automation layer that guarantees the steps happen in order, every time, rather than leaving that reliability up to the AI model alone.

## How much does this cost to run?

Efficiency was a design requirement, not an afterthought. A real load test simulating 500 customers cost about **$0.004 per active customer** in AI usage, and the underlying engine idles at a few megabytes of memory per instance — small enough that infrastructure cost is not a limiting factor as Aivory grows its customer base.

## Who is this for today?

- Every plan gets an agent with real toolkit connections and the approval-gated safety model described above.
- **Pro plan and above** unlocks connecting a customer's own custom systems (like Odoo) and deploying via a raw API.
- **Enterprise plan** unlocks the Office Assistant agent type specifically.

## How mature is this, honestly?

Cerveau is not an early prototype. It has been running continuously in real production infrastructure for months, has survived and recovered from a real production incident, has been load-tested against real (if synthetic) traffic at meaningful scale, and every integration listed above has been individually verified end-to-end against the real third-party service it connects to.

What hasn't happened yet: **routing real, paying customers' existing Telegram/Slack/WhatsApp agents onto this engine at scale.** The newest integrations (Gmail/Calendar/Trello/Linear, ERPNext, Odoo) have so far been proven with test accounts, not yet with a live customer's actual data flowing through them day to day. That cutover — moving real customer traffic over from the previous system — is the next major milestone, not a future one still far off.

## What's coming next

In rough priority order:
1. **One-tap approve/deny from Telegram and Discord** — removing the need to switch to the dashboard for the fastest-moving businesses.
2. **Cutting real customer traffic over** from the previous agent system to Cerveau, agent type by agent type.
3. **SAP connectivity**, once the underlying integration approach is validated (the same way Odoo was).
4. **Voice**, as a way to reach an agent — not yet started.

## The bottom line

Cerveau gives an Aivory customer's agent the ability to actually *do* things in their real business systems — not just talk about them — while keeping every irreversible action gated behind a real human's approval, delivered wherever that human already works. It's built to be cheap to run at scale, and it's already carrying real production weight; the work ahead is expanding what it's connected to and bringing real customers onto it, not proving the foundation works.
