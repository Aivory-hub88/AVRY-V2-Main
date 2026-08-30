import { z } from 'zod';

import { listResponse, query, rowsOrNotFound } from '../db.mjs';

// Native, zero-signup CRM/lead-pipeline backend for the leads_qualifier agent
// type. Mirrors customer-service.mjs's structure: tenant_id is injected by the
// bridge from the MCP session, never accepted from tool arguments.

export const agentType = 'leads_qualifier';
export const mcpPath = 'leads-qualifier';
export const webhookEnvVar = 'N8N_WEBHOOK_LEADS_QUALIFIER';

const stageEnum = z.enum(['new', 'qualifying', 'qualified', 'disqualified', 'won', 'lost']);

// ── Local handlers ─────────────────────────────────────────────────────
//
// Every tool below is a single query, so it runs here rather than travelling
// bridge -> n8n -> Postgres -> back. `enrich_lead_contact` deliberately stays
// on the n8n path: it is a real multi-step flow (wallet pre-check, provider
// call, conditional debit, merge) and that is what n8n is for.
//
// The SQL and the response shapes are copied from the n8n nodes they replace,
// deliberately unchanged -- this migration moves where a query runs, not what
// the agent sees. Two behaviours were preserved even though they look wrong,
// so that any difference after this change is a real regression rather than a
// smuggled-in fix; both are flagged in docs/CERVEAU-STATUS.md:
//   * update_bant overwrites all five fields, so a partial update blanks the
//     ones not supplied (the tool schema defaults them to '');
//   * update_bant does not touch updated_at, unlike every other write here.

const LIST_COLUMNS = 'id, name, company, email, stage, created_at';
const DETAIL_COLUMNS =
  'id, name, company, email, stage, bant_budget, bant_authority, bant_need, ' +
  'bant_timeline, notes, created_at, updated_at';

async function createLead({ name, company, email }, { tenantId }) {
  const rows = await query(
    'INSERT INTO aivory_ops.leads (tenant_id, name, company, email) ' +
    'VALUES ($1, $2, $3, $4) RETURNING *',
    [tenantId, name, company ?? '', email ?? ''],
  );
  return rowsOrNotFound(rows);
}

async function listLeads({ stage }, { tenantId }) {
  const rows = await query(
    `SELECT ${LIST_COLUMNS} FROM aivory_ops.leads ` +
    "WHERE tenant_id = $1 AND ($2 = 'all' OR stage = $2) " +
    'ORDER BY created_at DESC LIMIT 50',
    [tenantId, stage || 'all'],
  );
  return listResponse(rows);
}

async function getLead({ lead_id }, { tenantId }) {
  const rows = await query(
    `SELECT ${DETAIL_COLUMNS} FROM aivory_ops.leads WHERE id = $1 AND tenant_id = $2`,
    [lead_id, tenantId],
  );
  return rowsOrNotFound(rows);
}

async function updateLeadStage({ lead_id, stage }, { tenantId }) {
  const rows = await query(
    'UPDATE aivory_ops.leads SET stage = $3, updated_at = now() ' +
    'WHERE id = $1 AND tenant_id = $2 RETURNING id, stage',
    [lead_id, tenantId, stage],
  );
  return rowsOrNotFound(rows);
}

async function updateBant(args, { tenantId }) {
  const rows = await query(
    'UPDATE aivory_ops.leads SET bant_budget = $3, bant_authority = $4, ' +
    'bant_need = $5, bant_timeline = $6, notes = $7 ' +
    'WHERE id = $1 AND tenant_id = $2 RETURNING *',
    [
      args.lead_id, tenantId,
      args.bant_budget ?? '', args.bant_authority ?? '',
      args.bant_need ?? '', args.bant_timeline ?? '', args.notes ?? '',
    ],
  );
  return rowsOrNotFound(rows);
}

async function updateDeal(args, { tenantId }) {
  const rows = await query(
    'UPDATE aivory_ops.leads SET ' +
    'amount = COALESCE($3::numeric, amount), ' +
    'currency = COALESCE($4::text, currency), ' +
    'expected_close_date = COALESCE($5::date, expected_close_date), ' +
    'owner = COALESCE($6::text, owner), ' +
    'probability = COALESCE($7::int, probability), ' +
    'updated_at = now() ' +
    'WHERE id = $1 AND tenant_id = $2 ' +
    'RETURNING id, name, company, stage, amount, currency, expected_close_date, owner, probability',
    [
      args.lead_id, tenantId,
      args.amount ?? null, args.currency ?? null,
      args.expected_close_date ?? null, args.owner ?? null,
      args.probability ?? null,
    ],
  );
  return rowsOrNotFound(rows);
}

