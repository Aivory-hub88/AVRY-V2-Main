import { z } from 'zod';

// Native, zero-signup CRM/lead-pipeline backend for the leads_qualifier agent
// type. Mirrors customer-service.mjs's structure: tenant_id is injected by the
// bridge from the MCP session, never accepted from tool arguments.

export const agentType = 'leads_qualifier';
export const mcpPath = 'leads-qualifier';
export const webhookEnvVar = 'N8N_WEBHOOK_LEADS_QUALIFIER';

const stageEnum = z.enum(['new', 'qualifying', 'qualified', 'disqualified', 'won', 'lost']);

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
  },
  {
    name: 'list_leads',
    description: "List this tenant's leads, optionally filtered by pipeline stage.",
    inputSchema: {
      stage: z.union([stageEnum, z.literal('all')]).default('all'),
    },
    action: 'list_leads',
  },
  {
    name: 'get_lead',
    description: 'Get full details of one lead by id, including BANT qualification fields.',
    inputSchema: {
      lead_id: z.string().uuid(),
    },
    action: 'get_lead',
  },
  {
    name: 'update_lead_stage',
    description: 'Move a lead to a new pipeline stage.',
    inputSchema: {
      lead_id: z.string().uuid(),
      stage: stageEnum,
    },
    action: 'update_lead_stage',
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
    postProcess: convertPipelineSummary,
  },
];
