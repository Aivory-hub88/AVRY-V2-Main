# Cerveau handoff packet

Status: DRAFT (2026-11-09), Phase 1 of `CERVEAU-NEW-AGENTS-PLAN.md`.
Pattern borrowed from GojiberryAI Sales OS (plan §8); fields are ours.

## Why

`team_handoff(to, text)` and `team_delegate` carry free text (ADR-021 §3). When
the text is a loose paragraph, the receiver re-derives what the sender already
knew, or guesses what is missing. A packet is a fixed set of labelled lines
inside that same `text`. **No tool, backend or room change is needed**: it is a
convention enforced by the skill bundles and checked by tests/evals.

## Rules

1. Use the packet whenever the handoff moves a piece of work (a lead, a PO, a
   report, a campaign). A one-line "FYI" does not need one.
2. Every line is `key: value`. Unknown value = `[NEED: what is missing]`.
   **Never guess a value to fill a line.**
3. `source` is mandatory: system + record id/filter + period, so the receiver
   can re-check without asking.
4. Carry evidence forward. The receiver must not redo what the packet states;
   it may challenge it by naming the line.
5. Keep it under ~15 lines. Put long output in a file/Sheet/Doc and link it.
6. Status words are exact: `drafted`, `queued`, `awaiting approval`, `done`.
   Never write `sent` or `done` for an action that is still gated.

## Common header (all packets)

```
packet: <kind>          # lead | purchase | report | campaign | alert
from: <agent name>
to: <agent name>
ask: <one sentence: what the receiver should do>
source: <system / record / filter / period>
status: <drafted | queued | awaiting approval | done>
next_action: <the first concrete step for the receiver>
```

## Kinds

### lead (Mira / Ivo -> Lex)

```
packet: lead
lead: <name or record id>
company:
contact: <email/phone, or [NEED: contact]>
signal: <what we saw, with date; quote if possible>
campaign: <campaign name + UTM, or none>
fit: <Y/N + one sentence>
score: <0-100 with its parts, e.g. fit 25 / title 15 / signal 30 / angle 10>
disqualifier: <none or reason>
```

### purchase (Juno -> Finn)

```
packet: purchase
po: <Odoo/ERPNext PO id>
supplier:
total: <amount + currency>
terms: <payment terms, or [NEED: terms]>
expected_receipt: <date>
approval: <who approved, when; or "awaiting approval">
```

### report (Ivo -> Aira)

```
packet: report
period:
file: <Sheet/Doc/PDF link>
headline: <the one thing, one sentence>
anomalies: <list, or none>
gaps: <what could not be determined>
n_note: <sample sizes under 30 flagged as directional>
```

### campaign (Mira -> Lex / Ivo)

```
packet: campaign
campaign: <name>
channels:
utm: <source / medium / campaign>
launch: <date, or "not scheduled">
audience: <who it targets>
claims: <factual claims used, each with proof, or [NEED: proof]>
```

### alert (Ivo / Juno -> owner agent)

```
packet: alert
kind: <stock_out | low_stock | receivable_ageing | ticket_spike | revenue_drop>
subject: <product / customer / queue>
value: <measured number + unit>
threshold: <the rule that fired>
impact: <open orders / invoices affected, or unknown>
```

## Report skeleton (Ivo weekly report, Aira briefing)

```
# <Deliverable> — <subject>
<date> · Basis: <systems> · Period: <range>

## The one thing
## Findings            (each number: value, system, filter, period)
## Do these first
## What's already working
## What I couldn't determine
```

Sample honesty: under 30 records, say "directional only"; never name a winner
from a handful; separate old and new campaigns; say when attribution cannot be
known.

## Where each agent learns this

| Agent | Skill bundle |
|---|---|
| Ivo | `data-analyst` (report skeleton, alert packet, sample honesty) |
| Juno | `operations-inventory` (purchase + alert packets) |
| Mira | `marketing-content` (campaign packet, claims need proof) |
| Lex | extended with the lead packet + reply labels (plan §8) |
| Aira | reads packets; briefing uses the report skeleton |

## Checking it (Phase 2 onwards)

Add one eval per kind: a handoff whose packet has a missing required line must
contain `[NEED: ...]` for that line, not an invented value.
