/**
 * n8n MCP client — talks to n8n's BUILT-IN instance-level MCP server
 * (`<n8n>/mcp-server/http`, Streamable HTTP, JSON-RPC 2.0) for node search,
 * node type definitions and node-config validation.
 *
 * History: this used to target the community `czlonkowski/n8n-mcp` container
 * (:3020, tools get_node / validate_node / search_nodes). That container was
 * retired in favour of n8n's native MCP (ZeroClaw already uses it as
 * `n8n-native`), so this client now speaks the native tool set:
 *   search_nodes        { queries: string[] }               -> text
 *   get_node_types      { nodeIds: (string|obj)[] }         -> TypeScript defs (text)
 *   validate_node_config{ nodes: [{type,typeVersion,parameters}] } -> structured
 * (validate_workflow there takes Workflow-SDK *code*, not workflow JSON, so
 * workflow-level validation is intentionally not offered here.)
 *
 * Config (read at call time):
 *   N8N_MCP_URL         e.g. http://127.0.0.1:5678/mcp-server/http
 *   N8N_MCP_AUTH_TOKEN  n8n MCP access token, sent as Bearer
 *   N8N_MCP_CACHE_TTL_MS (default 10 min), N8N_MCP_TIMEOUT_MS (default 15 s)
 *
 * Everything degrades gracefully: when the MCP is unreachable/unauthorised the
 * public functions return the same empty/neutral values as before, and the
 * caller continues with n8n-as-code.
 */

function cfg() {
  const url = (process.env.N8N_MCP_URL || '').replace(/\/+$/, '');
  return {
    url,
    // Only N8N_MCP_AUTH_TOKEN: the bridge's generic AUTH_TOKEN belonged to the
    // retired czlonkowski container and must never be sent to n8n.
    auth: process.env.N8N_MCP_AUTH_TOKEN || '',
    cacheTtl: Number(process.env.N8N_MCP_CACHE_TTL_MS || 10 * 60 * 1000),
    timeout: Number(process.env.N8N_MCP_TIMEOUT_MS || 15000),
  };
}

// ── Session state ─────────────────────────────────────────────────────────────
// n8n's native MCP endpoint may be stateless (no mcp-session-id) or stateful;
// support both: remember the id if one is issued, otherwise just remember that
// the handshake was done.

let sessionId = null;
let initialized = false;
let initializing = null;
let requestCounter = 0;

// ── Schema cache ──────────────────────────────────────────────────────────────

const schemaCache = new Map(); // key: full node type → { data, ts }

function getCached(key) {
  const entry = schemaCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > cfg().cacheTtl) {
    schemaCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  schemaCache.set(key, { data, ts: Date.now() });
}

// ── Node type helpers ─────────────────────────────────────────────────────────

/** "nodes-base.gmail" → "n8n-nodes-base.gmail"; full ids pass through. */
function toFullNodeType(nodeType) {
  const t = String(nodeType || '').trim();
  if (!t) return '';
  if (t.startsWith('nodes-base.')) return `n8n-${t}`;
  if (t.startsWith('nodes-langchain.')) return `@n8n/n8n-${t}`;
  return t;
}

function humanizeNodeName(id) {
  const suffix = String(id).split('.').pop() || id;
  return suffix
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}

// ── Response parsing ──────────────────────────────────────────────────────────

/** Pull the JSON-RPC envelope out of an SSE body (last `data:` line that parses). */
function parseSseEnvelope(body) {
  let envelope = null;
  for (const line of String(body).split('\n')) {
    if (!line.startsWith('data:')) continue;
    const json = line.slice(5).trim();
    if (!json || json === '[DONE]') continue;
    try { envelope = JSON.parse(json); } catch { /* skip */ }
  }
  return envelope;
}

/** Normalise a tools/call result to { structured, text, isError }. */
function normalizeToolResult(result) {
  if (!result || typeof result !== 'object') return { structured: null, text: '', isError: false };
  const text = Array.isArray(result.content)
    ? result.content.filter((c) => c && c.type === 'text').map((c) => c.text).join('\n')
    : '';
  let structured = result.structuredContent ?? null;
  if (!structured && text) {
    try { structured = JSON.parse(text); } catch { /* plain text */ }
  }
  return { structured, text, isError: !!result.isError };
}

// ── Low-level MCP request ─────────────────────────────────────────────────────

function buildHeaders(c) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
  };
  if (c.auth) headers['Authorization'] = `Bearer ${c.auth}`;
  if (sessionId) headers['mcp-session-id'] = sessionId;
  return headers;
}

