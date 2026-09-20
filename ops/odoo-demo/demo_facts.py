"""
Aivory Odoo Demo -- the ground truth behind the demo questions, run INSIDE `odoo shell`
(`./ops/odoo-demo/bootstrap_demo.sh facts`). Read-only.

When an agent answers "which deals are at risk?", compare it with this output. Dates in the
data are relative to the day it was seeded, so the numbers age (overdue days grow); the
*shape* -- who wins more, which month spiked, which quote has no next step -- does not.
"""
from collections import defaultdict
from datetime import date, timedelta

E = env  # noqa: F821 -- injected by odoo shell
TODAY = date.today()
usd = lambda v: f"${v:,.0f}"  # noqa: E731


def head(t):
    print(f"\n=== {t}")


Lead = E["crm.lead"].with_context(active_test=False)
opp = Lead.search([("type", "=", "opportunity")])
won = opp.filtered(lambda l: l.stage_id.is_won)
lost = opp.filtered(lambda l: not l.active)
open_ = opp.filtered(lambda l: l.active and not l.stage_id.is_won)

head("1. Pipeline (open, not yet won)")
for st in E["crm.stage"].search([("is_won", "=", False)], order="sequence"):
    ls = open_.filtered(lambda l: l.stage_id == st)
    print(f"  {st.name:22} {len(ls):3} leads  {usd(sum(ls.mapped('expected_revenue'))):>10}")
print(f"  TOTAL open pipeline: {len(open_)} leads, {usd(sum(open_.mapped('expected_revenue')))}")

head("2. Win rate (closed leads only: won vs lost)")
def rate(ls_won, ls_lost):
    n = len(ls_won) + len(ls_lost)
    return f"{len(ls_won)}/{n} = {100 * len(ls_won) / n:.0f}%" if n else "-"
print(f"  overall    : {rate(won, lost)}")
for u in (won | lost).mapped("user_id"):
    print(f"  {u.name:11}: {rate(won.filtered(lambda l: l.user_id == u), lost.filtered(lambda l: l.user_id == u))}")
print("  by source  :", "; ".join(f"{s.name} {rate(won.filtered(lambda l: l.source_id == s), lost.filtered(lambda l: l.source_id == s))}"
                                  for s in (won | lost).mapped("source_id")))
reasons = defaultdict(int)
for l in lost:
    reasons[l.lost_reason_id.name or "-"] += 1
print("  lost why   :", ", ".join(f"{k} ({v})" for k, v in sorted(reasons.items(), key=lambda kv: -kv[1])))

head("3. Revenue by month (confirmed orders, before tax)")
by_month = defaultdict(float)
for so in E["sale.order"].search([("state", "=", "sale")]):
    by_month[so.date_order.strftime("%Y-%m")] += so.amount_untaxed
for m in sorted(by_month)[-7:]:
    print(f"  {m}  {usd(by_month[m]):>10}  {'#' * int(by_month[m] / 12000)}")

head("4. Deal size and sales cycle (won leads)")
sizes = [l.expected_revenue for l in won if l.expected_revenue]
cycles = [(l.date_closed - l.create_date).days for l in won if l.date_closed]
print(f"  won: {len(won)}  avg deal {usd(sum(sizes) / len(sizes))}  avg cycle {sum(cycles) / len(cycles):.0f} days")

head("5. Top customers (confirmed orders) and repeat customers")
by_cust = defaultdict(lambda: [0, 0.0])
for so in E["sale.order"].search([("state", "=", "sale")]):
    by_cust[so.partner_id.name][0] += 1
    by_cust[so.partner_id.name][1] += so.amount_untaxed
for name, (n, tot) in sorted(by_cust.items(), key=lambda kv: -kv[1][1])[:5]:
    print(f"  {name:32} {n} job(s)  {usd(tot)}")
print("  repeat customers:", ", ".join(sorted(p.name for p in E["res.partner"].search([("category_id.name", "=", "Repeat Customer")]))) or "-")

