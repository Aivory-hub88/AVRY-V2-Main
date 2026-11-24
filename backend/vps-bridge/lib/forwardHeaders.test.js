// Run: node --test lib/forwardHeaders.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { stripForwardHeaders } = require('./forwardHeaders');

test('secrets and client-supplied keys are never relayed, ordinary headers are', () => {
  const out = stripForwardHeaders({
    host: 'bridge.local',
    'Content-Length': '12',
    'x-aivory-caller': 'shared-secret',
    'X-Aivory-User': 'user_1',
    'X-Provider-Key': 'sk-or-client-supplied0123456789',
    accept: 'application/json',
    'x-request-id': 'abc',
    authorization: 'Bearer something',
  });
  assert.deepEqual(out, { accept: 'application/json', 'x-request-id': 'abc', authorization: 'Bearer something' });
});

test('handles empty or missing headers', () => {
  assert.deepEqual(stripForwardHeaders({}), {});
  assert.deepEqual(stripForwardHeaders(undefined), {});
});
