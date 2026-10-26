// ADR-021 §4.3: turn_origin goes to Cerveau as X-Turn-Origin, run_outcome comes back.
// Run: node --test telegram-agent.run-outcome.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { _internals } = require('./telegram-agent');

const { callCerveau, sanitizeTurnOrigin, runOutcomeFields } = _internals;

test('only unattended origins are forwarded', () => {
  assert.equal(sanitizeTurnOrigin('reminder'), 'reminder');
  assert.equal(sanitizeTurnOrigin(' WAKE '), 'wake');
  assert.equal(sanitizeTurnOrigin('cron'), 'cron');
  assert.equal(sanitizeTurnOrigin('human'), null);
  assert.equal(sanitizeTurnOrigin(undefined), null);
});

test('run outcome is relayed only for known values', () => {
  assert.deepEqual(runOutcomeFields({ run_outcome: 'quiet' }), { runOutcome: 'quiet', runFailureReason: null });
  assert.deepEqual(runOutcomeFields({ run_outcome: 'failed', run_failure_reason: 'Odoo down' }), {
    runOutcome: 'failed',
    runFailureReason: 'Odoo down',
  });
  assert.deepEqual(runOutcomeFields({ run_outcome: 'weird' }), { runOutcome: null, runFailureReason: null });
  assert.deepEqual(runOutcomeFields({}), { runOutcome: null, runFailureReason: null });
});

test('callCerveau sends X-Turn-Origin and returns the run outcome', async (t) => {
  process.env.CERVEAU_WEBHOOK_SECRET = 'test-secret';
  const seen = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    seen.push(init.headers);
    return {
      ok: true,
      json: async () => ({
        response: 'Nothing new.',
        pending_approval: null,
        team_actions: [],
        run_outcome: 'quiet',
        run_failure_reason: null,
      }),
    };
  });
  const ctx = {
    user_id: 'u1',
    agent_type: 'autonomous',
    session_id: 's1',
    room_turn: true,
    turn_origin: 'reminder',
    active_agents: ['autonomous'],
  };
  const out = await callCerveau(ctx, 'hi');
  assert.equal(seen[0]['X-Turn-Origin'], 'reminder');
  assert.equal(seen[0]['X-Room-Channel'], 'discussion');
  assert.equal(out.runOutcome, 'quiet');
  assert.equal(out.reply, 'Nothing new.');

  await callCerveau({ ...ctx, turn_origin: null }, 'hi');
  assert.equal('X-Turn-Origin' in seen[1], false);
});
