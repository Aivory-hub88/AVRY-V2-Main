// BYOK: a turn on the operator's own provider key goes to that provider.
// Run: node --test telegram-agent.byok.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { _internals } = require('./telegram-agent');

const { callLLM, resolveByok, llmTarget, cerveauByokKey, cerveauHeaders } = _internals;

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

test('Cerveau only gets the key for an OpenRouter BYOK turn, and only once CERVEAU_BYOK=1', async (t) => {
  const ctx = (provider) => ({
    user_id: 'u1', agent_type: 'autonomous', session_id: 's', active_agents: ['autonomous'],
    byok: { provider, apiKey: 'sk-or-v1-userkey0123456789abcdef' },
  });
  const prev = process.env.CERVEAU_BYOK;
  t.after(() => { if (prev === undefined) delete process.env.CERVEAU_BYOK; else process.env.CERVEAU_BYOK = prev; });

  delete process.env.CERVEAU_BYOK;
  assert.equal(cerveauByokKey(ctx('openrouter')), null, 'flag off: key withheld, turn stays charged');
  assert.equal((await cerveauHeaders(ctx('openrouter'), 'secret'))['X-Provider-Key'], undefined);

  process.env.CERVEAU_BYOK = '1';
  assert.equal(cerveauByokKey(ctx('openrouter')), 'sk-or-v1-userkey0123456789abcdef');
  assert.equal((await cerveauHeaders(ctx('openrouter'), 'secret'))['X-Provider-Key'], 'sk-or-v1-userkey0123456789abcdef');
  assert.equal(cerveauByokKey(ctx('anthropic')), null, 'Cerveau runs OpenRouter models only');
  assert.equal(cerveauByokKey({ user_id: 'u1' }), null);
});
