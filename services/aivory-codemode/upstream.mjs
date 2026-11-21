// Per-session connections to the native bridge. Tenant identity is bound ONCE,
// from the proxy's own connection URL, and forwarded as the upstream
// ?tenant_id= query param. The sandbox only ever sees functions bound to these
// connections, so a program cannot reach another tenant. Writes are never
// exposed: only tools on the READ_ALLOW list are visible, everything else
// (create/update/close/reply...) stays a normal Cerveau tool behind approval.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

export const READ_ALLOW = new Set([
  'list_leads',
  'get_lead',
  'pipeline_summary',
  'sales_funnel_forecast',
  'list_tickets',
  'get_ticket',
  'list_invoices',
  'get_invoice',
  'kpi_snapshot',
  'reorder_suggestion',
]);

export const DEFAULT_UPSTREAM_PATHS = [
  'leads-qualifier',
  'customer-service',
  'finance-invoice-ops',
  'data-analyst',
  'operations-inventory',
];

export class TenantUpstreams {
  constructor({ tenantId, baseUrl, key, paths = DEFAULT_UPSTREAM_PATHS, allow = READ_ALLOW, log = () => {} }) {
    this.tenantId = tenantId;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.key = key;
    this.paths = paths;
    this.allow = allow;
    this.log = log;
    /** @type {Map<string, {client: Client, tool: any}>} */
    this.tools = new Map();
    this.clients = [];
  }

  async init() {
    await Promise.all(
      this.paths.map(async (p) => {
        const url = new URL(`${this.baseUrl}/mcp/${p}`);
        url.searchParams.set('tenant_id', this.tenantId);
        const client = new Client({ name: 'aivory-codemode', version: '0.1.0' });
        try {
          await client.connect(new StreamableHTTPClientTransport(url, { requestInit: { headers: { 'x-bridge-key': this.key } } }));
          this.clients.push(client);
          const { tools } = await client.listTools();
          for (const tool of tools) {
            // Fail closed on the allowlist; first upstream wins on duplicate names.
            if (this.allow.has(tool.name) && !this.tools.has(tool.name)) this.tools.set(tool.name, { client, tool });
          }
        } catch (e) {
          this.log('warn', 'upstream unavailable, skipping', { path: p, error: String(e).slice(0, 160) });
        }
      }),
    );
  }

  toolList() {
    return [...this.tools.values()].map((t) => t.tool);
  }

  async call(name, args) {
    const entry = this.tools.get(name);
    if (!entry) throw new Error(`unknown tool: ${name}`);
    const res = await entry.client.callTool({ name, arguments: args });
    const text = (res.content || [])
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('\n');
    if (res.isError) throw new Error(text || `${name} failed`);
    if (res.structuredContent !== undefined) return res.structuredContent;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  async close() {
    await Promise.allSettled(this.clients.map((c) => c.close()));
    this.clients = [];
    this.tools.clear();
  }
}
