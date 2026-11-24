// SSRF guard for tenant-typed LLM endpoints.
// Run: node --test lib/guardedHttps.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { guardedPostJson, createGuardedLookup, isDeniedIp, GuardedHttpsError } = require('./guardedHttps');

test('deny-list covers loopback, private, link-local, metadata, CGNAT and reserved ranges', () => {
  for (const ip of [
    '127.0.0.1', '127.5.5.5', '0.0.0.0', '10.0.0.5', '172.16.0.1', '172.31.255.255', '192.168.1.1',
    '169.254.169.254', '169.254.0.23', '100.64.0.1', '100.127.255.255', '198.18.0.1', '224.0.0.1', '255.255.255.255',
    '::1', '::', 'fe80::1', 'fc00::1', 'fd12:3456::1', 'ff02::1', '2001:db8::1',
    '::ffff:127.0.0.1', '::ffff:10.0.0.1', '::ffff:7f00:1', '64:ff9b::a00:1',
    'not-an-ip', '',
  ]) assert.equal(isDeniedIp(ip), true, `${ip} must be denied`);
});

test('ordinary public addresses are allowed', () => {
  for (const ip of ['8.8.8.8', '1.1.1.1', '104.18.2.161', '172.15.0.1', '172.32.0.1', '2606:4700:4700::1111', '::ffff:8.8.8.8'])
    assert.equal(isDeniedIp(ip), false, `${ip} must be allowed`);
});

test('the lookup refuses a host if ANY of its addresses is private (multi-A rebinding shape)', async () => {
  const resolver = (addrs) => (_h, _o, cb) => cb(null, addrs);
  const run = (addrs, opts = {}) =>
    new Promise((resolve) => createGuardedLookup(resolver(addrs))('x.example', opts, (err, a, f) => resolve({ err, a, f })));

  const mixed = await run([{ address: '8.8.8.8', family: 4 }, { address: '10.0.0.5', family: 4 }]);
  assert.ok(mixed.err instanceof GuardedHttpsError);

  const ok = await run([{ address: '8.8.8.8', family: 4 }]);
  assert.equal(ok.err, null);
  assert.equal(ok.a, '8.8.8.8');
  assert.equal(ok.f, 4);

  const all = await run([{ address: '8.8.8.8', family: 4 }], { all: true });
  assert.deepEqual(all.a, [{ address: '8.8.8.8', family: 4 }]);

  const none = await run([]);
  assert.ok(none.err instanceof GuardedHttpsError);
});

test('guardedPostJson refuses bad URLs before opening any socket', async () => {
  for (const url of [
    'http://api.example.com/v1/chat/completions',          // not https
    'https://user:pw@api.example.com/v1',                  // credentials
    'https://127.0.0.1/v1',                                // loopback literal
    'https://169.254.169.254/latest/meta-data',            // cloud metadata
    'https://[::1]/v1',                                    // v6 loopback literal
    'https://[::ffff:10.0.0.1]/v1',                        // v4-mapped private
    'not a url',
  ]) {
    await assert.rejects(guardedPostJson(url, {}, '{}', { timeoutMs: 500 }), GuardedHttpsError, url);
  }
});

test('a hostname that resolves to loopback is refused (localhost)', async () => {
  await assert.rejects(guardedPostJson('https://localhost/v1/chat/completions', {}, '{}', { timeoutMs: 2000 }), /not allowed|resolve/);
});
