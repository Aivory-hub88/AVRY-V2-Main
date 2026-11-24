// Run: node --test lib/callerAuth.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { callerAuth } = require('./callerAuth');

const run = (headers, secret = 'shhh-shared-secret') => {
  const req = { headers };
  callerAuth(() => secret)(req, {}, () => {});
  return req.callerUserId;
};

test('the right secret plus a user id identifies the caller', () => {
  assert.equal(run({ 'x-aivory-caller': 'shhh-shared-secret', 'x-aivory-user': 'user_d0985ab099ef142a' }), 'user_d0985ab099ef142a');
});

test('anything short of that leaves the request anonymous', () => {
  const good = { 'x-aivory-caller': 'shhh-shared-secret', 'x-aivory-user': 'user_1' };
  assert.equal(run({ ...good, 'x-aivory-caller': 'wrong-secret-value!' }), undefined, 'wrong secret');
  assert.equal(run({ ...good, 'x-aivory-caller': 'short' }), undefined, 'different length');
  assert.equal(run({ 'x-aivory-user': 'user_1' }), undefined, 'no secret presented');
  assert.equal(run({ 'x-aivory-caller': 'shhh-shared-secret' }), undefined, 'no user');
  assert.equal(run({ ...good, 'x-aivory-user': 'user 1; DROP' }), undefined, 'malformed user id');
  assert.equal(run({ ...good, 'x-aivory-user': 'x'.repeat(200) }), undefined, 'oversized user id');
  assert.equal(run({}), undefined, 'a plain request');
});

test('with no secret configured nothing can authenticate (feature is inert)', () => {
  assert.equal(run({ 'x-aivory-caller': '', 'x-aivory-user': 'user_1' }, ''), undefined);
  assert.equal(run({ 'x-aivory-caller': 'undefined', 'x-aivory-user': 'user_1' }, undefined), undefined);
});
