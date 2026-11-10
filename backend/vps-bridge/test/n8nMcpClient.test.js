'use strict';
// Mock of n8n's built-in MCP endpoint (/mcp-server/http): checks auth, the
// handshake, and the tool names/arguments the client sends.
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const TOKEN = 'test-token';
const calls = [];
let sseMode = false;
let statelessSession = true;

function reply(res, envelope) {
  if (sseMode) {
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    res.end(`event: message\ndata: ${JSON.stringify(envelope)}\n\n`);
  } else {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(envelope));
  }
}

const server = http.createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => (raw += c));
  req.on('end', () => {
    if (req.headers.authorization !== `Bearer ${TOKEN}`) {
      res.writeHead(401);
      return res.end('unauthorized');
    }
    const msg = JSON.parse(raw);
    calls.push(msg);
    if (msg.method === 'initialize') {
      if (!statelessSession) res.setHeader('mcp-session-id', 'sess-1');
      return reply(res, { jsonrpc: '2.0', id: msg.id, result: { protocolVersion: '2025-03-26', capabilities: {}, serverInfo: { name: 'n8n' } } });
    }
    if (msg.method === 'notifications/initialized') { res.writeHead(202); return res.end(); }
    if (msg.method === 'tools/call') {
      const { name, arguments: args } = msg.params;
      if (name === 'search_nodes') {
        const results = [
          'Query "gmail":',
          '- n8n-nodes-base.gmail: "Gmail"  @builderHint send and read email',
          '- n8n-nodes-base.gmailTrigger: "Gmail Trigger"',
          '  related: n8n-nodes-base.googleSheets',
        ].join('\n');
        return reply(res, { jsonrpc: '2.0', id: msg.id, result: { content: [{ type: 'text', text: results }], structuredContent: { results } } });
      }
      if (name === 'get_node_types') {
        const definitions = `// ${args.nodeIds[0]}\ninterface GmailParams { resource: 'message' }`;
        return reply(res, { jsonrpc: '2.0', id: msg.id, result: { content: [{ type: 'text', text: definitions }], structuredContent: { definitions } } });
      }
      if (name === 'validate_node_config') {
        const bad = args.nodes[0].parameters.bad;
        const structured = bad
          ? { valid: false, results: [{ index: 0, type: args.nodes[0].type, valid: false, errors: [{ path: 'bad', message: 'nope' }] }] }
          : { valid: true, results: [{ index: 0, type: args.nodes[0].type, valid: true }] };
        return reply(res, { jsonrpc: '2.0', id: msg.id, result: { content: [{ type: 'text', text: JSON.stringify(structured) }], structuredContent: structured } });
      }
    }
    reply(res, { jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: 'unknown' } });
  });
});

let client;
test.before(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  process.env.N8N_MCP_URL = `http://127.0.0.1:${server.address().port}/mcp-server/http`;
  process.env.N8N_MCP_AUTH_TOKEN = TOKEN;
  client = require('../n8nMcpClient');
});
test.after(() => server.close());
test.beforeEach(() => { calls.length = 0; client._clearCache(); client._clearSession(); sseMode = false; statelessSession = true; });

test('search_nodes: sends {queries:[q]} and extracts candidates in rank order', async () => {
  const out = await client.searchNodes('send gmail email', { limit: 8 });
  const call = calls.find((c) => c.method === 'tools/call');
  assert.equal(call.params.name, 'search_nodes');
  assert.deepEqual(call.params.arguments, { queries: ['send gmail email'] });
  assert.deepEqual(out.map((c) => c.workflowNodeType), ['n8n-nodes-base.gmail', 'n8n-nodes-base.gmailTrigger', 'n8n-nodes-base.googleSheets']);
  assert.equal(out[0].displayName, 'Gmail');
  assert.equal(out[0].relevance, 'high');
  assert.equal(out[1].category, 'trigger');
  assert.equal(out[0].package, 'n8n-nodes-base');
});

test('handshake happens once across calls, with the initialized notification', async () => {
  await client.searchNodes('a');
  await client.searchNodes('b');
  assert.equal(calls.filter((c) => c.method === 'initialize').length, 1);
  assert.equal(calls.filter((c) => c.method === 'notifications/initialized').length, 1);
});

test('works with SSE responses and a stateful session id', async () => {
  sseMode = true;
  statelessSession = false;
  const out = await client.searchNodes('gmail');
  assert.equal(out[0].nodeType, 'n8n-nodes-base.gmail');
});

test('getNodeSchema: short ids are expanded, result is cached', async () => {
  const a = await client.getNodeSchema('nodes-base.gmail');
  assert.equal(a.nodeType, 'n8n-nodes-base.gmail');
  assert.equal(a.displayName, 'Gmail');
  assert.match(a.typeDefinitions, /GmailParams/);
  const toolCalls = () => calls.filter((c) => c.method === 'tools/call').length;
  const before = toolCalls();
  await client.getNodeSchema('n8n-nodes-base.gmail');
  assert.equal(toolCalls(), before, 'second lookup served from cache');
  assert.deepEqual(calls.find((c) => c.method === 'tools/call').params.arguments, { nodeIds: ['n8n-nodes-base.gmail'] });
});

test('validateNodeConfig: maps the native result to {valid, errors, warnings}', async () => {
  const ok = await client.validateNodeConfig('nodes-base.set', { a: 1 }, 'minimal');
  assert.equal(ok.valid, true);
  const sent = calls.find((c) => c.method === 'tools/call').params.arguments;
  assert.deepEqual(sent, { nodes: [{ type: 'n8n-nodes-base.set', typeVersion: 1, parameters: { a: 1 } }] });
  const bad = await client.validateNodeConfig('n8n-nodes-base.set', { bad: true });
  assert.equal(bad.valid, false);
  assert.deepEqual(bad.errors, [{ path: 'bad', message: 'nope' }]);
});

test('isAvailable is true with a good token', async () => {
  assert.equal(await client.isAvailable(), true);
});

test('wrong token: isAvailable false and everything degrades to neutral values', async () => {
  const good = process.env.N8N_MCP_AUTH_TOKEN;
  process.env.N8N_MCP_AUTH_TOKEN = 'wrong';
  client._clearSession();
  try {
    assert.equal(await client.isAvailable(), false);
    assert.deepEqual(await client.searchNodes('gmail'), []);
    assert.equal(await client.getNodeSchema('n8n-nodes-base.gmail'), null);
    const v = await client.validateNodeConfig('n8n-nodes-base.set', {});
    assert.equal(v.valid, true);
    assert.ok(v.warnings.length > 0);
  } finally {
    process.env.N8N_MCP_AUTH_TOKEN = good;
  }
});

test('the legacy AUTH_TOKEN is never sent', async () => {
  const good = process.env.N8N_MCP_AUTH_TOKEN;
  delete process.env.N8N_MCP_AUTH_TOKEN;
  process.env.AUTH_TOKEN = TOKEN; // would authenticate if it were (wrongly) used
  client._clearSession();
  try {
    assert.equal(await client.isAvailable(), false);
  } finally {
    process.env.N8N_MCP_AUTH_TOKEN = good;
    delete process.env.AUTH_TOKEN;
  }
});

test('nothing configured: unavailable, no throw', async () => {
  const url = process.env.N8N_MCP_URL;
  process.env.N8N_MCP_URL = '';
  try {
    assert.equal(await client.isAvailable(), false);
    assert.deepEqual(await client.searchNodes('x'), []);
  } finally {
    process.env.N8N_MCP_URL = url;
  }
});
