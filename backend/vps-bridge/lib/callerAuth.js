/**
 * Identifies which Aivory user a bridge request is made for, but only when the
 * caller proves it is the dashboard server.
 *
 * The bridge has no request authentication (requireInternalToken is a no-op)
 * and listens on 0.0.0.0, so a `user_id` in a request body is just a claim:
 * trusting it for BYOK would let anyone who can reach the port spend another
 * user's own provider key by naming them. The dashboard instead sends
 *   X-Aivory-Caller: <BRIDGE_CALLER_TOKEN>   (shared secret)
 *   X-Aivory-User:   <user id from the verified JWT>
 * and only a request carrying the right secret gets `req.callerUserId`.
 * Everything else, including every request today, is unchanged: no identity,
 * Aivory's own key. With BRIDGE_CALLER_TOKEN unset the whole thing is inert.
 */
const crypto = require('node:crypto');

const USER_ID_RE = /^[A-Za-z0-9._:-]{1,128}$/;

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/** Express middleware: sets req.callerUserId for an authenticated dashboard call. */
function callerAuth(getSecret = () => process.env.BRIDGE_CALLER_TOKEN) {
  return (req, _res, next) => {
    const secret = getSecret();
    const presented = req.headers['x-aivory-caller'];
    const user = req.headers['x-aivory-user'];
    if (secret && typeof presented === 'string' && typeof user === 'string' && safeEqual(presented, secret) && USER_ID_RE.test(user)) {
      req.callerUserId = user;
    }
    next();
  };
}

module.exports = { callerAuth, USER_ID_RE };
