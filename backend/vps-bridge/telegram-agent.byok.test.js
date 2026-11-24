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

test('resolveByok takes the backend\'s pick, caches it, and fails soft', async (t) => {
  const seen = [];
  t.mock.method(globalThis, 'fetch', async (u) => {
    seen.push(u);
    return { ok: true, status: 200, json: async () => ({ provider: 'anthropic', api_key: 'sk-ant-x' }) };
  });
  assert.deepEqual(await resolveByok('user-1', 'tok'), { provider: 'anthropic', apiKey: 'sk-ant-x' });
  await resolveByok('user-1', 'tok');
  assert.equal(seen.length, 1, 'second call served from cache');
  assert.ok(seen[0].endsWith('/api/v1/byok-keys/internal/user-1'));

  t.mock.restoreAll();
  t.mock.method(globalThis, 'fetch', async () => ({ ok: false, status: 404 }));
  assert.equal(await resolveByok('user-off', 'tok'), null, '404 = switched off or no key');

  t.mock.restoreAll();
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, status: 200, json: async () => ({ provider: 'mystery', api_key: 'k' }) }));
  assert.equal(await resolveByok('user-3', 'tok'), null, 'unknown provider is ignored');

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

test('an OpenAI-compatible key resolves with its own URL and model, and needs both', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => ({
    ok: true, status: 200,
    json: async () => ({ provider: 'openai_compatible', api_key: 'tg-key0123456789', base_url: 'https://api.together.xyz/v1', model: 'meta-llama/Llama-3.3-70B' }),
  }));
  assert.deepEqual(await resolveByok('user-c1', 'tok'), {
    provider: 'openai_compatible', apiKey: 'tg-key0123456789', baseUrl: 'https://api.together.xyz/v1', model: 'meta-llama/Llama-3.3-70B',
  });

  t.mock.restoreAll();
  t.mock.method(globalThis, 'fetch', async () => ({
    ok: true, status: 200, json: async () => ({ provider: 'openai_compatible', api_key: 'k', base_url: 'https://x.example/v1' }),
  }));
  assert.equal(await resolveByok('user-c2', 'tok'), null, 'no model: unusable, fall back to Aivory');
});

test('the custom endpoint target points at <base>/chat/completions and asks for no OpenRouter fields', () => {
  const ctx = { byok: { provider: 'openai_compatible', apiKey: 'k', baseUrl: 'https://api.together.xyz/v1/', model: 'm1' } };
  const target = llmTarget(ctx, 'aivory-key');
  assert.equal(target.url, 'https://api.together.xyz/v1/chat/completions');
  assert.equal(target.model, 'm1');
  assert.equal(target.key, 'k');
  assert.equal(target.usage, false);
  assert.equal(target.guarded, true);
});

test('a custom endpoint on a private address is refused without any request being made', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => { throw new Error('plain fetch must not be used'); });
  for (const baseUrl of ['https://127.0.0.1/v1', 'https://169.254.169.254/v1', 'https://10.0.0.5/v1', 'http://api.example.com/v1']) {
    const ctx = { usage: { cost: 0, tokens: 0 }, byok: { provider: 'openai_compatible', apiKey: 'k', baseUrl, model: 'm' } };
    await assert.rejects(callLLM([{ role: 'user', content: 'x' }], [], 'aivory-key', undefined, ctx), /Custom endpoint/, baseUrl);
  }
  assert.equal(fetchMock.mock.callCount(), 0);
});