async function pipelineSummary({ stage }, { tenantId }) {
  const rows = await query(
    'SELECT stage, currency, SUM(amount)::numeric(18,2) AS total_amount, ' +
    'COUNT(*)::int AS deal_count FROM aivory_ops.leads ' +
    'WHERE tenant_id = $1 AND amount IS NOT NULL AND currency IS NOT NULL ' +
    "AND ($2::text = 'all' " +
    "     OR ($2::text = 'open' AND stage IN ('new','qualifying','qualified')) " +
    '     OR stage = $2::text) ' +
    'GROUP BY stage, currency ORDER BY stage, currency',
    [tenantId, stage || 'open'],
  );
  return {
    success: true,
    rows: rows.map((r) => ({
      stage: r.stage,
      currency: r.currency,
      total_amount: Number(r.total_amount),
      deal_count: Number(r.deal_count),
    })),
  };
}

// ── FX for pipeline_summary ─────────────────────────────────────────────
//
// Conversion lives here, in Node, rather than as another httpRequest node in
// the n8n workflow: n8n stays a plain GROUP BY and the rate handling is
// testable on its own. The landing site's /api/exchange-rate route was not
// reusable — it is hardcoded to USD->IDR (`data.rates?.IDR`), and a per-deal
// currency model needs arbitrary pairs.
//
// One call with a USD base yields USD->X for every currency, so any pair is
// X -> USD -> Y off a single response.
const FX_URL = 'https://open.er-api.com/v6/latest/USD';
const FX_TTL_MS = 60 * 60 * 1000; // rates are published hourly at best
let fxCache = null; // { rates, fetchedAt, providerUpdatedAt }

async function usdRates() {
  if (fxCache && Date.now() - fxCache.fetchedAt < FX_TTL_MS) return fxCache;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const resp = await fetch(FX_URL, { signal: controller.signal });
    if (!resp.ok) throw new Error(`rate provider returned HTTP ${resp.status}`);
    const body = await resp.json();
    if (!body?.rates || typeof body.rates !== 'object') throw new Error('rate provider returned no rates');
    fxCache = {
      rates: body.rates,
      fetchedAt: Date.now(),
      providerUpdatedAt: body.time_last_update_utc || null,
    };
    return fxCache;
  } finally {
    clearTimeout(timer);
  }
}

// Turns n8n's per-(stage, currency) rows into a single-currency total.
// Deliberately all-or-nothing: if any currency present has no published rate,
// the untouched per-currency breakdown is returned with a reason, rather than
// a total that silently omits some deals.
async function convertPipelineSummary(data, args) {
  const target = args?.convert_to;
  if (!target) return data;
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  if (rows.length === 0) return data;

  let fx;
  try {
    fx = await usdRates();
  } catch (e) {
    return { ...data, conversion: { ok: false, reason: `could not fetch exchange rates: ${e.message}` } };
  }
  // USD is the base, so it is absent from the rates map by convention.
  const rateOf = (code) => (code === 'USD' ? 1 : fx.rates[code]);

  const targetRate = rateOf(target);
  if (!targetRate) {
    return { ...data, conversion: { ok: false, reason: `no published rate for ${target}` } };
  }
  const missing = [...new Set(rows.map((r) => r.currency).filter((c) => c && !rateOf(c)))];
  if (missing.length) {
    return {
      ...data,
      conversion: { ok: false, reason: `no published rate for ${missing.join(', ')}; totals left unconverted` },
    };
  }

  const used = {};
  const byStage = {};
  let grand = 0;
  for (const r of rows) {
    const amount = Number(r.total_amount) || 0;
    // X -> USD -> target, off the one USD-based response.
    const factor = targetRate / rateOf(r.currency);
    used[r.currency] = Number(factor.toFixed(8));
    const converted = amount * factor;
    byStage[r.stage] = (byStage[r.stage] || 0) + converted;
    grand += converted;
  }

  return {
    ...data,
    conversion: {
      ok: true,
      currency: target,
      total: Number(grand.toFixed(2)),
      by_stage: Object.fromEntries(Object.entries(byStage).map(([k, v]) => [k, Number(v.toFixed(2))])),
      rates_used: used,
      rates_provider: 'open.er-api.com',
      rates_updated_at: fx.providerUpdatedAt,
      note: 'A converted total moves with the exchange rate. Quote rates_updated_at alongside it.',
    },
  };
}

