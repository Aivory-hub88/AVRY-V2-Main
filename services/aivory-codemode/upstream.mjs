// Per-session connections to the native bridge. Tenant identity is bound ONCE,
// from the proxy's own connection URL, and forwarded as the upstream
// ?tenant_id= query param. The sandbox only ever sees functions bound to these
// connections, so a program cannot reach another tenant. Writes are never
// exposed: only tools on the READ_ALLOW list are visible, everything else
// (create/update/close/reply...) stays a normal Cerveau tool behind approval.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { ODOO_READ_ALLOW } from './tenant_odoo.mjs';

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

// Each agent only gets the read tools it already has natively: a profile never
// widens what an agent can see, it only lets it batch those reads into one call.
export const PROFILES = {
  autonomous: ['list_leads', 'get_lead', 'pipeline_summary', 'sales_funnel_forecast', 'list_tickets', 'get_ticket', 'list_invoices', 'get_invoice'],
  customer_service: ['list_tickets', 'get_ticket'],
  finance_invoice_ops: ['list_invoices', 'get_invoice'],
  leads_qualifier: ['list_leads', 'get_lead', 'pipeline_summary', 'sales_funnel_forecast'],
  data_analyst: ['kpi_snapshot', 'sales_funnel_forecast'],
  chief_of_staff: ['kpi_snapshot', 'sales_funnel_forecast'],
};
for (const [name, tools] of Object.entries(PROFILES)) {
  for (const t of tools) if (!READ_ALLOW.has(t)) throw new Error(`profile ${name} lists non-read tool ${t}`);
}

export const DEFAULT_UPSTREAM_PATHS = [
  'leads-qualifier',
  'customer-service',
  'finance-invoice-ops',
  'data-analyst',
  'operations-inventory',
];

export class TenantUpstreams {
  constructor({ tenantId, baseUrl, key, paths = DEFAULT_UPSTREAM_PATHS, allow = READ_ALLOW, log = () => {}, agentType, odooResolver }) {
    this.agentType = agentType;
    this.odooResolver = odooResolver;
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
    await this.initOdoo();
  }

  async initOdoo() {
    if (!this.odooResolver || !this.agentType) return;
    const reg = await this.odooResolver(this.tenantId, this.agentType);
    if (!reg) return;
    const client = new Client({ name: 'aivory-codemode', version: '0.1.0' });
    try {
      await client.connect(new StreamableHTTPClientTransport(new URL(reg.url), { requestInit: { headers: reg.headers } }));
      this.clients.push(client);
      const { tools } = await client.listTools();
      let n = 0;
      for (const tool of tools) {
        if (ODOO_READ_ALLOW.has(tool.name) && !reg.disabledTools.has(tool.name) && !this.tools.has(tool.name)) {
          this.tools.set(tool.name, { client, tool });
          n++;
        }
      }
      this.log('info', 'odoo upstream connected', { agentType: this.agentType, tools: n });
    } catch (e) {
      // never include reg.url: it carries the tenant's token
      this.log('warn', 'odoo upstream unavailable, skipping', { agentType: this.agentType, error: String(e).replace(reg.url, '<url>').slice(0, 140) });
    }
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
