// X-Space-Id: the room id a workspace turn forwards to Cerveau.
// Run: node --test telegram-agent.space-id.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { _internals } = require('./telegram-agent');

const { sanitizeSpaceId } = _internals;

test('sanitizeSpaceId accepts safe room ids', () => {
  assert.equal(sanitizeSpaceId('room-9_a.b'), 'room-9_a.b');
  assert.equal(sanitizeSpaceId('  abc123  '), 'abc123');
});

test('sanitizeSpaceId drops anything Cerveau would reject', () => {
  for (const bad of [undefined, null, '', '   ', '.', '..', '.x', 'a/b', 'a b', 'a,b', '../x', 'x'.repeat(129)]) {
    assert.equal(sanitizeSpaceId(bad), null, JSON.stringify(bad));
  }
});