export const tools = [
  {
    name: 'create_lead',
    description: 'Create a new lead for this tenant.',
    inputSchema: {
      name: z.string().min(1).max(300),
      company: z.string().max(300).default(''),
      email: z.string().max(300).default(''),
    },
    action: 'create_lead',
    handler: createLead,
  },
  {
    name: 'list_leads',
    description: "List this tenant's leads, optionally filtered by pipeline stage.",
    inputSchema: {
      stage: z.union([stageEnum, z.literal('all')]).default('all'),
    },
    action: 'list_leads',
    handler: listLeads,
  },
  {
    name: 'get_lead',
    description: 'Get full details of one lead by id, including BANT qualification fields.',
    inputSchema: {
      lead_id: z.string().uuid(),
    },
    action: 'get_lead',
    handler: getLead,
  },
  {
    name: 'update_lead_stage',
    description: 'Move a lead to a new pipeline stage.',
    inputSchema: {
      lead_id: z.string().uuid(),
      stage: stageEnum,
    },
    action: 'update_lead_stage',
    handler: updateLeadStage,
  },
  {
    name: 'update_bant',
    description: 'Record or update BANT qualification (Budget, Authority, Need, Timeline) notes for a lead.',
    inputSchema: {
      lead_id: z.string().uuid(),
      bant_budget: z.string().max(500).default(''),
      bant_authority: z.string().max(500).default(''),
      bant_need: z.string().max(500).default(''),
      bant_timeline: z.string().max(500).default(''),
      notes: z.string().max(2000).default(''),
    },
    action: 'update_bant',
    handler: updateBant,
  },
  {
    name: 'enrich_lead_contact',
    description:
      "Look up a verified business email and/or mobile phone number for a lead using paid data providers " +
      "(Hunter.io for email, Lusha for mobile phone). This spends real money from the tenant's Lead Enrichment " +
      "wallet balance — only call it when the user has explicitly asked to find contact info for a specific " +
      "lead, never automatically for every lead created. Fields the lead already has are skipped and not " +
      "charged. Returns an insufficient_balance error (with the current balance) if the wallet can't cover the " +
      "requested lookups — relay that to the user as a prompt to top up, don't retry silently.",
    inputSchema: {
      lead_id: z.string().uuid(),
      fields: z.array(z.enum(['email', 'phone'])).min(1).default(['email', 'phone']),
    },
    action: 'enrich_lead_contact',
  },
  {
    name: 'update_deal',
    description:
      "Record or update the commercial side of a lead: its value, currency, expected close date, owner and " +
      "win probability. This is what turns a qualified lead into a deal you can forecast — `won`/`lost` mean " +
      "nothing without it. " +
      "ALWAYS ASK THE USER WHICH CURRENCY a deal is in before calling this; never assume USD, and never infer " +
      "it from the lead's country. A business can hold IDR and USD deals side by side, and each is stored " +
      "separately. The database enforces this: an amount without a currency is rejected outright. " +
      "Pass only the fields you are actually changing — omitted fields are left as they are.",
    inputSchema: {
      lead_id: z.string().uuid(),
      amount: z.number().nonnegative().max(99_999_999_999.99).optional(),
      // ISO-4217 only. The DB has the same rule; failing here gives the model a
      // usable error instead of a Postgres constraint violation.
      currency: z
        .string()
        .regex(/^[A-Z]{3}$/, 'currency must be a 3-letter ISO-4217 code in capitals, e.g. IDR, USD, SGD')
        .optional(),
      expected_close_date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'expected_close_date must be YYYY-MM-DD')
        .optional(),
      owner: z.string().max(300).optional(),
      probability: z.number().int().min(0).max(100).optional(),
    },
    action: 'update_deal',
    handler: updateDeal,
  },
  {
    name: 'pipeline_summary',
    description:
      "Total the deal value sitting in the pipeline, broken down by stage and currency. " +
      "By default it returns each currency separately (e.g. IDR 450,000,000 across 3 deals AND USD 12,000 " +
      "across 1) — which is always truthful, because sums across currencies are not comparable. " +
      "IF THE TENANT HOLDS MORE THAN ONE CURRENCY, ASK THE USER whether they want a single combined figure " +
      "before converting; only then call again with `convert_to`. A converted total moves when the exchange " +
      "rate moves, so the response carries the rates and the timestamp used — quote them alongside the number " +
      "rather than presenting it as a settled fact.",
    inputSchema: {
      stage: z.union([stageEnum, z.literal('open'), z.literal('all')]).default('open'),
      convert_to: z
        .string()
        .regex(/^[A-Z]{3}$/, 'convert_to must be a 3-letter ISO-4217 code in capitals')
        .optional(),
    },
    action: 'pipeline_summary',
    handler: pipelineSummary,
    postProcess: convertPipelineSummary,
  },
];
