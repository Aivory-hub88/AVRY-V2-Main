/**
 * n8n Webhook Client
 * Routes AI requests to n8n workflows via webhook URLs.
 *
 * All URLs are derived from N8N_BASE_URL so a single env var controls
 * which n8n instance the Bridge talks to.
 */

const { post } = require('./lib/http');

// ── Config ────────────────────────────────────────────────────────────────────

const N8N_BASE_URL = (
  process.env.N8N_BASE_URL || 'http://43.156.108.96:5678'
).replace(/\/$/, '');

// REST API base — used for workflow CRUD and activation
const N8N_API_URL = `${N8N_BASE_URL}/api/v1`;

// Webhook base — production path is /webhook/<id> (NOT /webhook-test/...)
const N8N_WEBHOOK_BASE = N8N_BASE_URL;

console.log('[n8nClient] n8n base:', N8N_BASE_URL);

// ── Webhook registry ──────────────────────────────────────────────────────────
// Each key maps to a production webhook path under N8N_WEBHOOK_BASE/webhook/<id>

const WEBHOOK_IDS = {
  console:   '755fcac8-dc36-49e3-9553-67e62bac82e8',
  free_diag: 'c6e5359a-87c6-4f46-b33e-9140a57c4541',
  deep_diag: '0eaae5e4-c9fa-4611-ab28-6b8e6cfc8d1d',
  blueprint: '4260e583-6a12-418c-ac40-e669698ba290',
  workflow:  'a7e065cd-8bd5-44d2-bdda-6ea108f0d8cd',
};

function webhookUrl(useCase) {
  const id = WEBHOOK_IDS[useCase];
  if (!id) throw new Error(`[n8nClient] Unknown use_case: ${useCase}`);
  return `${N8N_WEBHOOK_BASE}/webhook/${id}`;
}

// ── REST API helpers ──────────────────────────────────────────────────────────

/**
 * Make an authenticated call to the n8n REST API.
 * Reads the body as text so we never lose the error message.
 */
async function n8nApiRequest(method, path, body) {
  const url = `${N8N_API_URL}${path}`;
  const apiKey = process.env.N8N_API_KEY;

  console.log('[bridge→n8n] request', { method, url });

  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['X-N8N-API-KEY'] = apiKey;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  console.log('[bridge→n8n] response', { status: res.status, body: text.slice(0, 512) });

  if (!res.ok) {
    const msg = text.trim()
      ? `n8n ${method} ${path} failed (${res.status}): ${text}`
      : `n8n ${method} ${path} failed (${res.status} ${res.statusText})`;
    throw new Error(msg);
  }

  try { return text ? JSON.parse(text) : null; } catch { return text; }
}

// ── Webhook caller ────────────────────────────────────────────────────────────

async function callN8N(use_case, message, systemPrompt = null) {
  const url = webhookUrl(use_case);
  console.log('[bridge→n8n] webhook', { use_case, url });

  const body = { message };
  if (systemPrompt) body.system = systemPrompt;

  try {
    const response = await post(url, body, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 120000,
    });
    return { success: true, data: response };
  } catch (err) {
    console.error('[bridge→n8n] webhook error', { use_case, url, error: err.message });
    return { success: false, error: err.responseBody || err.message };
  }
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  callN8N,
  n8nApiRequest,
  N8N_BASE_URL,
  N8N_API_URL,
  N8N_WEBHOOK_BASE,
};
