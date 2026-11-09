import { test } from 'node:test';
import assert from 'node:assert/strict';

import { tools, agentType, mcpPath, reorderSuggestionHandler } from './operations-inventory.mjs';

test('module identity matches the server route and the roster', () => {
  assert.equal(agentType, 'operations_inventory');
  assert.equal(mcpPath, 'operations-inventory');
  assert.deepEqual(tools.map((t) => t.name), ['reorder_suggestion']);
});

test('the tool runs locally and never takes a tenant id', () => {
  const t = tools[0];
  assert.equal(typeof t.handler, 'function');
  assert.equal('tenant_id' in t.inputSchema, false);
  assert.equal('tenantId' in t.inputSchema, false);
});

test('handler returns the computed result', async () => {
  const out = await reorderSuggestionHandler({ items: [{ sku: 'A', on_hand: 0, avg_daily_demand: 3, lead_time_days: 5, safety_stock_units: 0 }] });
  assert.equal(out.summary.stock_out, 1);
  assert.equal(out.results[0].reorder_point, 15);
});

test('handler throws (generic error upstream) on an empty list', async () => {
  await assert.rejects(() => reorderSuggestionHandler({ items: [] }));
});

test('the input schema rejects negatives and non-numbers before the maths runs', () => {
  const schema = tools[0].inputSchema.items;
  assert.equal(schema.safeParse([{ on_hand: -1, lead_time_days: 1 }]).success, false);
  assert.equal(schema.safeParse([{ on_hand: '5', lead_time_days: 1 }]).success, false);
  assert.equal(schema.safeParse([{ on_hand: 5, lead_time_days: 1 }]).success, true);
  assert.equal(schema.safeParse(Array.from({ length: 51 }, () => ({ on_hand: 1, lead_time_days: 1 }))).success, false);
});