head("6. Cash: receivables and payables")
inv = E["account.move"].search([("move_type", "=", "out_invoice"), ("state", "=", "posted"), ("payment_state", "in", ("not_paid", "partial"))])
over = inv.filtered(lambda m: m.invoice_date_due < TODAY)
print(f"  owed to us: {usd(sum(inv.mapped('amount_residual')))} on {len(inv)} invoices; overdue {len(over)} = {usd(sum(over.mapped('amount_residual')))}")
for m in over.sorted("invoice_date_due"):
    print(f"    {m.partner_id.name:26} {usd(m.amount_residual):>9}  {(TODAY - m.invoice_date_due).days} days late")
bills = E["account.move"].search([("move_type", "=", "in_invoice"), ("state", "=", "posted"), ("payment_state", "in", ("not_paid", "partial"))])
print(f"  we owe suppliers: {usd(sum(bills.mapped('amount_residual')))} on {len(bills)} bills")

head("7. Quotes waiting for an answer (state = sent)")
for so in E["sale.order"].search([("state", "=", "sent")], order="date_order"):
    print(f"  {so.name} {so.partner_id.name:32} {usd(so.amount_untaxed):>9}  sent {(TODAY - so.date_order.date()).days} days ago  ({so.user_id.name})")

head("8. Follow-ups: overdue activities, and open deals with NO next step")
acts = E["mail.activity"].search([("res_model", "=", "crm.lead")])
for a in acts.filtered(lambda a: a.date_deadline < TODAY).sorted("date_deadline"):
    lead = E["crm.lead"].browse(a.res_id)
    print(f"  overdue {(TODAY - a.date_deadline).days}d  {a.user_id.name:8} {lead.name:38} {a.summary}")
have = set(acts.mapped("res_id"))
for l in open_.filtered(lambda l: l.id not in have and l.partner_id and l.stage_id.name in ("Quote Sent", "Inspection Scheduled")):
    print(f"  NO NEXT STEP: {l.name} ({l.stage_id.name}, {usd(l.expected_revenue)})")

head("9. Job margin: order revenue vs material/disposal purchase cost (completed jobs)")
rows = []
for so in E["sale.order"].search([("state", "=", "sale")]):
    task = E["project.task"].search([("sale_line_id", "in", so.order_line.ids), ("state", "=", "1_done")], limit=1)
    cost = sum(E["purchase.order"].search([("origin", "=", so.name), ("state", "=", "purchase")]).mapped("amount_untaxed"))
    if task and cost:
        rows.append(((so.amount_untaxed - cost) / so.amount_untaxed, so, cost))
rows.sort(key=lambda r: r[0])
print("  thinnest margins:")
for m, so, cost in rows[:3]:
    print(f"    {so.partner_id.name:26} revenue {usd(so.amount_untaxed):>8}  cost {usd(cost):>8}  margin {100 * m:.0f}%")
print(f"  average margin over {len(rows)} completed jobs: {100 * sum(r[0] for r in rows) / len(rows):.0f}%")

head("10. This week's schedule")
evs = E["calendar.event"].search([("start", ">=", str(TODAY)), ("start", "<", str(TODAY + timedelta(days=8)))], order="start")
seen = defaultdict(list)
for ev in evs:
    seen[(ev.user_id.name, ev.start)].append(ev.name)
    print(f"  {ev.start:%a %d %b %H:%M}  {ev.user_id.name:8} {ev.name}")
for (who, when), names in seen.items():
    if len(names) > 1:
        print(f"  CONFLICT: {who} double-booked {when:%a %H:%M}: {' / '.join(names)}")

head("11. Job board (project tasks by stage)")
Task = E["project.task"]
for st in E["project.task.type"].search([("project_ids.name", "=", "Roof Jobs")], order="sequence"):
    print(f"  {st.name:16} {Task.search_count([('stage_id', '=', st.id)])}")
