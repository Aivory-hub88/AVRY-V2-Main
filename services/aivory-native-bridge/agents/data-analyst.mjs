import { z } from 'zod';

import { query } from '../db.mjs';
import { byCurrency, change, closeRate, metric, resolvePeriod } from '../kpi.mjs';
import { tools as leadsQualifierTools } from './leads-qualifier.mjs';

// Native, read-only reporting backend for Ivo (agent_type `data_analyst`).
// Same rules as the other native agents: tenant_id is injected by the bridge
// from the MCP session and is never a tool argument; every query is
// parameterised and filters on tenant_id. This module issues SELECTs only.
//
// Scope of kpi_snapshot: the numbers Aivory itself holds for the tenant
// (aivory_ops.leads / invoices / invoice_lines / tickets). Numbers that live in
// the tenant's own ERP/CRM are NOT here -- Ivo reads those through the
// Od-MCP / ERPNext / HubSpot read tools and must say which system each came from.

export const agentType = 'data_analyst';
export const mcpPath = 'data-analyst';
// Every tool below runs locally, so there is no n8n workflow for this agent.
// server.mjs only requires the env var when a tool has no local handler.
export const webhookEnvVar = 'N8N_WEBHOOK_DATA_ANALYST';

const OPEN_STAGES = ['new', 'qualifying', 'qualified'];

// A calendar day [from, to) in UTC, expressed once so every query agrees.
const IN_WINDOW = (col, from, to) =>
  `(${col} >= (${from}::date)::timestamp AT TIME ZONE 'UTC' AND ${col} < (${to}::date)::timestamp AT TIME ZONE 'UTC')`;

async function leadMetrics(q, tenantId, p) {
  const cur = (col) => IN_WINDOW(col, '$2', '$3');
  const prev = (col) => IN_WINDOW(col, '$4', '$5');
  const counts = (
    await q(
      'SELECT ' +
      `COUNT(*) FILTER (WHERE ${cur('created_at')})::int AS created, ` +
      `COUNT(*) FILTER (WHERE ${prev('created_at')})::int AS created_prev, ` +
      `COUNT(*) FILTER (WHERE stage = 'won' AND ${cur('updated_at')})::int AS won, ` +
      `COUNT(*) FILTER (WHERE stage = 'lost' AND ${cur('updated_at')})::int AS lost, ` +
      `COUNT(*) FILTER (WHERE stage = 'won' AND ${prev('updated_at')})::int AS won_prev, ` +
      `COUNT(*) FILTER (WHERE stage = 'lost' AND ${prev('updated_at')})::int AS lost_prev ` +
      'FROM aivory_ops.leads WHERE tenant_id = $1',
      [tenantId, p.start, p.end_exclusive, p.previous.start, p.previous.end_exclusive],
    )
  )[0];

  const wonValue = await q(
    'SELECT currency, SUM(amount)::numeric(18,2) AS total FROM aivory_ops.leads ' +
    `WHERE tenant_id = $1 AND stage = 'won' AND amount IS NOT NULL AND ${cur('updated_at')} ` +
    'GROUP BY currency ORDER BY currency',
    [tenantId, p.start, p.end_exclusive],
  );

  const openPipeline = await q(
    'SELECT currency, SUM(amount)::numeric(18,2) AS total, COUNT(*)::int AS deals ' +
    'FROM aivory_ops.leads WHERE tenant_id = $1 AND amount IS NOT NULL AND stage = ANY($2::text[]) ' +
    'GROUP BY currency ORDER BY currency',
    [tenantId, OPEN_STAGES],
  );

  const src = 'aivory_ops.leads';
  return {
    new_leads: metric(change(counts.created, counts.created_prev), `${src} created_at in period vs previous period`),
    closed_won: metric(change(counts.won, counts.won_prev), `${src} stage=won, updated_at in period`),
    closed_lost: metric(change(counts.lost, counts.lost_prev), `${src} stage=lost, updated_at in period`),
    close_rate: metric(closeRate(counts.won, counts.lost), `won / (won + lost) from ${src}, updated_at in period`),
    won_value_by_currency: metric(byCurrency(wonValue), `${src} SUM(amount) stage=won, updated_at in period`),
    open_pipeline_by_currency: metric(
      byCurrency(openPipeline),
      `${src} SUM(amount) stage in (${OPEN_STAGES.join(', ')}) right now (not limited to the period)`,
      { deals: Object.fromEntries(openPipeline.filter((r) => r.currency).map((r) => [r.currency, r.deals])) },
    ),
  };
}

