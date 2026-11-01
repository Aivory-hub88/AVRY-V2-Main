// Console turns can be relayed from Cerveau's /webhook/stream as SSE.
// Run: node --test telegram-agent.stream.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const { _internals } = require('./telegram-agent');

const { streamCerveau } = _internals;

function fakeRes() {
  const res = {
    headers: {}, written: [], statusCode: null, writableEnded: false, destroyed: false, closeHandlers: [],
    status(c) { res.statusCode = c; return res; },
    setHeader(k, v) { res.headers[k] = v; },
    flushHeaders() { res.flushed = true; },
    write(chunk) { res.written.push(String(chunk)); return true; },
    end() { res.writableEnded = true; },
    on(ev, fn) { if (ev === 'close') res.closeHandlers.push(fn); },
  };
  return res;
}

const ctx = { user_id: 'u1', agent_type: 'leads_qualifier', session_id: 's1', internalKey: 'k', active_agents: ['leads_qualifier'] };

test('relays chunk frames as they arrive and reports a clean finish', async (t) => {
  process.env.CERVEAU_WEBHOOK_SECRET = 'test-secret';
  let seen;
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    seen = { url, headers: init.headers };
    // The `done` frame is split across two network chunks on purpose.
    return {
      ok: true,
      body: Readable.from([
        Buffer.from('data: {"type":"chunk","content":"Hal"}\n\n'),
        Buffer.from('data: {"type":"chunk","content":"o"}\n\ndata: {"type":"do'),
        Buffer.from('ne","pending_approval":null}\n\n'),
      ]),
    };
  });
  const res = fakeRes();
  const finished = await streamCerveau(ctx, 'hi', res);
  assert.equal(finished, true);
  assert.match(seen.url, /\/webhook\/stream$/);
  assert.equal(seen.headers.Accept, 'text/event-stream');
  assert.equal(seen.headers['X-Tenant-Id'], 'u1');
  assert.equal(res.headers['Content-Type'], 'text/event-stream; charset=utf-8');
  assert.equal(res.written.length, 3, 'each upstream chunk is forwarded without waiting for the rest');
  assert.equal(res.written.join(''),
    'data: {"type":"chunk","content":"Hal"}\n\ndata: {"type":"chunk","content":"o"}\n\ndata: {"type":"done","pending_approval":null}\n\n');
  assert.equal(res.writableEnded, true);
});

test('an upstream error frame is relayed but does not count as finished', async (t) => {
  process.env.CERVEAU_WEBHOOK_SECRET = 'test-secret';
  t.mock.method(globalThis, 'fetch', async () => ({
    ok: true,
    body: Readable.from([Buffer.from('data: {"type":"error","message":"LLM request failed"}\n\n')]),
  }));
  const res = fakeRes();
  assert.equal(await streamCerveau(ctx, 'hi', res), false);
  assert.match(res.written.join(''), /LLM request failed/);
});

test('a rejected upstream request throws before any byte is written', async (t) => {
  process.env.CERVEAU_WEBHOOK_SECRET = 'test-secret';
  t.mock.method(globalThis, 'fetch', async () => ({ ok: false, status: 429, text: async () => 'slow down' }));
  const res = fakeRes();
  await assert.rejects(() => streamCerveau(ctx, 'hi', res), /Cerveau 429/);
  assert.equal(res.flushed, undefined);
  assert.deepEqual(res.written, []);
});

test('a stream that breaks mid-way ends with an error frame', async (t) => {
  process.env.CERVEAU_WEBHOOK_SECRET = 'test-secret';
  t.mock.method(globalThis, 'fetch', async () => ({
    ok: true,
    body: (async function* () {
      yield Buffer.from('data: {"type":"chunk","content":"x"}\n\n');
      throw new Error('socket hang up');
    })(),
  }));
  const res = fakeRes();
  assert.equal(await streamCerveau(ctx, 'hi', res), false);
  assert.match(res.written.at(-1), /"type":"error"/);
  assert.equal(res.writableEnded, true);
});
