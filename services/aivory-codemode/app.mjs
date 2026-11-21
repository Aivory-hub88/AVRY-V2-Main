import express from 'express';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { TenantUpstreams, PROFILES } from './upstream.mjs';
import { runInSandbox } from './sandbox.mjs';
import { search, signatures } from './catalog.mjs';

const TENANT_ID_RE = /^[A-Za-z0-9._-]{1,128}$/;
const SESSION_IDLE_MS = 30 * 60 * 1000;

function safeEqual(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && timingSafeEqual(x, y);
}

const EXECUTE_INTRO = `Run a short JavaScript program that calls this tenant's read-only tools and returns one combined answer. Use it when a question needs several reads, or one read plus processing (counting, filtering, summing, joining): write ONE program instead of making separate tool calls.
Rules: the code is the body of an async function; use await and Promise.all to read in parallel; return a small JSON-serialisable value (aggregate, do not return raw lists unless asked); console.log is allowed for debugging. There is no network, filesystem, process or timers. Calls take one object argument and return parsed JSON, usually shaped {success, data}: read the .data field. Writes are not available here.`;

export function createApp({ key, baseUrl, log = () => {}, limits, paths }) {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  /** @type {Map<string, {transport: any, upstreams: TenantUpstreams, tenantId: string, last: number}>} */
  const sessions = new Map();

  async function buildServer(tenantId, profile) {
    const upstreams = new TenantUpstreams({ tenantId, baseUrl, key, paths, log, allow: new Set(PROFILES[profile]) });
    await upstreams.init();
    const tools = upstreams.toolList();
    const toolNames = tools.map((t) => t.name);
    const server = new McpServer({ name: 'aivory-codemode', version: '0.1.0' });

    server.registerTool(
      'search',
      {
        description: 'Find read-only tools by keyword and get their exact call signatures. Only needed if the signatures in the execute description are not enough.',
        inputSchema: { query: z.string().describe('what you want to read, e.g. "invoices unpaid"') },
      },
      async ({ query }) => ({ content: [{ type: 'text', text: JSON.stringify(search(tools, query)) }] }),
    );

    server.registerTool(
      'execute',
      {
        description: `${EXECUTE_INTRO}\n\nAvailable (all read-only):\n${signatures(tools) || '(none available)'}`,
        inputSchema: { code: z.string().describe('JavaScript: the body of an async function that returns the final value') },
      },
      async ({ code }) => {
        const started = Date.now();
        const out = await runInSandbox({
          code,
          toolNames,
          limits,
          callTool: (name, args) => upstreams.call(name, args),
        });
        log('info', 'execute', { tenantId, calls: out.calls, ms: Date.now() - started, error: out.error ? out.error.slice(0, 160) : undefined });
        const payload = out.error ? { error: out.error, logs: out.logs, calls: out.calls } : { result: out.result, logs: out.logs, calls: out.calls };
        return { isError: Boolean(out.error), content: [{ type: 'text', text: JSON.stringify(payload) }] };
      },
    );
    return { server, upstreams };
  }

  app.all('/mcp/codemode/:profile', async (req, res) => {
    if (!safeEqual(req.headers['x-bridge-key'], key)) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
    const profile = req.params.profile;
    if (!Object.hasOwn(PROFILES, profile)) {
      res.status(404).json({ error: 'unknown profile' });
      return;
    }
    const sid = req.headers['mcp-session-id'];
    if (sid && typeof sid === 'string') {
      const existing = sessions.get(sid);
      if (!existing) {
        res.status(404).json({ error: 'unknown or expired MCP session' });
        return;
      }
      existing.last = Date.now();
      await existing.transport.handleRequest(req, res, req.body);
      return;
    }
    // Only point where a tenant id is accepted from the network.
    const tenantId = req.query.tenant_id;
    if (typeof tenantId !== 'string' || !TENANT_ID_RE.test(tenantId)) {
      res.status(400).json({ error: 'tenant_id query parameter is required and must match ' + TENANT_ID_RE });
      return;
    }
    let built;
    try {
      built = await buildServer(tenantId, profile);
    } catch (e) {
      log('error', 'failed to build session', { error: String(e) });
      res.status(500).json({ error: 'server misconfiguration' });
      return;
    }
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        sessions.set(id, { transport, upstreams: built.upstreams, tenantId, last: Date.now() });
        log('info', 'session initialized', { sessionId: id, tenantId, tools: built.upstreams.tools.size });
      },
      onsessionclosed: async (id) => {
        const s = sessions.get(id);
        sessions.delete(id);
        await s?.upstreams.close();
      },
    });
    transport.onerror = (err) => log('error', 'transport error', { tenantId, error: String(err) });
    await built.server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  app.get('/healthz', (_req, res) => res.json({ status: 'ok', activeSessions: sessions.size }));

  const sweeper = setInterval(async () => {
    const cutoff = Date.now() - SESSION_IDLE_MS;
    for (const [id, s] of sessions) {
      if (s.last < cutoff) {
        sessions.delete(id);
        await s.upstreams.close();
        log('info', 'session expired', { sessionId: id });
      }
    }
  }, 60 * 1000);
  sweeper.unref();

  return { app, sessions, stop: async () => { clearInterval(sweeper); for (const s of sessions.values()) await s.upstreams.close(); sessions.clear(); } };
}