async function rpc(method, params, { notify = false } = {}) {
  const c = cfg();
  if (!c.url) throw new Error('N8N_MCP_URL is not configured');

  const body = notify
    ? { jsonrpc: '2.0', method, params: params || {} }
    : { jsonrpc: '2.0', id: ++requestCounter, method, params: params || {} };

  const res = await fetch(c.url, {
    method: 'POST',
    headers: buildHeaders(c),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(c.timeout),
  });

  const newSession = res.headers.get('mcp-session-id');
  if (newSession) sessionId = newSession;

  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`MCP ${method} failed (${res.status}): ${text.slice(0, 256)}`);
    err.status = res.status;
    throw err;
  }
  if (notify) return null;

  const contentType = res.headers.get('content-type') || '';
  let envelope;
  if (contentType.includes('text/event-stream')) {
    envelope = parseSseEnvelope(text);
  } else {
    try { envelope = JSON.parse(text); } catch { envelope = parseSseEnvelope(text); }
  }
  if (!envelope) throw new Error(`MCP ${method}: empty or unparseable response`);
  if (envelope.error) {
    const err = new Error(`MCP ${method} error: ${envelope.error.message || JSON.stringify(envelope.error)}`);
    err.rpcError = envelope.error;
    throw err;
  }
  return envelope.result;
}

// ── Session management ────────────────────────────────────────────────────────

async function initialize() {
  await rpc('initialize', {
    protocolVersion: '2025-03-26',
    capabilities: {},
    clientInfo: { name: 'aivory-bridge', version: '1.1.0' },
  });
  // MCP spec: ack the handshake (no id → no JSON-RPC response).
  await rpc('notifications/initialized', {}, { notify: true }).catch(() => {});
  initialized = true;
}

async function ensureSession() {
  if (initialized) return;
  if (!initializing) {
    initializing = initialize().finally(() => { initializing = null; });
  }
  await initializing;
}

function resetSession() {
  sessionId = null;
  initialized = false;
}

// ── Tool call helper ──────────────────────────────────────────────────────────

async function callTool(toolName, args, retry = true) {
  await ensureSession();
  try {
    const result = normalizeToolResult(await rpc('tools/call', { name: toolName, arguments: args }));
    if (result.isError) throw new Error(`MCP tool ${toolName} reported an error: ${result.text.slice(0, 256)}`);
    return result;
  } catch (err) {
    // Session dropped (n8n restarted, token rotated into a new session): redo the handshake once.
    const sessionLost = err.status === 404 || err.status === 400 || /session/i.test(err.message);
    if (retry && sessionLost) {
      console.warn('[n8nMcpClient] Session error, re-initializing...');
      resetSession();
      return callTool(toolName, args, false);
    }
    throw err;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Node type definitions from n8n. Returns
 * { nodeType, displayName, typeDefinitions } or null on error/unknown node.
 * Cached for N8N_MCP_CACHE_TTL_MS.
 */
async function getNodeSchema(nodeType) {
  const id = toFullNodeType(nodeType);
  if (!id) return null;
  const cached = getCached(id);
  if (cached) return cached;

  try {
    const { structured, text } = await callTool('get_node_types', { nodeIds: [id] });
    const body = (structured && typeof structured.definitions === 'string' ? structured.definitions : text || '').trim();
    if (!body) return null;

    let data;
    if (/^#\s*Errors/m.test(body) || /^Error:/m.test(body)) {
      // n8n reports problems as plain text, not isError. A node with
      // resource/operation variants needs discriminators to get its types:
      // the node exists, we just have no per-operation definitions.
      const need = /requires resource and operation discriminators\. Available resources: ([^.\n]+)/.exec(body);
      if (!need) return null; // unknown node or another failure
      data = {
        nodeType: id,
        displayName: humanizeNodeName(id),
        typeDefinitions: '',
        needsDiscriminators: true,
        resources: need[1].split(',').map((r) => r.trim()).filter(Boolean),
      };
    } else {
      data = { nodeType: id, displayName: humanizeNodeName(id), typeDefinitions: body.slice(0, 6000) };
    }
    setCache(id, data);
    return data;
  } catch (err) {
    console.warn(`[n8nMcpClient] getNodeSchema(${id}) failed, falling back to static:`, err.message);
    return null;
  }
}

/**
 * Validate a node config. NOT cached. Resolves to
 * { valid, errors: [{path,message}], warnings: [] }; on MCP failure it reports
 * valid:true with a warning, so a down MCP never blocks a draft.
 */
async function validateNodeConfig(nodeType, config, _mode, typeVersion = 1) {
  const id = toFullNodeType(nodeType);
  try {
    const { structured } = await callTool('validate_node_config', {
      nodes: [{ type: id, typeVersion, parameters: config && typeof config === 'object' ? config : {} }],
    });
    if (!structured || typeof structured.valid !== 'boolean') {
      return { valid: true, errors: [], warnings: ['MCP validation returned no verdict'] };
    }
    const first = Array.isArray(structured.results) ? structured.results[0] : null;
    return {
      valid: structured.valid,
      errors: first?.errors || (structured.error ? [{ path: '', message: structured.error }] : []),
      warnings: [],
    };
  } catch (err) {
    console.warn(`[n8nMcpClient] validateNodeConfig(${id}) failed:`, err.message);
    return { valid: true, errors: [], warnings: ['MCP validation unavailable'] };
  }
}

/**
 * Workflow-level validation is not available over n8n's native MCP for JSON
 * workflows (its validate_workflow expects Workflow-SDK code). Kept so callers
 * don't break; it never blocks.
 */
async function validateWorkflow(_workflow) {
  return { valid: true, errors: [], warnings: ['Workflow-level MCP validation is not available (native MCP validates SDK code)'] };
}

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'to', 'of', 'in', 'on', 'for', 'with', 'from', 'by', 'at', 'as', 'into',
  'step', 'new', 'all', 'data', 'send', 'get', 'set', 'list', 'create', 'update', 'delete', 'read', 'write',
  'trigger', 'action', 'node', 'file', 'files', 'item', 'items', 'every', 'each', 'when', 'then',
]);

