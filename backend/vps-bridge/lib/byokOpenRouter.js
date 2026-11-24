/**
 * The calling user's own OpenRouter key (BYOK), for the bridge's direct
 * OpenRouter handlers (console, workflow copilot, roadmap).
 *
 * Plan gates and run counters live in the dashboard routes and are untouched:
 * BYOK only changes whose key pays for the model call. There is no silent
 * fallback to Aivory's key when the user's key fails: that would spend our
 * money against the user's explicit choice; they can switch BYOK off instead.
 */
const BACKEND_URL = () => (process.env.BACKEND_INTERNAL_URL || 'http://localhost:8081').replace(/\/$/, '');
const TTL_MS = 15 * 1000; // short, so flipping the switch takes effect within seconds

const cache = new Map(); // userId -> { at, key }

/** The user's OpenRouter key if they have one and BYOK is on, else null. Never throws. */
async function userOpenRouterKey(userId, internalKey) {
  if (!userId) return null;
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.key;
  try {
    const res = await fetch(`${BACKEND_URL()}/api/v1/byok-keys/internal/${encodeURIComponent(userId)}/openrouter`, {
      headers: { 'X-Internal-Token': internalKey },
      signal: AbortSignal.timeout(5000),
    });
    if (res.status === 404) {
      cache.set(userId, { at: Date.now(), key: null });
      return null;
    }
    if (!res.ok) {
      console.error(`[byok] openrouter lookup returned ${res.status} (using Aivory key)`);
      return null; // transient: don't cache
    }
    const data = await res.json();
    const key = data && typeof data.api_key === 'string' && data.api_key ? data.api_key : null;
    cache.set(userId, { at: Date.now(), key });
    return key;
  } catch (err) {
    console.error('[byok] openrouter lookup failed (using Aivory key):', err.message);
    return null;
  }
}

/** The key a request should use: the caller's own if authenticated and set, else `fallback`. */
async function openRouterKeyFor(req, fallback, internalKey) {
  return (req && req.callerUserId && (await userOpenRouterKey(req.callerUserId, internalKey))) || fallback;
}

module.exports = { userOpenRouterKey, openRouterKeyFor, _cache: cache };
