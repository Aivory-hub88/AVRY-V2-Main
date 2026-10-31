// Credits are charged by OpenRouter's billed cost, not per message.
// Run: node --test telegram-agent.credits.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { _internals } = require('./telegram-agent');

const { recordUsage, creditsForUsage, checkCredits, settleCredits, callLLM } = _internals;

test('a turn costs its billed spend in credits, at least one', () => {
  assert.equal(creditsForUsage({ cost: 0 }), 1);
  // 75k-token turn at peak: ~$0.0233 billed -> 0.0246 with fee -> 6 credits
  assert.equal(creditsForUsage({ cost: 0.0233 }), 6);
  // exactly one credit's worth stays one credit
  assert.equal(creditsForUsage({ cost: 0.004365 / 1.055 }), 1);
});

test('usage adds up across calls and falls back to tokens without a cost', () => {
  const ctx = { usage: { cost: 0, tokens: 0 } };
  recordUsage(ctx, { usage: { prompt_tokens: 9000, completion_tokens: 1000, total_tokens: 10000, cost: 0.003 } });
  recordUsage(ctx, { usage: { prompt_tokens: 1000, completion_tokens: 0 } });
  assert.equal(ctx.usage.tokens, 11000);
  assert.ok(Math.abs(ctx.usage.cost - (0.003 + 1000 * 0.31e-6)) < 1e-12);
  recordUsage(ctx, {}); // no usage block: unchanged
  assert.equal(ctx.usage.tokens, 11000);
});

test('callLLM asks OpenRouter for usage and records it', async (t) => {
  let body;
  t.mock.method(globalThis, 'fetch', async (_url, init) => {
    body = JSON.parse(init.body);
    return {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'hi' } }],
        usage: { total_tokens: 500, cost: 0.0002 },
      }),
    };
  });
  const ctx = { usage: { cost: 0, tokens: 0 } };
  await callLLM([{ role: 'user', content: 'x' }], [], 'k', undefined, ctx);
  assert.deepEqual(body.usage, { include: true });
  assert.equal(ctx.usage.tokens, 500);
});

test('empty balance is refused before any LLM call; errors fail open', async (t) => {
  const ctx = { user_id: 'u1', internalKey: 'k' };
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ balance: 0 }) }));
  assert.equal((await checkCredits(ctx)).allowed, false);
  t.mock.restoreAll();
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ unlimited: true, balance: null }) }));
  assert.equal((await checkCredits(ctx)).allowed, true);
  t.mock.restoreAll();
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('down'); });
  assert.equal((await checkCredits(ctx)).allowed, true);
});

test('settling sends allow_partial with the token count', async (t) => {
  let sent;
  t.mock.method(globalThis, 'fetch', async (_url, init) => {
    sent = JSON.parse(init.body);
    return { ok: true, json: async () => ({}) };
  });
  await settleCredits({ user_id: 'u1', internalKey: 'k', agent_type: 'a' }, 6, 'agent_message', { tokens: 75000 });
  assert.equal(sent.amount, 6);
  assert.equal(sent.allow_partial, true);
  assert.equal(sent.meta.tokens, 75000);
});