/** Short search terms ("gmail", "google drive") from free text; n8n's search wants service names, not sentences. */
function deriveSearchTerms(query) {
  const words = String(query || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
  return [...new Set(words)].slice(0, 4);
}

/**
 * Parse search_nodes text. Each hit is an unindented "- <nodeId>[ [TRIGGER]]"
 * line followed by indented "Display Name:/Version:/Description:" lines;
 * "@relatedNodes" entries are indented, so they are not hits. Hits are in the
 * engine's rank order; AI "Tool" variants are skipped (not workflow steps).
 */
function parseSearchCandidates(text, limit) {
  const seen = new Set();
  const out = [];
  let cur = null;
  for (const line of String(text).split('\n')) {
    const head = /^- ((?:@n8n\/n8n-nodes-[a-z0-9-]+|n8n-nodes-[a-z0-9-]+)\.[A-Za-z][A-Za-z0-9]*)(\s+\[TRIGGER\])?\s*$/.exec(line);
    if (head) {
      const id = head[1];
      cur = null;
      if (seen.has(id) || /Tool$/.test(id)) continue;
      seen.add(id);
      cur = {
        nodeType: id,
        workflowNodeType: id,
        displayName: humanizeNodeName(id),
        description: null,
        package: id.slice(0, id.lastIndexOf('.')),
        category: head[2] ? 'trigger' : null,
        relevance: out.length === 0 ? 'high' : null,
      };
      out.push(cur);
      if (out.length >= limit) break;
      continue;
    }
    if (!cur) continue;
    const dn = /^\s+Display Name:\s*(.+)$/.exec(line);
    if (dn) { cur.displayName = dn[1].trim(); continue; }
    const ds = /^\s+Description:\s*(.+)$/.exec(line);
    if (ds) { cur.description = ds[1].trim(); continue; }
  }
  return out;
}

/**
 * Search nodes. `options.terms` (service names such as "gmail") is preferred;
 * otherwise terms are derived from `query`. NOT cached. Returns candidates
 * ({ nodeType, workflowNodeType, displayName, description, package, category,
 * relevance }), [] on error or no hits.
 */
async function searchNodes(query, options = {}) {
  const terms = (Array.isArray(options.terms) && options.terms.length ? options.terms : deriveSearchTerms(query))
    .map((t) => String(t).trim())
    .filter(Boolean)
    .slice(0, 4);
  if (terms.length === 0) return [];
  try {
    const { structured, text } = await callTool('search_nodes', { queries: terms });
    const body = structured && typeof structured.results === 'string' ? structured.results : text;
    return parseSearchCandidates(body, options.limit || 8);
  } catch (err) {
    console.warn(`[n8nMcpClient] searchNodes(${terms.join(', ')}) failed:`, err.message);
    return [];
  }
}

/** Is the MCP configured, reachable and authorised? */
async function isAvailable() {
  if (!cfg().url) return false;
  try {
    await ensureSession();
    return true;
  } catch {
    resetSession();
    return false;
  }
}

module.exports = {
  getNodeSchema,
  validateNodeConfig,
  validateWorkflow,
  searchNodes,
  isAvailable,
  // Exposed for testing
  _toFullNodeType: toFullNodeType,
  _parseSearchCandidates: parseSearchCandidates,
  _deriveSearchTerms: deriveSearchTerms,
  _clearCache: () => schemaCache.clear(),
  _clearSession: resetSession,
};
