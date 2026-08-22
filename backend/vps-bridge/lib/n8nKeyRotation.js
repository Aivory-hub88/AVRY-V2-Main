/**
 * n8n API Key Rotation — round-robin across N8N_API_KEY_1, _2, _3
 *
 * Falls back to legacy N8N_API_KEY if rotation keys are not set.
 * Thread-safe for single-process Node.js (no mutex needed).
 */

let _keys = null;
let _index = 0;

/**
 * Force reload keys from env (call after .env changes at runtime).
 */
function resetKeyCache() {
  _keys = null;
  _index = 0;
}

function loadKeys() {
  if (_keys) return _keys;

  const k1 = process.env.N8N_API_KEY_1;
  const k2 = process.env.N8N_API_KEY_2;
  const k3 = process.env.N8N_API_KEY_3;

  const rotationKeys = [k1, k2, k3].filter(Boolean);

  if (rotationKeys.length > 0) {
    _keys = rotationKeys;
    console.log(`[n8nKeyRotation] Loaded ${rotationKeys.length} rotation key(s)`);
  } else {
    // Fallback to legacy single key
    const legacy = process.env.N8N_API_KEY;
    if (legacy) {
      _keys = [legacy];
      console.log('[n8nKeyRotation] Using legacy N8N_API_KEY (no rotation)');
    } else {
      _keys = [];
      console.warn('[n8nKeyRotation] No n8n API keys configured');
    }
  }

  return _keys;
}

/**
 * Get the next API key in round-robin order.
 * @returns {string|null} API key or null if none configured
 */
function getNextN8nApiKey() {
  const keys = loadKeys();
  if (keys.length === 0) return null;
  const key = keys[_index % keys.length];
  _index = (_index + 1) % keys.length;
  return key;
}

/**
 * Get all configured keys (for health checks / diagnostics).
 * @returns {number} Number of rotation keys available
 */
function getKeyCount() {
  return loadKeys().length;
}

module.exports = { getNextN8nApiKey, getKeyCount, resetKeyCache };
