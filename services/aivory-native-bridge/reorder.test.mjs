import { test } from 'node:test';
import assert from 'node:assert/strict';

import { reorderItem, reorderSuggestion, DEMAND_MIN_DAYS } from './reorder.mjs';

test('reorder point and quantity are hand-computed and every input is echoed', () => {
  // demand 10/day, lead 7d, safety 20 -> rp 90. on_hand 50, none on order -> reorder now.
  // target = 90 + 10*14 = 230 -> qty 180.
  const r = reorderItem({ sku: 'SHG-1', on_hand: 50, avg_daily_demand: 10, lead_time_days: 7, safety_stock_units: 20, demand_basis_days: 60 });
  assert.equal(r.ok, true);
  assert.equal(r.reorder_point, 90);
  assert.equal(r.target_level, 230);
  assert.equal(r.status, 'reorder_now');
  assert.equal(r.suggested_order_qty, 180);
  assert.equal(r.days_of_cover, 5);
  assert.equal(r.inputs.order_cover_days, 14);
  assert.match(r.assumptions.join(' '), /defaulted to 14/);
  assert.equal(r.directional_only, false);
});

test('units_sold over a stated window becomes a daily average', () => {
  const r = reorderItem({ on_hand: 5, units_sold: 300, demand_basis_days: 30, lead_time_days: 10, safety_stock_units: 0 });
  assert.equal(r.inputs.avg_daily_demand, 10);
  assert.equal(r.reorder_point, 100);
});

test('safety stock in days is days x daily demand', () => {
  const r = reorderItem({ on_hand: 500, avg_daily_demand: 4, lead_time_days: 5, safety_stock_days: 3 });
  assert.equal(r.inputs.safety_stock_units, 12);
  assert.equal(r.reorder_point, 32);
  assert.equal(r.status, 'ok');
  assert.equal(r.suggested_order_qty, 0);
});

test('open orders can cover a low shelf, and are flagged rather than hidden', () => {
  const r = reorderItem({ on_hand: 30, on_order: 200, avg_daily_demand: 10, lead_time_days: 5, safety_stock_units: 10 });
  assert.equal(r.status, 'covered_by_open_orders');
  assert.equal(r.suggested_order_qty, 0);
  assert.match(r.notes.join(' '), /not late/);
});

test('zero on hand is a stock-out even with demand 0', () => {
  const r = reorderItem({ on_hand: 0, avg_daily_demand: 0, lead_time_days: 3, safety_stock_units: 5 });
  assert.equal(r.status, 'stock_out');
  assert.match(r.notes.join(' '), /still sold/);
});

test('MOQ then pack size round the quantity up, never down', () => {
  // rp 20, target 20+14=34 minus position 0 -> 34 -> MOQ 50 -> pack 12 -> 60
  const r = reorderItem({ on_hand: 0, avg_daily_demand: 1, lead_time_days: 20, safety_stock_units: 0, moq: 50, pack_size: 12 });
  assert.equal(r.suggested_order_qty, 60);
  assert.equal(r.notes.length, 2);
});

test('short demand history is flagged directional', () => {
  const r = reorderItem({ on_hand: 1, units_sold: 20, demand_basis_days: DEMAND_MIN_DAYS - 1, lead_time_days: 2, safety_stock_units: 0 });
  assert.equal(r.directional_only, true);
});

test('missing or bad inputs are refused with the reason, never defaulted', () => {
  const r = reorderItem({ sku: 'X', on_hand: 10, avg_daily_demand: 2 });
  assert.equal(r.ok, false);
  assert.match(r.errors.join(' '), /lead_time_days/);
  assert.equal(reorderItem({ on_hand: -1, avg_daily_demand: 1, lead_time_days: 1 }).ok, false);
  assert.equal(reorderItem({ on_hand: 1, units_sold: 10, lead_time_days: 1 }).ok, false);
  assert.equal(reorderItem({ on_hand: 1, lead_time_days: 1 }).ok, false);
  assert.equal(reorderItem({ on_hand: '10', avg_daily_demand: 1, lead_time_days: 1 }).ok, false);
  assert.equal(reorderItem({ on_hand: 1, avg_daily_demand: NaN, lead_time_days: 1 }).ok, false);
});

test('a list is sorted most urgent first and counted; failures go last', () => {
  const out = reorderSuggestion([
    { sku: 'ok', on_hand: 999, avg_daily_demand: 1, lead_time_days: 1, safety_stock_units: 0 },
    { sku: 'bad', on_hand: 1 },
    { sku: 'out', on_hand: 0, avg_daily_demand: 2, lead_time_days: 4, safety_stock_units: 0 },
    { sku: 'low', on_hand: 3, avg_daily_demand: 2, lead_time_days: 4, safety_stock_units: 0 },
  ]);
  assert.deepEqual(out.results.map((r) => r.sku), ['out', 'low', 'ok', 'bad']);
  assert.deepEqual(out.summary, { items: 4, stock_out: 1, reorder_now: 1, covered_by_open_orders: 0, ok: 1, could_not_compute: 1 });
});

test('empty and oversized lists are refused', () => {
  assert.equal(reorderSuggestion([]).ok, false);
  assert.equal(reorderSuggestion(Array.from({ length: 51 }, () => ({}))).ok, false);
});
