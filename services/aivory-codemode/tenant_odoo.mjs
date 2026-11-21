// Resolves a tenant's Odoo MCP registration for one agent type from the backend's
// internal API (same endpoint Cerveau uses). The registration holds a per-tenant
// bearer token bound to ONLY that tenant's Odoo instance, carried in the URL.
//
// Safety:
//  - only a server named "odoo" whose URL is under the shared Odoo MCP base is used;
//    any other tenant-supplied URL is ignored (no SSRF through tenant input);
//  - only the READ tools below are exposed, minus the tenant's disabled_tools;
//  - the URL (it contains the token) is never logged or returned to the model.

export const ODOO_READ_ALLOW = new Set([
  'odoo_read_group',
  'odoo_search',
  'odoo_search_read',
  'odoo_read',
  'odoo_count',
  'odoo_list_models',
  'odoo_get_model_metadata',
  'odoo_check_access',
  'odoo_list_instances',
]);

const ID_RE = /^[A-Za-z0-9._-]{1,128}$/;

export function createOdooResolver({ backendUrl, token, odooBase = 'https://odoo-mcp.aivory.uk', log = () => {}, fetchImpl = fetch, timeoutMs = 5000 }) {
  if (!backendUrl || !token) return null; // feature off without backend access
  const baseUrl = new URL(odooBase);
  // Same rule as Cerveau's is_shared_odoo_mcp_url: scheme + exact host (+ port), never a string prefix.
  const isSharedOdoo = (u) => {
    try {
      const p = new URL(u);
      return p.protocol === baseUrl.protocol && p.host === baseUrl.host && (p.pathname === '/mcp' || p.pathname.startsWith('/mcp/'));
    } catch {
      return false;
    }
  };
  return async function resolve(tenantId, agentType) {
    if (!ID_RE.test(tenantId) || !ID_RE.test(agentType)) return null;
    let body;
    try {
      const res = await fetchImpl(`${backendUrl.replace(/\/$/, '')}/api/v1/tenant-mcp-servers/internal/${encodeURIComponent(tenantId)}/${encodeURIComponent(agentType)}`, {
        headers: { 'x-internal-token': token },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) {
        log('warn', 'tenant mcp lookup failed', { status: res.status, agentType });
        return null;
      }
      body = await res.json();
    } catch (e) {
      log('warn', 'tenant mcp lookup error', { agentType, error: String(e).slice(0, 120) });
      return null;
    }
    const server = (body.servers || []).find((s) => s && s.name === 'odoo' && typeof s.url === 'string' && isSharedOdoo(s.url));
    if (!server) return null;
    const headers = {};
    if (server.auth_header_name && server.auth_header_value) headers[server.auth_header_name] = server.auth_header_value;
    return { url: server.url, headers, disabledTools: new Set(server.disabled_tools || []) };
  };
}
