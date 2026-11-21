import test from 'node:test';
import assert from 'node:assert/strict';
import { runInSandbox } from './sandbox.mjs';

const tools = {
  list_tickets: async ({ status } = {}) => [{ id: 1, status: status || 'open' }, { id: 2, status: 'open' }],
  list_invoices: async () => [{ id: 'a', total: 10, status: 'unpaid' }, { id: 'b', total: 5, status: 'paid' }],
  boom: async () => { throw new Error('upstream failed'); },
};
const run = (code, extra = {}) =>
  runInSandbox({ code, toolNames: Object.keys(tools), callTool: (n, a) => tools[n](a), ...extra });

test('combines several tools in one program with Promise.all', async () => {
  const r = await run(`
    const [t, i] = await Promise.all([codemode.list_tickets({status:'open'}), codemode.list_invoices()]);
    return { open: t.length, unpaid: i.filter(x => x.status === 'unpaid').reduce((s, x) => s + x.total, 0) };
  `);
  assert.deepEqual(r.result, { open: 2, unpaid: 10 });
  assert.equal(r.calls, 2);
});

test('captures console.log and returns undefined as null', async () => {
  const r = await run(`console.log('hi', {a:1}); `);
  assert.equal(r.result, null);
  assert.deepEqual(r.logs, ['hi {"a":1}']);
});

test('tool errors are catchable inside the program', async () => {
  const r = await run(`try { await codemode.boom(); } catch (e) { return 'caught: ' + e.message; }`);
  assert.equal(r.result, 'caught: upstream failed');
});

test('uncaught tool error surfaces as error', async () => {
  const r = await run(`await codemode.boom();`);
  assert.match(r.error, /upstream failed/);
});

test('unknown tool is rejected', async () => {
  const r = await run(`return await codemode.delete_everything({});`);
  assert.ok(r.error);
});

test('no access to host globals', async () => {
  const r = await run(`return [typeof process, typeof require, typeof fetch, typeof setTimeout, typeof globalThis.__call, typeof Buffer, typeof XMLHttpRequest]`);
  assert.deepEqual(r.result, ['undefined', 'undefined', 'undefined', 'undefined', 'undefined', 'undefined', 'undefined']);
});

test('cannot reach the host through constructor tricks', async () => {
  const r = await run(`try { return typeof (function(){}).constructor('return process')().version } catch (e) { return 'blocked' }`);
  assert.ok(r.result === 'undefined' || r.result === 'blocked');
});

test('infinite loop is interrupted by the timeout', async () => {
  const t0 = Date.now();
  const r = await run(`while (true) {}`, { limits: { timeoutMs: 400 } });
  assert.ok(r.error, 'expected an error');
  assert.ok(Date.now() - t0 < 3000);
});

test('memory bomb is stopped', async () => {
  const r = await run(`const a = []; while (true) a.push(new Array(100000).fill('x'));`, { limits: { memoryBytes: 8 * 1024 * 1024, timeoutMs: 5000 } });
  assert.ok(r.error);
});

test('tool call budget is enforced', async () => {
  const r = await run(`for (let i = 0; i < 10; i++) await codemode.list_tickets(); return 'done'`, { limits: { maxToolCalls: 3 } });
  assert.match(r.error, /too many tool calls/);
});

test('oversized results are truncated, not dropped', async () => {
  const r = await run(`return 'x'.repeat(50000)`, { limits: { maxResultChars: 1000 } });
  assert.match(String(r.result), /truncated/);
});

test('syntax errors are reported', async () => {
  const r = await run(`return (`);
  assert.ok(r.error);
});
