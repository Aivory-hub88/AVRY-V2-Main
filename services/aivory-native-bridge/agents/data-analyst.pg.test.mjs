// Integration test: runs kpi_snapshot's real SQL against a throwaway Postgres.
// Skipped unless TEST_DATABASE_URL is set. Refuses any database whose name does
// not contain "test" because it DROPs and recreates the aivory_ops schema.
//
//   createdb aivory_kpi_test
//   TEST_DATABASE_URL=postgres://localhost/aivory_kpi_test npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import pg from 'pg';

import { kpiSnapshot } from './data-analyst.mjs';

const url = process.env.TEST_DATABASE_URL;
const dbName = url ? new URL(url).pathname.replace(/^\//, '') : '';
const enabled = Boolean(url) && /test/i.test(dbName);
const opts = { skip: enabled ? false : 'set TEST_DATABASE_URL to a database whose name contains "test"' };

const TODAY = new Date('2026-11-09T10:00:00Z');
let pool;
const run = (tenantId, args = {}) =>
  kpiSnapshot(args, { tenantId, today: TODAY, query: async (sql, params) => (await pool.query(sql, params)).rows });

before(async () => {
  if (!enabled) return;
  pool = new pg.Pool({ connectionString: url, max: 2 });
  await pool.query(readFileSync(new URL('../test-fixtures/ops-schema.sql', import.meta.url), 'utf8'));
  const A = 'tenant-a';
  const B = 'tenant-b';
  const lead = (t, stage, created, updated, amount, cur) =>
    pool.query(
      'INSERT INTO aivory_ops.leads (tenant_id, name, stage, created_at, updated_at, amount, currency) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [t, `lead-${stage}`, stage, created, updated, amount, cur],
    );
  await lead(A, 'new', '2026-11-03', '2026-11-03', null, null);
  await lead(A, 'qualified', '2026-11-04', '2026-11-04', 100000000, 'IDR');
  await lead(A, 'won', '2026-11-05', '2026-11-06', 450000000, 'IDR');
  await lead(A, 'won', '2026-10-20', '2026-11-07', 12000, 'USD');
  await lead(A, 'lost', '2026-10-20', '2026-11-03', null, null);
  await lead(A, 'new', '2026-10-28', '2026-10-28', null, null);
  await lead(A, 'won', '2026-10-01', '2026-10-30', 50000000, 'IDR');
  await lead(A, 'qualifying', '2026-09-01', '2026-09-01', 200000000, 'IDR');
  await lead(B, 'won', '2026-11-05', '2026-11-06', 999999999, 'IDR'); // must never leak into A

  const invoice = async (t, status, cur, created, updated, due, lines) => {
    const r = await pool.query(
      'INSERT INTO aivory_ops.invoices (tenant_id, customer_name, status, currency, created_at, updated_at, due_date) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
      [t, 'c', status, cur, created, updated, due],
    );
    for (const [q, p] of lines) {
      await pool.query('INSERT INTO aivory_ops.invoice_lines (invoice_id, tenant_id, description, quantity, unit_price) VALUES ($1,$2,$3,$4,$5)', [r.rows[0].id, t, 'x', q, p]);
    }
  };
  await invoice(A, 'sent', 'IDR', '2026-11-03', '2026-11-03', '2026-10-31', [[2, 5000000]]);
  await invoice(A, 'paid', 'IDR', '2026-11-05', '2026-11-07', '2026-11-20', [[1, 20000000]]);
  await invoice(A, 'void', 'IDR', '2026-11-06', '2026-11-06', '2026-11-20', [[1, 99000000]]);
  await invoice(A, 'overdue', 'IDR', '2026-10-28', '2026-10-28', '2026-08-20', [[1, 30000000]]);
  await invoice(A, 'sent', 'USD', '2026-11-04', '2026-11-04', '2026-12-01', [[3, 1000]]);
  await invoice(A, 'sent', 'IDR', '2026-09-01', '2026-09-01', '2026-10-05', [[1, 7000000]]);
  await invoice(B, 'sent', 'IDR', '2026-11-03', '2026-11-03', '2026-10-31', [[1, 888888888]]);

  const ticket = (t, status, prio, created, updated) =>
    pool.query('INSERT INTO aivory_ops.tickets (tenant_id, subject, status, priority, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6)', [t, 's', status, prio, created, updated]);
  await ticket(A, 'open', 'high', '2026-11-03', '2026-11-03');
  await ticket(A, 'pending', 'urgent', '2026-11-04', '2026-11-04');
  await ticket(A, 'closed', 'normal', '2026-11-05', '2026-11-07');
  await ticket(A, 'open', 'low', '2026-11-06', '2026-11-06');
  await ticket(A, 'closed', 'normal', '2026-10-27', '2026-10-28');
  await ticket(A, 'open', 'high', '2026-10-30', '2026-10-30');
  await ticket(A, 'open', 'normal', '2026-08-01', '2026-08-01');
  await ticket(B, 'open', 'urgent', '2026-11-03', '2026-11-03');
});

after(async () => {
  if (pool) await pool.end();
});

test('leads against real Postgres (hand-computed expectations)', opts, async () => {
  const r = await run('tenant-a');
  assert.equal(r.success, true);
  assert.deepEqual(r.leads.new_leads.value, { current: 3, previous: 1, delta: 2, pct: 200 });
  assert.deepEqual(r.leads.closed_won.value, { current: 2, previous: 1, delta: 1, pct: 100 });
  assert.deepEqual(r.leads.closed_lost.value, { current: 1, previous: 0, delta: 1, pct: null });
  assert.equal(r.leads.close_rate.value.value, 0.6667);
  assert.equal(r.leads.close_rate.value.n, 3);
  assert.equal(r.leads.close_rate.value.directional_only, true);
  assert.deepEqual(r.leads.won_value_by_currency.value, { IDR: 450000000, USD: 12000 });
  assert.deepEqual(r.leads.open_pipeline_by_currency.value, { IDR: 300000000 });
  assert.deepEqual(r.leads.open_pipeline_by_currency.deals, { IDR: 2 });
});

test('invoices against real Postgres: void excluded, lines summed, ageing buckets', opts, async () => {
  const r = await run('tenant-a');
  const inv = r.invoices;
  assert.deepEqual(inv.invoiced_by_currency.value.IDR, { current: 30000000, previous: 30000000, delta: 0, pct: 0 });
  assert.deepEqual(inv.invoiced_by_currency.value.USD, { current: 3000, previous: 0, delta: 3000, pct: null });
  assert.deepEqual(inv.invoiced_by_currency.invoices, { IDR: 2, USD: 1 });
  assert.deepEqual(inv.paid_by_currency.value, { IDR: 20000000 });
  assert.deepEqual(inv.receivables_by_currency.value.IDR, {
    unpaid_invoices: 3, unpaid_total: 47000000, past_due_invoices: 3, past_due_total: 47000000,
    days_past_due: { '1-30': 10000000, '31-60': 7000000, '61+': 30000000 },
  });
  assert.deepEqual(inv.receivables_by_currency.value.USD, {
    unpaid_invoices: 1, unpaid_total: 3000, past_due_invoices: 0, past_due_total: 0,
    days_past_due: { '1-30': 0, '31-60': 0, '61+': 0 },
  });
});

test('tickets against real Postgres', opts, async () => {
  const r = await run('tenant-a');
  assert.deepEqual(r.tickets.opened.value, { current: 4, previous: 2, delta: 2, pct: 100 });
  assert.deepEqual(r.tickets.high_or_urgent_opened.value, { current: 2, previous: 1, delta: 1, pct: 100 });
  assert.equal(r.tickets.closed_in_period.value, 1);
  assert.deepEqual(r.tickets.backlog_now.value, { open: 4, pending: 1 });
});

test('tenant isolation: tenant-b sees only its own rows, unknown tenant sees nothing', opts, async () => {
  const b = await run('tenant-b');
  assert.deepEqual(b.leads.won_value_by_currency.value, { IDR: 999999999 });
  assert.deepEqual(b.invoices.receivables_by_currency.value.IDR.unpaid_total, 888888888);
  assert.equal(b.tickets.opened.value.current, 1);

  const none = await run('tenant-nobody');
  assert.equal(none.leads.new_leads.value.current, 0);
  assert.deepEqual(none.invoices.invoiced_by_currency.value, {});
  assert.equal(none.tickets.opened.value.current, 0);
});

test('an explicit month window works', opts, async () => {
  const r = await run('tenant-a', { period_start: '2026-10-01', period_end: '2026-10-31' });
  assert.equal(r.period.days, 31);
  assert.equal(r.leads.closed_won.value.current, 1); // the 2026-10-30 win
});
