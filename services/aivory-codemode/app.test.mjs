import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { z } from 'zod';
import { createApp } from './app.mjs';

const KEY = 'test-key';
const seen = []; // every (tenant, tool) the fake upstream served
const writesCalled = [];

// Fake native bridge: binds tenant from the URL like the real one.
function fakeUpstream() {
  const app = express();
  app.use(express.json());
  const sessions = new Map();
  app.all('/mcp/:p', async (req, res) => {
    if (req.headers['x-bridge-key'] !== KEY) return res.status(401).end();
    const sid = req.headers['mcp-session-id'];
    if (sid && sessions.has(sid)) return sessions.get(sid).handleRequest(req, res, req.body);
    const tenant = req.query.tenant_id;
    const s = new McpServer({ name: 'fake', version: '0' });
    s.registerTool('list_tickets', { description: 'List tickets', inputSchema: { status: z.string().optional() } }, async () => {
      seen.push([tenant, 'list_tickets']);
      return { content: [{ type: 'text', text: JSON.stringify([{ id: tenant + '-1' }, { id: tenant + '-2' }]) }] };
    });
    s.registerTool('close_ticket', { description: 'Close a ticket', inputSchema: { ticket_id: z.string() } }, async () => {
      writesCalled.push(tenant);
      return { content: [{ type: 'text', text: 'closed' }] };
    });
    const t = new StreamableHTTPServerTransport({ sessionIdGenerator: () => randomUUID(), onsessioninitialized: (id) => sessions.set(id, t) });
    await s.connect(t);
    await t.handleRequest(req, res, req.body);
  });
  return new Promise((resolve) => { const srv = app.listen(0, '127.0.0.1', () => resolve(srv)); });
}

async function connect(port, tenant, profile = 'customer_service') {
  const c = new Client({ name: 't', version: '0' });
  await c.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp/codemode/${profile}?tenant_id=${tenant}`), { requestInit: { headers: { 'x-bridge-key': KEY } } }));
  return c;
}

test('proxy: tenant binding, read-only allowlist, execute + search', async () => {
  const up = await fakeUpstream();
  const upPort = up.address().port;
  const { app, stop } = createApp({ key: KEY, baseUrl: `http://127.0.0.1:${upPort}`, paths: ['customer-service'] });
  const proxy = await new Promise((r) => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
  const port = proxy.address().port;
  try {
    const a = await connect(port, 'tenant-a');
    const b = await connect(port, 'tenant-b');

    const toolsA = (await a.listTools()).tools;
    assert.deepEqual(toolsA.map((t) => t.name).sort(), ['execute', 'search']);
    const exec = toolsA.find((t) => t.name === 'execute');
    assert.match(exec.description, /codemode\.list_tickets/);
    assert.doesNotMatch(exec.description, /close_ticket/, 'write tools must never be advertised');

    const ra = await a.callTool({ name: 'execute', arguments: { code: `const t = await codemode.list_tickets({}); return t.map(x => x.id)` } });
    assert.deepEqual(JSON.parse(ra.content[0].text).result, ['tenant-a-1', 'tenant-a-2']);
    const rb = await b.callTool({ name: 'execute', arguments: { code: `return (await codemode.list_tickets()).length` } });
    assert.equal(JSON.parse(rb.content[0].text).result, 2);
    assert.ok(seen.every(([t]) => t === 'tenant-a' || t === 'tenant-b'));
    assert.deepEqual(seen.filter(([t]) => t === 'tenant-b').length, 1);

    // a write tool cannot be reached even by name
    const rw = await a.callTool({ name: 'execute', arguments: { code: `return await codemode.close_ticket({ticket_id:'1'})` } });
    assert.equal(rw.isError, true);
    assert.equal(writesCalled.length, 0);

    // model-supplied tenant id has no effect
    await a.callTool({ name: 'execute', arguments: { code: `return await codemode.list_tickets({tenant_id:'tenant-b'})` } });
    assert.equal(seen[seen.length - 1][0], 'tenant-a');

    const sr = await a.callTool({ name: 'search', arguments: { query: 'tickets' } });
    assert.equal(JSON.parse(sr.content[0].text)[0].name, 'list_tickets');
    await a.close(); await b.close();
  } finally {
    await stop(); proxy.close(); up.close();
  }
});

