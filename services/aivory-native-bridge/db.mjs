// Direct Postgres access for tools that are a single query.
//
// Those tools used to travel bridge -> HTTP -> n8n -> Postgres -> back. n8n
// earns its place on genuinely multi-step flows (enrich_lead_contact: wallet
// pre-check, provider call, conditional debit, merge) -- it does not earn a
// network hop and a second definition to keep in sync for `SELECT ... WHERE
// tenant_id = $1`. CERVEAU-N8N-ORCHESTRATION-PLAN.md made the same argument
// when it rejected "one workflow per single tool action".
//
// Every query here is parameterised and every one filters on tenant_id. The
// tenant id comes from the MCP session, never from tool arguments.
import pg from 'pg';

const { Pool, types } = pg;

// DATE (oid 1082) as a plain 'YYYY-MM-DD' string, not a JS Date.
//
// node-postgres otherwise builds a Date at LOCAL midnight, which then
// serialises to UTC and moves the day: `expected_close_date` of 2026-10-15
// came back as "2026-10-14T16:00:00.000Z" on this box (Asia/Jakarta). The
// n8n path was right only because that container happened to run UTC. A date
// with no time in it should never acquire a timezone on the way out.
types.setTypeParser(1082, (value) => value);

let pool = null;

export function getPool() {
  if (pool) return pool;
  const connectionString = process.env.NATIVE_OPS_DATABASE_URL;
  if (!connectionString) {
    throw new Error('NATIVE_OPS_DATABASE_URL is not set');
  }
  pool = new Pool({
    connectionString,
    // The bridge is one process serving every tenant; a small pool is plenty
    // and keeps it a good citizen on a box that also runs Postgres itself.
    max: 6,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    // A tool call should fail fast and let the agent retry rather than hold
    // an MCP request open. Comfortably under the 20s the n8n path allowed.
    statement_timeout: 10_000,
  });
  pool.on('error', (err) => {
    console.error(JSON.stringify({
      level: 'error', msg: 'idle postgres client error', error: String(err),
    }));
  });
  return pool;
}

export async function query(text, params) {
  const result = await getPool().query(text, params);
  return result.rows;
}

// ── Response shapes ────────────────────────────────────────────────────────
//
// These reproduce the n8n Set nodes exactly ("Format Success Response",
// "Format List Response", "Format Pipeline Response"), down to the wording of
// the not-found error. The point of this migration is to change where the
// query runs, not what the agent sees -- anything that reads differently
// afterwards is a regression, not an improvement.

export function rowsOrNotFound(rows) {
  const found = rows.filter((r) => r && r.id);
  if (found.length === 0) {
    return { success: false, error: 'Not found, or not accessible to this tenant.' };
  }
  return { success: true, data: found };
}

export function listResponse(rows) {
  return { success: true, data: rows.filter((r) => r && r.id) };
}