async function invoiceMetrics(q, tenantId, p, todayStr) {
  const cur = IN_WINDOW('i.created_at', '$2', '$3');
  const prev = IN_WINDOW('i.created_at', '$4', '$5');
  // Totals come from invoice_lines (quantity * unit_price), the same basis as
  // get_invoice's "computed total", not from invoices.total_amount.
  const invoiced = await q(
    'SELECT i.currency, ' +
    `COUNT(DISTINCT i.id) FILTER (WHERE ${cur})::int AS invoices, ` +
    `COALESCE(SUM(l.quantity * l.unit_price) FILTER (WHERE ${cur}), 0)::numeric(18,2) AS total, ` +
    `COALESCE(SUM(l.quantity * l.unit_price) FILTER (WHERE ${prev}), 0)::numeric(18,2) AS total_prev ` +
    'FROM aivory_ops.invoices i ' +
    'LEFT JOIN aivory_ops.invoice_lines l ON l.invoice_id = i.id AND l.tenant_id = i.tenant_id ' +
    "WHERE i.tenant_id = $1 AND i.status <> 'void' GROUP BY i.currency ORDER BY i.currency",
    [tenantId, p.start, p.end_exclusive, p.previous.start, p.previous.end_exclusive],
  );

  const paid = await q(
    'SELECT i.currency, COALESCE(SUM(l.quantity * l.unit_price), 0)::numeric(18,2) AS total ' +
    'FROM aivory_ops.invoices i ' +
    'LEFT JOIN aivory_ops.invoice_lines l ON l.invoice_id = i.id AND l.tenant_id = i.tenant_id ' +
    `WHERE i.tenant_id = $1 AND i.status = 'paid' AND ${IN_WINDOW('i.updated_at', '$2', '$3')} ` +
    'GROUP BY i.currency ORDER BY i.currency',
    [tenantId, p.start, p.end_exclusive],
  );

  // Receivables are a snapshot of right now: unpaid = sent or overdue, and
  // "past due" is decided by due_date against today, not by the status label
  // (nothing flips sent -> overdue automatically).
  const receivables = await q(
    'SELECT i.currency, ' +
    'COUNT(DISTINCT i.id)::int AS unpaid_invoices, ' +
    'COALESCE(SUM(l.quantity * l.unit_price), 0)::numeric(18,2) AS unpaid_total, ' +
    'COUNT(DISTINCT i.id) FILTER (WHERE i.due_date < $2::date)::int AS past_due_invoices, ' +
    'COALESCE(SUM(l.quantity * l.unit_price) FILTER (WHERE i.due_date < $2::date), 0)::numeric(18,2) AS past_due_total, ' +
    'COALESCE(SUM(l.quantity * l.unit_price) FILTER (WHERE i.due_date < $2::date AND i.due_date >= $2::date - 30), 0)::numeric(18,2) AS age_1_30, ' +
    'COALESCE(SUM(l.quantity * l.unit_price) FILTER (WHERE i.due_date < $2::date - 30 AND i.due_date >= $2::date - 60), 0)::numeric(18,2) AS age_31_60, ' +
    'COALESCE(SUM(l.quantity * l.unit_price) FILTER (WHERE i.due_date < $2::date - 60), 0)::numeric(18,2) AS age_61_plus ' +
    'FROM aivory_ops.invoices i ' +
    'LEFT JOIN aivory_ops.invoice_lines l ON l.invoice_id = i.id AND l.tenant_id = i.tenant_id ' +
    "WHERE i.tenant_id = $1 AND i.status IN ('sent', 'overdue') GROUP BY i.currency ORDER BY i.currency",
    [tenantId, todayStr],
  );

  const src = 'aivory_ops.invoices + invoice_lines (sum of quantity * unit_price, void excluded)';
  return {
    invoiced_by_currency: metric(
      Object.fromEntries(invoiced.filter((r) => r.currency).map((r) => [r.currency, change(r.total, r.total_prev)])),
      `${src}, created_at in period vs previous period`,
      { invoices: Object.fromEntries(invoiced.filter((r) => r.currency).map((r) => [r.currency, r.invoices])) },
    ),
    paid_by_currency: metric(
      byCurrency(paid),
      'aivory_ops.invoices status=paid, updated_at in period (updated_at is last-modified, so an edit after payment moves it)',
    ),
    receivables_by_currency: metric(
      Object.fromEntries(
        receivables.filter((r) => r.currency).map((r) => [
          r.currency,
          {
            unpaid_invoices: r.unpaid_invoices,
            unpaid_total: Number(r.unpaid_total),
            past_due_invoices: r.past_due_invoices,
            past_due_total: Number(r.past_due_total),
            days_past_due: {
              '1-30': Number(r.age_1_30),
              '31-60': Number(r.age_31_60),
              '61+': Number(r.age_61_plus),
            },
          },
        ]),
      ),
      `${src}, status in (sent, overdue) as of ${todayStr}; past due = due_date before ${todayStr}`,
    ),
  };
}

