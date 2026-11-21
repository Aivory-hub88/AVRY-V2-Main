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

async function connect(port, tenant) {
  const c = new Client({ name: 't', version: '0' });
  await c.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp/codemode?tenant_id=${tenant}`), { requestInit: { headers: { 'x-bridge-key': KEY } } }));
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
  const base = `http://127.0.0.1:${proxy.address().port}/mcp/codemode`;
  try {
    assert.equal((await fetch(`${base}?tenant_id=x`, { method: 'POST' })).status, 401);
    assert.equal((await fetch(`${base}?tenant_id=../etc`, { method: 'POST', headers: { 'x-bridge-key': KEY } })).status, 400);
    assert.equal((await fetch(base, { method: 'POST', headers: { 'x-bridge-key': KEY } })).status, 400);
  } finally { await stop(); proxy.close(); }
});