test('proxy rejects bad key and malformed tenant', async () => {
  const { app, stop } = createApp({ key: KEY, baseUrl: 'http://127.0.0.1:1', paths: [] });
  const proxy = await new Promise((r) => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
  const base = `http://127.0.0.1:${proxy.address().port}/mcp/codemode/customer_service`;
  try {
    assert.equal((await fetch(`${base}?tenant_id=x`, { method: 'POST' })).status, 401);
    assert.equal((await fetch(`${base}?tenant_id=../etc`, { method: 'POST', headers: { 'x-bridge-key': KEY } })).status, 400);
    assert.equal((await fetch(base, { method: 'POST', headers: { 'x-bridge-key': KEY } })).status, 400);
  } finally { await stop(); proxy.close(); }
});

test('profiles never widen an agent: customer_service cannot see invoice or lead tools', async () => {
  const up = await fakeUpstream();
  const { app, stop } = createApp({ key: KEY, baseUrl: `http://127.0.0.1:${up.address().port}`, paths: ['customer-service'] });
  const proxy = await new Promise((r) => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
  try {
    const c = await connect(proxy.address().port, 'tenant-a', 'finance_invoice_ops');
    const ex = (await c.listTools()).tools.find((t) => t.name === 'execute');
    assert.doesNotMatch(ex.description, /list_tickets/, 'finance profile must not expose ticket reads');
    const r = await fetch(`http://127.0.0.1:${proxy.address().port}/mcp/codemode/not-a-profile?tenant_id=x`, { method: 'POST', headers: { 'x-bridge-key': KEY } });
    assert.equal(r.status, 404);
    await c.close();
  } finally { await stop(); proxy.close(); up.close(); }
});

// ---- Odoo (per-tenant, via backend internal API) ----
function fakeOdooMcp(seenTokens) {
  const app = express();
  app.use(express.json());
  const sessions = new Map();
  app.all('/mcp', async (req, res) => {
    const sid = req.headers['mcp-session-id'];
    if (sid && sessions.has(sid)) return sessions.get(sid).handleRequest(req, res, req.body);
    const token = req.query.token;
    const s = new McpServer({ name: 'odoo', version: '0' });
    const text = (o) => ({ content: [{ type: 'text', text: JSON.stringify(o) }] });
    s.registerTool('odoo_read_group', { description: 'Aggregate', inputSchema: { model: z.string() } }, async () => { seenTokens.push(token); return text({ success: true, data: [{ total: 42, token }] }); });
    s.registerTool('odoo_count', { description: 'Count', inputSchema: { model: z.string() } }, async () => text({ success: true, data: 7 }));
    s.registerTool('odoo_unlink', { description: 'DELETE records', inputSchema: { ids: z.array(z.number()) } }, async () => { writesCalled.push('odoo_unlink'); return text({ ok: true }); });
    s.registerTool('odoo_write', { description: 'Write records', inputSchema: { ids: z.array(z.number()) } }, async () => { writesCalled.push('odoo_write'); return text({ ok: true }); });
    const t = new StreamableHTTPServerTransport({ sessionIdGenerator: () => randomUUID(), onsessioninitialized: (id) => sessions.set(id, t) });
    await s.connect(t);
    await t.handleRequest(req, res, req.body);
  });
  return new Promise((resolve) => { const srv = app.listen(0, '127.0.0.1', () => resolve(srv)); });
}

function fakeBackend(registry, calls) {
  const app = express();
  app.get('/api/v1/tenant-mcp-servers/internal/:user/:agent', (req, res) => {
    calls.push({ user: req.params.user, agent: req.params.agent, token: req.headers['x-internal-token'] });
    if (req.headers['x-internal-token'] !== 'internal-secret') return res.status(401).end();
    res.json({ servers: registry[`${req.params.user}/${req.params.agent}`] || [], unavailable: [] });
  });
  return new Promise((resolve) => { const srv = app.listen(0, '127.0.0.1', () => resolve(srv)); });
}

test('odoo: per-tenant token, read-only tools, disabled_tools, SSRF guard, no token leak', async () => {
  const seenTokens = [];
  const calls = [];
  const logs = [];
  const odoo = await fakeOdooMcp(seenTokens);
  const odooBase = `http://127.0.0.1:${odoo.address().port}`;
  const registry = {
    'tenant-a/data_analyst': [{ name: 'odoo', url: `${odooBase}/mcp?token=SECRET_A`, auth_header_name: null, auth_header_value: null, disabled_tools: [] }],
    'tenant-b/data_analyst': [{ name: 'odoo', url: `${odooBase}/mcp?token=SECRET_B`, disabled_tools: ['odoo_count'] }],
    'tenant-evil/data_analyst': [{ name: 'odoo', url: 'http://169.254.169.254/mcp?token=x', disabled_tools: [] }],
    'tenant-wrongname/data_analyst': [{ name: 'other', url: `${odooBase}/mcp?token=Z`, disabled_tools: [] }],
  };
  const backend = await fakeBackend(registry, calls);
  const { app, stop } = createApp({
    key: KEY, baseUrl: 'http://127.0.0.1:1', paths: [],
    backendUrl: `http://127.0.0.1:${backend.address().port}`, backendToken: 'internal-secret', odooBase,
    log: (l, m, a) => logs.push(JSON.stringify([l, m, a])),
  });
  const proxy = await new Promise((r) => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
  const port = proxy.address().port;
  const descr = async (c) => (await c.listTools()).tools.find((t) => t.name === 'execute').description;
  try {
    const a = await connect(port, 'tenant-a', 'data_analyst');
    const da = await descr(a);
    assert.match(da, /codemode\.odoo_read_group/);
    assert.match(da, /codemode\.odoo_count/);
    assert.doesNotMatch(da, /odoo_unlink|odoo_write/, 'write tools never advertised');
    assert.doesNotMatch(da, /SECRET_A/, 'token never shown to the model');
    const ra = await a.callTool({ name: 'execute', arguments: { code: `const g = await codemode.odoo_read_group({model:'sale.order'}); return g.data[0].total` } });
    assert.equal(JSON.parse(ra.content[0].text).result, 42);
    const rw = await a.callTool({ name: 'execute', arguments: { code: `return await codemode.odoo_unlink({ids:[1]})` } });
    assert.equal(rw.isError, true);
    assert.deepEqual(writesCalled.filter((w) => w.startsWith('odoo')), []);

    const b = await connect(port, 'tenant-b', 'data_analyst');
    const db = await descr(b);
    assert.doesNotMatch(db, /odoo_count/, 'tenant disabled_tools honoured');
    await b.callTool({ name: 'execute', arguments: { code: `return await codemode.odoo_read_group({model:'x'})` } });
    assert.deepEqual([...new Set(seenTokens)].sort(), ['SECRET_A', 'SECRET_B']);

    // tenant-supplied URL outside the shared Odoo base is never contacted
    const e = await connect(port, 'tenant-evil', 'data_analyst');
    assert.doesNotMatch(await descr(e), /odoo_/);
    const w = await connect(port, 'tenant-wrongname', 'data_analyst');
    assert.doesNotMatch(await descr(w), /odoo_/);

    // backend was asked with the right tenant + agent type and the internal token
    assert.ok(calls.some((c) => c.user === 'tenant-a' && c.agent === 'data_analyst' && c.token === 'internal-secret'));
    assert.ok(!logs.join('\n').match(/SECRET_[AB]/), 'tenant token must not be logged');
    for (const c of [a, b, e, w]) await c.close();
  } finally {
    await stop(); proxy.close(); backend.close(); odoo.close();
  }
});

test('odoo: backend failure or missing token degrades to native tools only', async () => {
  const calls = [];
  const backend = await fakeBackend({}, calls);
  const up = await fakeUpstream();
  const bad = createApp({ key: KEY, baseUrl: `http://127.0.0.1:${up.address().port}`, paths: ['customer-service'], backendUrl: `http://127.0.0.1:${backend.address().port}`, backendToken: 'WRONG', odooBase: 'http://127.0.0.1:9' });
  const off = createApp({ key: KEY, baseUrl: `http://127.0.0.1:${up.address().port}`, paths: ['customer-service'] }); // no backend config
  const p1 = await new Promise((r) => { const s = bad.app.listen(0, '127.0.0.1', () => r(s)); });
  const p2 = await new Promise((r) => { const s = off.app.listen(0, '127.0.0.1', () => r(s)); });
  try {
    for (const p of [p1, p2]) {
      const c = await connect(p.address().port, 'tenant-a', 'customer_service');
      const d = (await c.listTools()).tools.find((t) => t.name === 'execute').description;
      assert.match(d, /codemode\.list_tickets/);
      assert.doesNotMatch(d, /odoo_/);
      await c.close();
    }
  } finally { await bad.stop(); await off.stop(); p1.close(); p2.close(); backend.close(); up.close(); }
});
