/**
 * SSRF-safe HTTPS POST for URLs a tenant typed in (BYOK "OpenAI-compatible"
 * endpoints). The bridge shares a host with loopback-only services, so a URL
 * that resolves to 127.0.0.1, the cloud metadata address or a private range
 * must never be connected to.
 *
 * Mirrors the controls of avry-backend's app/services/guarded_fetch.py:
 *   1. https:// only, no credentials in the URL.
 *   2. Every address the hostname resolves to is checked against a deny-list;
 *      if ANY is denied the host is refused (a client could reconnect on any).
 *   3. The check happens inside the socket's own `lookup`, so the address that
 *      was validated is the address that is connected to: no resolve-then-
 *      re-resolve gap for DNS rebinding.
 *   4. IP-literal hosts skip `lookup` entirely in Node, so they are checked up
 *      front.
 *   5. Redirects are never followed (a 3xx is an error).
 *   6. Response size and total time are capped.
 */
const dns = require('node:dns');
const https = require('node:https');
const net = require('node:net');

const MAX_RESPONSE_BYTES = 4 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 45000;

const DENIED = new net.BlockList();
[
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24],
  ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
].forEach(([net4, prefix]) => DENIED.addSubnet(net4, prefix, 'ipv4'));
[
  ['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8],
  ['2001:db8::', 32], ['100::', 64],
].forEach(([net6, prefix]) => DENIED.addSubnet(net6, prefix, 'ipv6'));

/** IPv4 embedded in an IPv6 address (::ffff:a.b.c.d, 64:ff9b::a.b.c.d), or null. */
function embeddedV4(ip) {
  const m = /^(?:::ffff:|64:ff9b::)(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
  if (m) return m[1];
  // Hex form, e.g. ::ffff:7f00:1
  const h = /^(?:::ffff:|64:ff9b::)([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(ip);
  if (h) {
    const hi = parseInt(h[1], 16);
    const lo = parseInt(h[2], 16);
    return `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
  }
  return null;
}

function isDeniedIp(ip) {
  const family = net.isIP(ip);
  if (!family) return true; // not an address at all: refuse
  if (family === 4) return DENIED.check(ip, 'ipv4');
  const v4 = embeddedV4(ip);
  if (v4) return DENIED.check(v4, 'ipv4');
  return DENIED.check(ip, 'ipv6');
}

class GuardedHttpsError extends Error {}

/** A `lookup` for https.request that refuses any host with a denied address. */
function createGuardedLookup(resolve = dns.lookup) {
  return (hostname, options, callback) => {
    const cb = typeof options === 'function' ? options : callback;
    const opts = typeof options === 'function' ? {} : options || {};
    resolve(hostname, { all: true, verbatim: true }, (err, addresses) => {
      if (err) return cb(err);
      if (!addresses || !addresses.length) return cb(new GuardedHttpsError('host did not resolve'));
      if (addresses.some((a) => isDeniedIp(a.address))) {
        return cb(new GuardedHttpsError('that host is not allowed'));
      }
      if (opts.all) return cb(null, addresses);
      return cb(null, addresses[0].address, addresses[0].family);
    });
  };
}

/**
 * POST a JSON string to an https URL. Resolves { status, body } (body a
 * string); rejects with GuardedHttpsError on any guard rejection, timeout or
 * oversize response. Never follows a redirect.
 */
function guardedPostJson(url, headers, bodyString, opts = {}) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, maxBytes = MAX_RESPONSE_BYTES, lookup = createGuardedLookup() } = opts;
  return new Promise((resolve, reject) => {
    let parts;
    try {
      parts = new URL(url);
    } catch {
      return reject(new GuardedHttpsError('invalid URL'));
    }
    if (parts.protocol !== 'https:') return reject(new GuardedHttpsError('only https:// URLs are allowed'));
    if (parts.username || parts.password) return reject(new GuardedHttpsError('credentials in the URL are not allowed'));
    const host = parts.hostname.replace(/^\[|\]$/g, '');
    if (net.isIP(host) && isDeniedIp(host)) return reject(new GuardedHttpsError('that host is not allowed'));

    let done = false;
    const finish = (fn, value) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      fn(value);
    };
    const req = https.request(
      {
        protocol: 'https:',
        hostname: host,
        port: parts.port || 443,
        path: `${parts.pathname}${parts.search}`,
        method: 'POST',
        headers: { ...headers, 'Content-Length': Buffer.byteLength(bodyString) },
        lookup,
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400) {
          res.resume();
          return finish(reject, new GuardedHttpsError('the server tried to redirect, which is not allowed'));
        }
        const chunks = [];
        let size = 0;
        res.on('data', (c) => {
          size += c.length;
          if (size > maxBytes) {
            req.destroy();
            return finish(reject, new GuardedHttpsError('the response was too large'));
          }
          chunks.push(c);
        });
        res.on('end', () => finish(resolve, { status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
        res.on('error', (e) => finish(reject, new GuardedHttpsError(e.message)));
      }
    );
    const timer = setTimeout(() => {
      req.destroy();
      finish(reject, new GuardedHttpsError('request timed out'));
    }, timeoutMs);
    req.on('error', (e) => finish(reject, e instanceof GuardedHttpsError ? e : new GuardedHttpsError(e.message)));
    req.end(bodyString);
  });
}

module.exports = { guardedPostJson, createGuardedLookup, isDeniedIp, GuardedHttpsError };
