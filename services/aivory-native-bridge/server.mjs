import express from 'express';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import * as customerService from './agents/customer-service.mjs';
import * as leadsQualifier from './agents/leads-qualifier.mjs';
import * as financeInvoiceOps from './agents/finance-invoice-ops.mjs';
import * as officeAssistant from './agents/office-assistant.mjs';

const PORT = Number(process.env.PORT || 4100);
const BRIDGE_KEY = process.env.BRIDGE_KEY;
const N8N_SHARED_SECRET = process.env.N8N_SHARED_SECRET;

if (!BRIDGE_KEY) {
  console.error(JSON.stringify({ level: 'fatal', msg: 'BRIDGE_KEY env var is required, refusing to start' }));
  process.exit(1);
}
if (!N8N_SHARED_SECRET) {
  console.error(JSON.stringify({ level: 'fatal', msg: 'N8N_SHARED_SECRET env var is required, refusing to start' }));
  process.exit(1);
}

function log(level, msg, attrs = {}) {
  console.log(JSON.stringify({ level, msg, ts: new Date().toISOString(), ...attrs }));
}

const AGENT_MODULES = [customerService, leadsQualifier, financeInvoiceOps, officeAssistant];

// Basic sanity: tenant_id must be a non-empty, reasonably-shaped identifier.
// Rejecting weird input here (not just downstream in n8n/Postgres) keeps the
// whole bridge fail-closed on malformed identity rather than passing junk
// through to a SQL filter and hoping it degrades safely.
const TENANT_ID_RE = /^[A-Za-z0-9._-]{1,128}$/;

async function callN8nWebhook(webhookUrl, payload, tenantId, toolName) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const resp = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Bridge-Secret': N8N_SHARED_SECRET,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const text = await resp.text();
    if (!resp.ok) {
      log('error', 'n8n webhook returned non-2xx', { tenantId, toolName, status: resp.status, body: text.slice(0, 500) });
      return { ok: false, error: `Backend returned HTTP ${resp.status}` };
    }
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      log('error', 'n8n webhook returned non-JSON body', { tenantId, toolName, body: text.slice(0, 500) });
      return { ok: false, error: 'Backend returned a malformed response' };
    }
    return { ok: true, data };
  } catch (e) {
    log('error', 'n8n webhook call failed', { tenantId, toolName, error: String(e) });
    return { ok: false, error: e.name === 'AbortError' ? 'Backend timed out' : `Backend call failed: ${e.message}` };
  } finally {
    clearTimeout(timeout);
  }
}

function buildMcpServerForSession(agentModule, tenantId) {
  const server = new McpServer({ name: `aivory-native-${agentModule.agentType}`, version: '1.0.0' });
  const webhookUrl = process.env[agentModule.webhookEnvVar];
  if (!webhookUrl) {
    throw new Error(`${agentModule.webhookEnvVar} env var is not set`);
  }

  for (const t of agentModule.tools) {
    server.registerTool(
      t.name,
      { description: t.description, inputSchema: t.inputSchema },
      async (args) => {
        // tenantId comes ONLY from the closure (bound at session-init time from
        // the connection URL), never from `args` — the tool's own inputSchema
        // never even declares a tenant_id field, so there is nothing for the
        // calling model to override. That holds for both paths below.
        let result;
        if (typeof t.handler === 'function') {
          // Single-query tools run here, against Postgres directly. n8n is
          // reserved for genuinely multi-step flows; for one SELECT it was
          // only a network hop and a second definition to keep in sync.
          try {
            result = { ok: true, data: await t.handler(args, { tenantId }) };
          } catch (e) {
            log('error', 'local tool handler failed', { tenantId, toolName: t.name, error: String(e) });
            // Deliberately generic: a raw driver error can carry column names,
            // constraint text and fragments of other tenants' data straight
            // into an LLM context.
            result = { ok: false, error: 'Backend query failed' };
          }
        } else {
          result = await callN8nWebhook(
            webhookUrl,
            { action: t.action, tenant_id: tenantId, ...args },
            tenantId,
            t.name
          );
        }
        if (!result.ok) {
          return { content: [{ type: 'text', text: `Error: ${result.error}` }], isError: true };
        }
        // Optional per-tool shaping of the n8n response, for work that does not
        // belong in a workflow node -- currently only pipeline_summary's
        // currency conversion. A postProcess that throws must not take the
        // whole call down: the unshaped backend data is still a correct answer,
        // just without the extra, so it degrades to that.
        let payload = result.data;
        if (typeof t.postProcess === 'function') {
          try {
            payload = await t.postProcess(payload, args);
          } catch (e) {
            log('error', 'tool postProcess failed; returning unshaped backend data', {
              tenantId, toolName: t.name, error: String(e),
            });
            payload = result.data;
          }
        }
        return { content: [{ type: 'text', text: JSON.stringify(payload) }] };
      }
    );
  }
  return server;
}

const app = express();
app.use(express.json({ limit: '1mb' }));

// sessionId -> { transport, tenantId, agentType }
const sessions = new Map();

for (const agentModule of AGENT_MODULES) {
  const routePath = `/mcp/${agentModule.mcpPath}`;

  app.all(routePath, async (req, res) => {
    if (req.headers['x-bridge-key'] !== BRIDGE_KEY) {
      log('warn', 'rejected: bad or missing x-bridge-key', { path: routePath });
      res.status(401).json({ error: 'unauthorized' });
      return;
    }

    const sessionIdHeader = req.headers['mcp-session-id'];

    if (sessionIdHeader && typeof sessionIdHeader === 'string') {
      const existing = sessions.get(sessionIdHeader);
      if (!existing) {
        res.status(404).json({ error: 'unknown or expired MCP session' });
        return;
      }
      await existing.transport.handleRequest(req, res, req.body);
      return;
    }

    // No session header: this must be a fresh session-establishing request.
    // Bind tenant identity here, once, from the connection URL — this is the
    // ONLY point where tenant_id is ever accepted from the network.
    const tenantId = req.query.tenant_id;
    if (typeof tenantId !== 'string' || !TENANT_ID_RE.test(tenantId)) {
      log('warn', 'rejected: missing or malformed tenant_id on new session', { path: routePath, tenantId });
      res.status(400).json({ error: 'tenant_id query parameter is required and must match ' + TENANT_ID_RE });
      return;
    }

    let mcpServer;
    try {
      mcpServer = buildMcpServerForSession(agentModule, tenantId);
    } catch (e) {
      log('fatal', 'failed to build MCP server for session', { error: String(e) });
      res.status(500).json({ error: 'server misconfiguration' });
      return;
    }

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        sessions.set(sessionId, { transport, tenantId, agentType: agentModule.agentType });
        log('info', 'session initialized', { sessionId, tenantId, agentType: agentModule.agentType });
      },
      onsessionclosed: (sessionId) => {
        sessions.delete(sessionId);
        log('info', 'session closed', { sessionId });
      },
    });

    transport.onerror = (err) => {
      log('error', 'transport error', { tenantId, agentType: agentModule.agentType, error: String(err) });
    };

    await mcpServer.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  log('info', 'registered agent MCP route', { path: routePath, agentType: agentModule.agentType, tools: agentModule.tools.map((t) => t.name) });
}

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok', activeSessions: sessions.size, agents: AGENT_MODULES.map((m) => m.agentType) });
});

app.listen(PORT, '127.0.0.1', () => {
  log('info', 'aivory-native-bridge listening', { port: PORT });
});

process.on('SIGTERM', () => {
  log('info', 'SIGTERM received, shutting down');
  process.exit(0);
});
