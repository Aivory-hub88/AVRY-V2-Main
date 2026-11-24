// BYOK: a turn on the operator's own provider key goes to that provider.
// Run: node --test telegram-agent.byok.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { _internals } = require('./telegram-agent');

const { callLLM, resolveByok, llmTarget } = _internals;

test('without BYOK the turn goes to OpenRouter on the Aivory key', () => {
  const t = llmTarget({}, 'aivory-key');
  assert.equal(t.url, 'https://openrouter.ai/api/v1/chat/completions');
  assert.equal(t.key, 'aivory-key');
  assert.equal(t.usage, true);
});

test('an Anthropic BYOK turn hits Anthropic with the user key and no OpenRouter fields', async (t) => {
  let url, headers, body;
  t.mock.method(globalThis, 'fetch', async (u, init) => {
    url = u; headers = init.headers; body = JSON.parse(init.body);
    return { ok: true, json: async () => ({ choices: [{ message: { content: 'hi' } }] }) };
  });
  const ctx = { usage: { cost: 0, tokens: 0 }, byok: { provider: 'anthropic', apiKey: 'sk-ant-user' } };
  await callLLM([{ role: 'user', content: 'x' }], [], 'aivory-key', undefined, ctx);
  assert.equal(url, 'https://api.anthropic.com/v1/chat/completions');
  assert.equal(headers.Authorization, 'Bearer sk-ant-user');
  assert.equal(body.usage, undefined);
});

test('resolveByok picks the first provider with a key, caches, and fails soft', async (t) => {
  const seen = [];
  t.mock.method(globalThis, 'fetch', async (u) => {
    seen.push(u);
    if (u.endsWith('/openrouter')) return { ok: false, status: 404 };
    return { ok: true, status: 200, json: async () => ({ api_key: 'sk-ant-x' }) };
  });
  const got = await resolveByok('user-1', 'tok');
  assert.deepEqual(got, { provider: 'anthropic', apiKey: 'sk-ant-x' });
  await resolveByok('user-1', 'tok');
  assert.equal(seen.length, 2, 'second call served from cache');

  t.mock.restoreAll();
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('down'); });
  assert.equal(await resolveByok('user-2', 'tok'), null);
});
