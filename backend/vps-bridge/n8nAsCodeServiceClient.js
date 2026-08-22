const N8N_AS_CODE_SERVICE_URL = (
  process.env.N8N_AS_CODE_SERVICE_URL ||
  require('./config').N8N_AS_CODE_SERVICE_URL
).replace(/\/$/, '');

async function callN8nAsCodeService(path, payload) {
  const response = await fetch(`${N8N_AS_CODE_SERVICE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });

  const rawBody = await response.text();
  let parsed = null;
  try {
    parsed = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    parsed = rawBody;
  }

  if (!response.ok) {
    const message = parsed?.message || parsed?.error || rawBody || `n8n-as-code service ${path} failed`;
    throw new Error(message);
  }

  return parsed;
}

module.exports = {
  callN8nAsCodeService,
  N8N_AS_CODE_SERVICE_URL,
};