async function ticketMetrics(q, tenantId, p) {
  const cur = IN_WINDOW('created_at', '$2', '$3');
  const prev = IN_WINDOW('created_at', '$4', '$5');
  const row = (
    await q(
      'SELECT ' +
      `COUNT(*) FILTER (WHERE ${cur})::int AS opened, ` +
      `COUNT(*) FILTER (WHERE ${prev})::int AS opened_prev, ` +
      `COUNT(*) FILTER (WHERE ${cur} AND priority IN ('high', 'urgent'))::int AS high_urgent, ` +
      `COUNT(*) FILTER (WHERE ${prev} AND priority IN ('high', 'urgent'))::int AS high_urgent_prev, ` +
      "COUNT(*) FILTER (WHERE status = 'open')::int AS open_now, " +
      "COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_now, " +
      `COUNT(*) FILTER (WHERE status = 'closed' AND ${IN_WINDOW('updated_at', '$2', '$3')})::int AS closed_in_period ` +
      'FROM aivory_ops.tickets WHERE tenant_id = $1',
      [tenantId, p.start, p.end_exclusive, p.previous.start, p.previous.end_exclusive],
    )
  )[0];

  const src = 'aivory_ops.tickets';
  return {
    opened: metric(change(row.opened, row.opened_prev), `${src} created_at in period vs previous period`),
    high_or_urgent_opened: metric(
      change(row.high_urgent, row.high_urgent_prev),
      `${src} priority in (high, urgent), created_at in period vs previous period`,
    ),
    closed_in_period: metric(row.closed_in_period, `${src} status=closed, updated_at in period`),
    backlog_now: metric({ open: row.open_now, pending: row.pending_now }, `${src} status right now (not limited to the period)`),
  };
}

// `ctx.query` and `ctx.today` exist for tests; the server only ever passes tenantId.
export async function kpiSnapshot(args, { tenantId, query: q = query, today = new Date() }) {
  const p = resolvePeriod(args, today);
  if (!p.ok) return { success: false, error: p.error };

  const todayStr = today.toISOString().slice(0, 10);
  const [leads, invoices, tickets] = await Promise.all([
    leadMetrics(q, tenantId, p),
    invoiceMetrics(q, tenantId, p, todayStr),
    ticketMetrics(q, tenantId, p),
  ]);

  return {
    success: true,
    period: {
      start: p.start,
      end: p.end,
      days: p.days,
      defaulted: p.defaulted,
      timezone: 'UTC',
      previous: { start: p.previous.start, end: p.previous.end },
    },
    leads,
    invoices,
    tickets,
    not_available: [
      'Anything held only in the tenant\'s own ERP/CRM (Odoo, ERPNext, SAP, HubSpot): read it with those tools and name the system.',
      'Cost, margin and stock: not stored in Aivory\'s own tables.',
      'Revenue per customer or per product: not tracked here.',
    ],
    caveats: [
      'These are the figures Aivory itself holds for this tenant. If the business also keeps books elsewhere, the two will not match unless that is the same data.',
      'Dates are UTC calendar days. lead/invoice "closed" and "paid" use updated_at, which is the last-modified time, so a later edit moves a record into a different period.',
      'Currencies are never added together. Convert only if the user asks, and state the rate and its date.',
    ],
  };
}

const forecastTool = leadsQualifierTools.find((t) => t.name === 'sales_funnel_forecast');
if (!forecastTool) {
  // Fail at load, not at the first call: Ivo's contract says he owns forecasting.
  throw new Error('sales_funnel_forecast not found in leads-qualifier tools');
}

export const tools = [
  {
    name: 'kpi_snapshot',
    description:
      'Standard business KPIs for one period in a single call: leads (new, won, lost, close rate, won value, ' +
      'open pipeline), invoices (invoiced, paid, receivables and how long they are past due), and tickets ' +
      '(opened, high/urgent, closed, backlog). Each metric carries its source, and the previous period of the same ' +
      'length is included so changes are real comparisons. Currencies are never added together. ' +
      'Dates are UTC days; give both period_start and period_end (YYYY-MM-DD) or neither for the last 7 full days. ' +
      'READ-ONLY. Only covers data Aivory holds; anything from the tenant\'s ERP/CRM must come from those tools. ' +
      'Quote the source of every number, say "directional only" when a rate has fewer than 30 records behind it, ' +
      'and list what you could not determine.',
    inputSchema: {
      period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD').optional(),
      period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD').optional(),
    },
    action: 'kpi_snapshot',
    handler: kpiSnapshot,
  },
  // Ivo is the home of forecasting (plan section 3.1). The same tool object is
  // still registered for Lex, who keeps it for his own pipeline.
  forecastTool,
];
