import { test } from 'node:test';
import assert from 'node:assert/strict';

import { kpiSnapshot, tools, agentType, mcpPath } from './data-analyst.mjs';

const TODAY = new Date('2026-11-09T10:00:00Z');

// A fake pg `query` that records every call and answers by table.
function fakeDb(overrides = {}) {
  const calls = [];
  const q = async (sql, params) => {
    calls.push({ sql, params });
    if (sql.includes('FROM aivory_ops.leads') && sql.includes('AS created')) {
      return [overrides.leadCounts ?? { created: 12, created_prev: 10, won: 3, lost: 5, won_prev: 2, lost_prev: 4 }];
    }
    if (sql.includes("stage = 'won' AND amount IS NOT NULL")) {
      return overrides.wonValue ?? [{ currency: 'IDR', total: '450000000.00' }, { currency: 'USD', total: '12000.00' }];
    }
    if (sql.includes('stage = ANY')) {
      return overrides.openPipeline ?? [{ currency: 'IDR', total: '900000000.00', deals: 4 }];
    }
    if (sql.includes('aivory_ops.invoices') && sql.includes("status = 'paid'")) {
      return overrides.paid ?? [{ currency: 'IDR', total: '80000000.00' }];
    }
    if (sql.includes('aivory_ops.invoices') && sql.includes('unpaid_invoices')) {
      return overrides.receivables ?? [{
        currency: 'IDR', unpaid_invoices: 3, unpaid_total: '30000000.00', past_due_invoices: 2,
        past_due_total: '20000000.00', age_1_30: '5000000.00', age_31_60: '5000000.00', age_61_plus: '10000000.00',
      }];
    }
    if (sql.includes('aivory_ops.invoices')) {
      return overrides.invoiced ?? [{ currency: 'IDR', invoices: 5, total: '100000000.00', total_prev: '125000000.00' }];
    }
    if (sql.includes('aivory_ops.tickets')) {
      return [overrides.tickets ?? {
        opened: 9, opened_prev: 4, high_urgent: 3, high_urgent_prev: 1, open_now: 6, pending_now: 2, closed_in_period: 7,
      }];
    }
    throw new Error(`unexpected SQL: ${sql.slice(0, 80)}`);
  };
  return { q, calls };
}

const run = (args = {}, db = fakeDb()) => kpiSnapshot(args, { tenantId: 'tenant-a', query: db.q, today: TODAY }).then((r) => ({ r, db }));

test('module identity matches the server route and the roster', () => {
  assert.equal(agentType, 'data_analyst');
  assert.equal(mcpPath, 'data-analyst');
  assert.deepEqual(tools.map((t) => t.name), ['kpi_snapshot', 'sales_funnel_forecast']);
});

test('every query is filtered by the session tenant and parameterised', async () => {
  const { db } = await run();
  assert.ok(db.calls.length >= 7);
  for (const c of db.calls) {
    assert.match(c.sql, /tenant_id = \$1/, c.sql.slice(0, 60));
    assert.equal(c.params[0], 'tenant-a');
    assert.doesNotMatch(c.sql, /tenant-a/); // tenant id never interpolated into SQL text
  }
});

test('issues SELECTs only', async () => {
  const { db } = await run();
  for (const c of db.calls) assert.match(c.sql.trim(), /^SELECT/i);
  for (const c of db.calls) assert.doesNotMatch(c.sql, /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE)\b/i);
});

test('default period is the 7 full days ending yesterday, windows passed as dates', async () => {
  const { r, db } = await run();
  assert.equal(r.success, true);
  assert.equal(r.period.start, '2026-11-02');
  assert.equal(r.period.end, '2026-11-08');
  assert.equal(r.period.defaulted, true);
  assert.deepEqual(r.period.previous, { start: '2026-10-26', end: '2026-11-01' });
  const leadCall = db.calls[0];
  assert.deepEqual(leadCall.params.slice(1), ['2026-11-02', '2026-11-09', '2026-10-26', '2026-11-02']);
});

test('leads: changes, close rate flagged directional, currencies kept apart', async () => {
  const { r } = await run();
  assert.deepEqual(r.leads.new_leads.value, { current: 12, previous: 10, delta: 2, pct: 20 });
  assert.equal(r.leads.close_rate.value.value, 0.375);
  assert.equal(r.leads.close_rate.value.n, 8);
  assert.equal(r.leads.close_rate.value.directional_only, true);
  assert.deepEqual(r.leads.won_value_by_currency.value, { IDR: 450000000, USD: 12000 });
  assert.deepEqual(r.leads.open_pipeline_by_currency.value, { IDR: 900000000 });
  assert.deepEqual(r.leads.open_pipeline_by_currency.deals, { IDR: 4 });
});

test('invoices: invoiced vs previous, paid, receivables with ageing buckets', async () => {
  const { r } = await run();
  assert.deepEqual(r.invoices.invoiced_by_currency.value.IDR, { current: 100000000, previous: 125000000, delta: -25000000, pct: -20 });
  assert.deepEqual(r.invoices.paid_by_currency.value, { IDR: 80000000 });
  assert.deepEqual(r.invoices.receivables_by_currency.value.IDR.days_past_due, { '1-30': 5000000, '31-60': 5000000, '61+': 10000000 });
  assert.equal(r.invoices.receivables_by_currency.value.IDR.past_due_invoices, 2);
  assert.match(r.invoices.receivables_by_currency.source, /as of 2026-11-09/);
});

test('tickets: spike against previous period and backlog', async () => {
  const { r } = await run();
  assert.deepEqual(r.tickets.opened.value, { current: 9, previous: 4, delta: 5, pct: 125 });
  assert.deepEqual(r.tickets.backlog_now.value, { open: 6, pending: 2 });
  assert.equal(r.tickets.closed_in_period.value, 7);
});

test('every metric carries a source string', async () => {
  const { r } = await run();
  for (const section of [r.leads, r.invoices, r.tickets]) {
    for (const [name, m] of Object.entries(section)) {
      assert.equal(typeof m.source, 'string', name);
      assert.ok(m.source.length > 10, name);
    }
  }
});

test('an empty tenant gives zeros and nulls, never NaN or invented values', async () => {
  const db = fakeDb({
    leadCounts: { created: 0, created_prev: 0, won: 0, lost: 0, won_prev: 0, lost_prev: 0 },
    wonValue: [], openPipeline: [], paid: [], receivables: [], invoiced: [],
    tickets: { opened: 0, opened_prev: 0, high_urgent: 0, high_urgent_prev: 0, open_now: 0, pending_now: 0, closed_in_period: 0 },
  });
  const { r } = await run({}, db);
  assert.equal(r.leads.close_rate.value.value, null);
  assert.equal(r.leads.new_leads.value.pct, null);
  assert.deepEqual(r.leads.won_value_by_currency.value, {});
  assert.deepEqual(r.invoices.invoiced_by_currency.value, {});
  assert.doesNotMatch(JSON.stringify(r), /NaN|Infinity/);
});

test('a bad period is refused before any query runs', async () => {
  const db = fakeDb();
  const r = await kpiSnapshot({ period_start: '2026-11-09' }, { tenantId: 't', query: db.q, today: TODAY });
  assert.equal(r.success, false);
  assert.match(r.error, /both/);
  assert.equal(db.calls.length, 0);
});

test('lists what is not available instead of implying it', async () => {
  const { r } = await run();
  assert.ok(r.not_available.some((x) => /margin/i.test(x)));
  assert.ok(r.caveats.some((x) => /UTC/.test(x)));
});
