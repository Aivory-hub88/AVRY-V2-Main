import { test } from 'node:test';
import assert from 'node:assert/strict';

import { resolvePeriod, ratio, closeRate, change, byCurrency, SAMPLE_MIN } from './kpi.mjs';

const TODAY = new Date('2026-11-09T15:30:00Z'); // a Monday

test('no dates: the 7 full days ending yesterday, with the prior 7 days', () => {
  const p = resolvePeriod({}, TODAY);
  assert.equal(p.ok, true);
  assert.equal(p.defaulted, true);
  assert.equal(p.days, 7);
  assert.equal(p.start, '2026-11-02');
  assert.equal(p.end, '2026-11-08');
  assert.equal(p.end_exclusive, '2026-11-09');
  assert.deepEqual(p.previous, { start: '2026-10-26', end: '2026-11-01', end_exclusive: '2026-11-02' });
});

test('explicit window is inclusive of the end day and the previous window is the same length', () => {
  const p = resolvePeriod({ period_start: '2026-10-01', period_end: '2026-10-31' });
  assert.equal(p.ok, true);
  assert.equal(p.days, 31);
  assert.equal(p.end_exclusive, '2026-11-01');
  assert.equal(p.previous.end, '2026-09-30');
  assert.equal(p.previous.start, '2026-08-31');
});

test('one date alone is refused rather than guessed', () => {
  assert.equal(resolvePeriod({ period_start: '2026-10-01' }).ok, false);
  assert.equal(resolvePeriod({ period_end: '2026-10-01' }).ok, false);
});

test('impossible, reversed and oversized windows are refused', () => {
  assert.equal(resolvePeriod({ period_start: '2026-02-31', period_end: '2026-03-05' }).ok, false);
  assert.equal(resolvePeriod({ period_start: '2026-10-05', period_end: '2026-10-01' }).ok, false);
  assert.equal(resolvePeriod({ period_start: '2025-01-01', period_end: '2026-06-01' }).ok, false);
  assert.equal(resolvePeriod({ period_start: 'last week', period_end: 'today' }).ok, false);
});

test('a leap-year full year (366 days) is allowed, 367 is not', () => {
  assert.equal(resolvePeriod({ period_start: '2024-01-01', period_end: '2024-12-31' }).days, 366);
  assert.equal(resolvePeriod({ period_start: '2024-01-01', period_end: '2025-01-01' }).ok, false);
});

test('ratio never returns NaN, Infinity or a fake zero', () => {
  assert.equal(ratio(3, 4), 0.75);
  assert.equal(ratio(1, 3), 0.3333);
  assert.equal(ratio(5, 0), null);
  assert.equal(ratio('x', 2), null);
  assert.equal(ratio(0, 10), 0);
});

test('close rate flags small samples as directional only', () => {
  const small = closeRate(3, 5);
  assert.equal(small.value, 0.375);
  assert.equal(small.n, 8);
  assert.equal(small.directional_only, true);
  assert.match(small.note, /directional only/);

  const big = closeRate(SAMPLE_MIN, 20);
  assert.equal(big.directional_only, false);
  assert.equal(big.note, null);
});

test('close rate with nothing decided is null, not zero', () => {
  const none = closeRate(0, 0);
  assert.equal(none.value, null);
  assert.equal(none.directional_only, true);
  assert.match(none.note, /no close rate/);
});

test('change handles a zero baseline without Infinity', () => {
  assert.deepEqual(change(12, 10), { current: 12, previous: 10, delta: 2, pct: 20 });
  assert.deepEqual(change(5, 0), { current: 5, previous: 0, delta: 5, pct: null });
  assert.deepEqual(change(0, 8), { current: 0, previous: 8, delta: -8, pct: -100 });
});

test('byCurrency keeps currencies apart and ignores rows with none', () => {
  const out = byCurrency([
    { currency: 'IDR', total: '450000000.004' },
    { currency: 'USD', total: 12000 },
    { currency: null, total: 99 },
  ]);
  assert.deepEqual(out, { IDR: 450000000, USD: 12000 });
});
