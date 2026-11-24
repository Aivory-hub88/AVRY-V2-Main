// Run: node --test lib/byokOpenRouter.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { openRouterKeyFor, userOpenRouterKey, _cache } = require('./byokOpenRouter');

test.beforeEach(() => _cache.clear());

test('an unauthenticated request never asks the backend and keeps Aivory\'s key', async (t) => {
  const f = t.mock.method(globalThis, 'fetch', async () => { throw new Error('must not be called'); });
  assert.equal(await openRouterKeyFor({}, 'aivory-key', 'tok'), 'aivory-key');
  assert.equal(await openRouterKeyFor({ body: { context: { user_id: 'victim' } } }, 'aivory-key', 'tok'), 'aivory-key');
  assert.equal(f.mock.callCount(), 0);
});

test('an authenticated caller with a key gets it; the lookup is cached', async (t) => {
  const f = t.mock.method(globalThis, 'fetch', async (url) => {
    assert.ok(url.endsWith('/api/v1/byok-keys/internal/user_1/openrouter'));
    return { ok: true, status: 200, json: async () => ({ api_key: 'sk-or-theirs' }) };
  });
  assert.equal(await openRouterKeyFor({ callerUserId: 'user_1' }, 'aivory-key', 'tok'), 'sk-or-theirs');
  assert.equal(await openRouterKeyFor({ callerUserId: 'user_1' }, 'aivory-key', 'tok'), 'sk-or-theirs');
  assert.equal(f.mock.callCount(), 1);
});

test('404 (no key, or BYOK switched off) falls back to Aivory\'s key and is cached', async (t) => {
  const f = t.mock.method(globalThis, 'fetch', async () => ({ ok: false, status: 404 }));
  assert.equal(await openRouterKeyFor({ callerUserId: 'user_2' }, 'aivory-key', 'tok'), 'aivory-key');
  await openRouterKeyFor({ callerUserId: 'user_2' }, 'aivory-key', 'tok');
  assert.equal(f.mock.callCount(), 1);
});

test('backend errors fail soft and are not cached', async (t) => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; return { ok: false, status: 500 }; });
  assert.equal(await userOpenRouterKey('user_3', 'tok'), null);
  assert.equal(await userOpenRouterKey('user_3', 'tok'), null);
  assert.equal(calls, 2, 'a transient failure is retried next call');
  t.mock.restoreAll();
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('down'); });
  assert.equal(await userOpenRouterKey('user_4', 'tok'), null);
});
