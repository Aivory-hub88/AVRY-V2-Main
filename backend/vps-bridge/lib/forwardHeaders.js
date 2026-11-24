/**
 * Request headers the bridge relays to the Zeroclaw daemons.
 *
 * Dropped, never forwarded:
 *  - host / content-length: recomputed for the outbound request.
 *  - x-aivory-caller: our shared secret. The daemon has no business holding it.
 *  - x-aivory-user: only meaningful to the bridge, after the secret is checked.
 *  - x-provider-key: a client-supplied key. The only X-Provider-Key a daemon
 *    sees is the one the bridge itself adds for an authenticated caller, so a
 *    request can't bring its own key to dodge the user's BYOK switch.
 */
const DROPPED = new Set(['host', 'content-length', 'x-aivory-caller', 'x-aivory-user', 'x-provider-key']);

function stripForwardHeaders(headers) {
  const out = {};
  for (const [name, value] of Object.entries(headers || {})) {
    if (!DROPPED.has(name.toLowerCase())) out[name] = value;
  }
  return out;
}

module.exports = { stripForwardHeaders };
