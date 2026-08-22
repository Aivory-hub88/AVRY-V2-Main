/**
 * n8n-MCP Client
 * Connects to the self-hosted n8n-MCP server (JSON-RPC 2.0 over HTTP/SSE)
 * for real-time node schema lookups, workflow validation, and node search.
 *
 * Features:
 * - Session lifecycle: initialize once, reuse across calls, auto-retry on session error
 * - SSE response parsing (n8n-MCP returns text/event-stream)
 * - In-memory schema cache with 10-minute TTL
 * - Graceful fallback to static values when MCP is unreachable
 */

const MCP_URL = process.env.N8N_MCP_URL || '';
const MCP_AUTH = process.env.AUTH_TOKEN || process.env.N8N_MCP_AUTH_TOKEN || '';
const CACHE_TTL_MS = Number(process.env.N8N_MCP_CACHE_TTL_MS || 10 * 60 * 1000);
const MCP_TIMEOUT_MS = Number(process.env.N8N_MCP_TIMEOUT_MS || 15000);

// ── Session state ─────────────────────────────────────────────────────────────

let sessionId = null;
let requestCounter = 0;

// ── Schema cache ──────────────────────────────────────────────────────────────

const schemaCache = new Map(); // key: nodeType → { data, ts }

function getCached(key) {
  const entry = schemaCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    schemaCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  schemaCache.set(key, { data, ts: Date.now() });
}

// ── SSE response parser ───────────────────────────────────────────────────────

/**
 * Parse an SSE response body from n8n-MCP.
 * Lines starting with "data: " contain JSON-RPC response envelopes.
 * The actual payload is at result.content[0].text (JSON string).
 */
function parseSseResponse(body) {
  const lines = body.split('\n');
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const json = line.slice(6).trim();
      if (!json || json === '[DONE]') continue;
      try {
        const envelope = JSON.parse(json);
        if (envelope.result?.content?.[0]?.text) {
          return JSON.parse(envelope.result.content[0].text);
        }
        // Some responses return result directly without content wrapper
        if (envelope.result && !envelope.result.content) {
          return envelope.result;
        }
      } catch (e) {
        // skip unparseable lines
      }
    }
  }
  return null;
}

// ── Low-level MCP request ─────────────────────────────────────────────────────

async function mcpRequest(method, params, retryOnSessionError = true) {
  if (!MCP_URL) {
    throw new Error('N8N_MCP_URL is not configured');
  }

  const id = ++requestCounter;
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
  };
  if (MCP_AUTH) headers['Authorization'] = `Bearer ${MCP_AUTH}`;
  if (sessionId) headers['mcp-session-id'] = sessionId;

  const body = JSON.stringify({
    jsonrpc: '2.0',
    id,
    method,
    params: params || {},
  });

  const res = await fetch(`${MCP_URL}/mcp`, {
    method: 'POST',
    headers,
    body,
    signal: AbortSignal.timeout(MCP_TIMEOUT_MS),
  });

  // Capture session ID from initialize response
  const newSession = res.headers.get('mcp-session-id');
  if (newSession) sessionId = newSession;

  const text = await res.text();

  if (!res.ok) {
    // Session expired or invalid — re-initialize and retry once
    if (retryOnSessionError && (res.status === 401 || res.status === 403 || res.status === 404 || text.toLowerCase().includes('session'))) {
      console.warn('[n8nMcpClient] Session error, re-initializing...');
      sessionId = null;
      await initialize();
      return mcpRequest(method, params, false);
    }
    throw new Error(`MCP ${method} failed (${res.status}): ${text.slice(0, 256)}`);
  }

  // Try SSE parsing first, then plain JSON
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('text/event-stream')) {
    return parseSseResponse(text);
  }
  try {
    const json = JSON.parse(text);
    if (json.result?.content?.[0]?.text) {
      return JSON.parse(json.result.content[0].text);
    }
    return json.result || json;
  } catch {
    return parseSseResponse(text);
  }
}

// ── Session management ────────────────────────────────────────────────────────

async function initialize() {
  if (sessionId) return; // already initialized
  console.log('[n8nMcpClient] Initializing MCP session...');
  await mcpRequest('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'aivory-bridge', version: '1.0.0' },
  }, false);
  // MCP spec: the session isn't usable for tool calls until the client
  // acks the handshake with this notification (no id -> no JSON-RPC response).
  // Without it, n8n-mcp rejects every subsequent tools/call with
  // "Session not found or expired", forcing 100% static-fallback node resolution.
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
  };
  if (MCP_AUTH) headers['Authorization'] = `Bearer ${MCP_AUTH}`;
  if (sessionId) headers['mcp-session-id'] = sessionId;
  await fetch(`${MCP_URL}/mcp`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} }),
    signal: AbortSignal.timeout(MCP_TIMEOUT_MS),
  });
  console.log('[n8nMcpClient] Session established:', sessionId);
}

async function ensureSession() {
  if (!sessionId) await initialize();
}

// ── Tool call helper ──────────────────────────────────────────────────────────

async function callTool(toolName, args) {
  await ensureSession();
  return mcpRequest('tools/call', { name: toolName, arguments: args });
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Get full node schema from n8n-MCP.
 * Results are cached for 10 minutes.
 * Falls back to null on error (caller should use static defaults).
 */
async function getNodeSchema(nodeType) {
  const cached = getCached(nodeType);
  if (cached) return cached;

  try {
    const result = await callTool('get_node', {
      nodeType,
      detail: 'standard',
      mode: 'info',
      includeTypeInfo: true,
      includeExamples: false,
    });
    if (result) setCache(nodeType, result);
    return result;
  } catch (err) {
    console.warn(`[n8nMcpClient] getNodeSchema(${nodeType}) failed, falling back to static:`, err.message);
    return null;
  }
}

/**
 * Validate a node config against its schema.
 * NOT cached — always fresh.
 */
async function validateNodeConfig(nodeType, config, mode = 'full') {
  try {
    return await callTool('validate_node', { nodeType, config, mode });
  } catch (err) {
    console.warn(`[n8nMcpClient] validateNodeConfig(${nodeType}) failed:`, err.message);
    return { valid: true, errors: [], warnings: ['MCP validation unavailable'] };
  }
}

/**
 * Validate a complete workflow JSON before pushing to n8n.
 * NOT cached — always fresh.
 */
async function validateWorkflow(workflow) {
  try {
    return await callTool('validate_workflow', { workflow });
  } catch (err) {
    console.warn('[n8nMcpClient] validateWorkflow failed, skipping validation:', err.message);
    return { valid: true, errors: [], warnings: ['MCP validation unavailable — skipped'] };
  }
}

/**
 * Search nodes by keyword (for AIRA to discover nodes).
 * NOT cached — queries vary.
 */
async function searchNodes(query, options = {}) {
  try {
    return await callTool('search_nodes', {
      query,
      limit: options.limit || 8,
      mode: options.mode || 'OR',
      source: options.source || 'core',
      includeExamples: false,
      includeOperations: !!options.includeOperations,
    });
  } catch (err) {
    console.warn(`[n8nMcpClient] searchNodes(${query}) failed:`, err.message);
    return [];
  }
}

/**
 * Check if the MCP server is reachable.
 */
async function isAvailable() {
  if (!MCP_URL) return false;
  try {
    await ensureSession();
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  getNodeSchema,
  validateNodeConfig,
  validateWorkflow,
  searchNodes,
  isAvailable,
  // Expose for testing
  _clearCache: () => schemaCache.clear(),
  _clearSession: () => { sessionId = null; },
};
