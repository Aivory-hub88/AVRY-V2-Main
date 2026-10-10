'use strict';
/**
 * Deep-diagnostic job queue (BullMQ + Redis).
 *
 * Decouples the long (≤115s) OpenRouter call from the HTTP request so the
 * frontend POSTs once, gets a job_id, and polls for the result — avoiding the
 * Cloudflare ~100s timeout that breaks the synchronous /diagnostics/run path.
 *
 * runDeepDiagnostic() is the same generation logic as the legacy sync handler
 * in server.js (kept there untouched as a fallback). Used by worker.js.
 */
const { Queue } = require('bullmq');
const IORedis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

const QUEUE_NAME = 'diagnostics';

// Model + timeout knobs. 2026-10-10: the previous default, qwen/qwen3-235b-a22b,
// was retired by OpenRouter on 2026-10-09 (404 on every call), and because the
// fallback tier reused the SAME model, the whole AI analysis went dark. The
// tiers now use DIFFERENT models so one retirement/outage can't take out both:
// tier 1 = DeepSeek V4.1 Flash (Cerveau's model; in the 2026-10-10 eval 9/9
// valid JSON, 6-10 s, and the only candidate that stopped padding "strengths"
// with non-strengths on weak profiles), tier 2 = Qwen 3.7 Plus (OpenRouter's
// named successor to the retired model; 9/9 valid JSON). Both reasoning OFF.
const DIAGNOSTIC_MODEL = process.env.DIAGNOSTIC_MODEL || 'deepseek/deepseek-v4.1-flash';
const DIAGNOSTIC_FALLBACK_MODEL = process.env.DIAGNOSTIC_FALLBACK_MODEL || 'qwen/qwen3.7-plus';
const DIAGNOSTIC_TIMEOUT_MS = parseInt(process.env.DIAGNOSTIC_TIMEOUT_MS || '60000', 10);
const DIAGNOSTIC_FALLBACK_TIMEOUT_MS = parseInt(process.env.DIAGNOSTIC_FALLBACK_TIMEOUT_MS || '115000', 10);

const redisOptions = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // required by BullMQ
};

const connection = new IORedis(redisOptions);
const diagnosticQueue = new Queue(QUEUE_NAME, { connection });

const DIAGNOSTIC_SYSTEM_PROMPT = `You are a business operations diagnostic expert. You assess how ready a business's operations are for automation and AI, based on its answers to the Aivory Business Operations Deep Diagnostic. Return a structured JSON assessment.

You MUST respond with ONLY a valid JSON object — no markdown, no code blocks, no commentary, no trailing commas.

Return this EXACT JSON structure:
{
  "ai_readiness_score": <number 0-100>,
  "maturity_level": "<Nascent|Initiating|Developing|Defined|Optimising>",
  "strengths": ["<1 to 3 genuine existing strengths — see rule 4>"],
  "primary_constraints": ["<constraint 1>", "<constraint 2>", "<constraint 3>"],
  "automation_opportunities": ["<opportunity 1>", "<opportunity 2>", "<opportunity 3>"],
  "narrative_summary": "<2-3 sentence summary>",
  "recommended_next_step": "<single most important next action>",
  "translations": {
    "id": {
      "strengths": ["<Bahasa Indonesia, same items as strengths>"],
      "primary_constraints": ["...", "...", "..."],
      "automation_opportunities": ["...", "...", "..."],
      "narrative_summary": "<Bahasa Indonesia>",
      "recommended_next_step": "<Bahasa Indonesia>"
    }
  }
}

The input has the four diagnostic phases (business objectives & KPIs, data & process readiness, risk & constraints, opportunity mapping). It may also have a "report_context" object holding the OFFICIAL score and maturity level that the user's report already displays.

RULES:
1. Official score: if report_context is present, set ai_readiness_score and maturity_level to exactly its values. In the prose fields never state a different score or a different maturity stage — the user sees the official ones beside your text, and any mismatch reads as a broken report. Prefer not to repeat the score in prose at all. If you name the stage inside translations.id, use report_context.maturity_label_id exactly (e.g. "Berkembang"), never the English name or another translation.
2. Ground every statement in THIS diagnostic. Every recommendation (adopting a no-code automation, building custom software/an API, buying a tool, restructuring a process, hiring a role) must tie to a specific answer or pain point, name what it should do, and name which actual constraint or system it addresses. Never suggest a solution that doesn't map to a concrete signal in the data.
3. Never invent figures. Only use numbers that appear in the answers (hours, percentages, budgets, headcount, timelines). Do not estimate savings, ROI or costs — the report computes those separately.
4. Strengths must be capabilities the business ALREADY has (from its answers) — never targets, ambitions, chosen priority areas, or the fact that it has identified its problems. If the answers support fewer than three genuine strengths, return fewer (at least one) rather than padding the list.
5. Do not name third-party automation/integration platforms (e.g. Zapier, Make, n8n, IFTTT, Power Automate) — describe the automation itself (trigger, data, outcome); Aivory is the user's automation platform. Do not tell the user to hire an external consultant, agency or partner.
6. Be respectful: describe gaps factually, never sarcastically or as doubting the user's answers.
7. Language: the top-level prose fields are in English. "translations.id" carries the SAME content in natural, professional Bahasa Indonesia (keep common business terms such as KPI, dashboard, workflow, ERP, POS in English) — same number of items, same meaning, no added or dropped facts.`;

function ensureArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return value.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}

/**
 * Structural validation — is this a usable diagnostic assessment at all?
 * Before this existed, a malformed/partial LLM response (missing score,
 * missing maturity_level, or literally no findings) was silently papered
 * over with hardcoded defaults ('Developing', score 0) below and returned
 * as a normal "completed" job — indistinguishable from a real assessment to
 * both the job queue and the user. Mirrors blueprintQueue.js's
 * isUsableBlueprint: reject here so the job legitimately fails/retries
 * instead of shipping a fake-looking result.
 */
function isUsableDiagnosticResult(result) {
  if (!result || typeof result !== 'object') return false;
  const score = typeof result.ai_readiness_score === 'number' ? result.ai_readiness_score : result.score;
  if (typeof score !== 'number' || score < 0 || score > 100) {
    console.warn('[diagnostic-validator] reject: ai_readiness_score missing or out of range');
    return false;
  }
  if (typeof result.maturity_level !== 'string' || !result.maturity_level.trim()) {
    console.warn('[diagnostic-validator] reject: maturity_level missing/empty');
    return false;
  }
  const strengths = ensureArray(result.strengths);
  const constraints = ensureArray(result.primary_constraints);
  const opportunities = ensureArray(result.automation_opportunities);
  if (strengths.length === 0 && constraints.length === 0 && opportunities.length === 0) {
    console.warn('[diagnostic-validator] reject: no strengths/constraints/opportunities at all');
    return false;
  }
  return true;
}

/**
 * One OpenRouter chat completion with SSE streaming. `reasoningEnabled=false`
 * actually disables thinking on hybrid models (measured on the blueprint
 * ladder 2026-08-22: 14.5s with reasoning off vs 128.6s on the SAME prompt —
 * {exclude:true} does NOT skip thinking, it merely hides it). Streaming keeps
 * the connection active so an idle-response stall surfaces as TTFT in the
 * logs instead of a silent black box.
 */
async function callModel({ model, userContent, reasoningEnabled, timeoutMs, tier }) {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  if (!OPENROUTER_API_KEY) throw new Error('OpenRouter API key not configured');

  const body = {
    model,
    messages: [
      { role: 'system', content: DIAGNOSTIC_SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
    stream: true,
    max_tokens: 4000,
  };
  // Only send the param when disabling — omitting it preserves the model's
  // default (reasoning on) for the fallback attempt.
  if (!reasoningEnabled) body.reasoning = { enabled: false };

  const t0 = Date.now();
  console.log(`[diag-worker] model call start tier=${tier} model=${model} reasoning=${reasoningEnabled ? 'on' : 'off'} promptChars=${userContent.length}`);
  let orRes;
  try {
    orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://aivory.app',
        'X-Title': 'Aivory',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const isTimeout = err && (err.name === 'TimeoutError' || err.name === 'AbortError');
    console.warn(`[diag-worker] model call ${isTimeout ? 'TIMED OUT' : 'NETWORK ERROR'} tier=${tier} elapsedMs=${Date.now() - t0}: ${err.message}`);
    throw err;
  }
  console.log(`[diag-worker] model call headers tier=${tier} status=${orRes.status} elapsedMs=${Date.now() - t0}`);

  if (!orRes.ok || !orRes.body) {
    const errText = orRes.body ? await orRes.text().catch(() => 'unknown error') : 'no body';
    throw new Error(`OpenRouter error ${orRes.status}: ${String(errText).substring(0, 200)}`);
  }

  const reader = orRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';
  let ttftMs = null;
  let finishReason = null;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith('data:')) continue;
      const payload = t.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      let evt;
      try { evt = JSON.parse(payload); } catch { continue; }
      if (evt.error) throw new Error(`OpenRouter stream error: ${String(evt.error?.message || evt.error).substring(0, 200)}`);
      const delta = evt.choices?.[0]?.delta?.content;
      if (delta) {
        if (ttftMs === null) ttftMs = Date.now() - t0;
        content += delta;
      }
      if (evt.choices?.[0]?.finish_reason) finishReason = evt.choices[0].finish_reason;
    }
  }
  console.log(`[diag-worker] model call done tier=${tier} reasoning=${reasoningEnabled ? 'on' : 'off'} elapsedMs=${Date.now() - t0} ttftMs=${ttftMs} finish=${finishReason} chars=${content.length}`);
  if (!content.trim()) throw new Error('Diagnostic generation returned empty content');
  return content;
}

/**
 * Fence-tolerant JSON extraction — models occasionally wrap JSON in ```json
 * fences, and DeepSeek occasionally emits a trailing comma before ] or }
 * (1 in 9 calls in the 2026-10-10 eval), which used to throw and push the
 * job onto the slower fallback tier for a purely cosmetic syntax slip.
 */
function extractJson(content) {
  try {
    return JSON.parse(content);
  } catch {
    const jsonMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : null;
    if (!jsonStr) throw new Error('AI engine returned invalid JSON');
    try {
      return JSON.parse(jsonStr);
    } catch {
      return JSON.parse(jsonStr.replace(/,(\s*[}\]])/g, '$1'));
    }
  }
}

/**
 * Run the deep diagnostic against OpenRouter and return the normalized result.
 * Throws on any failure (worker marks the job failed) — including a
 * structurally unusable result, so BullMQ's retry (see server.js
 * diagnosticQueue.add) gets a real second attempt instead of the caller
 * silently receiving placeholder content.
 *
 * 2026-08-25: two-tier ladder, mirroring the blueprint queue's proven
 * pattern. Tier 1 = reasoning OFF (fast; the diagnostic JSON is small and
 * structured — thinking added 100s+ for no quality gain in every inspected
 * case). Tier 2 = reasoning ON (the old behaviour) only when tier 1 failed
 * or produced an unusable assessment.
 */
/**
 * The dashboard sends its deterministic score/maturity inside `phases` as
 * `_report_context` (so the enqueue route in server.js needs no change).
 * Split it out and pass it to the model as a sibling `report_context` key.
 */
function splitReportContext(payload) {
  if (!payload || typeof payload !== 'object') return { phases: payload, reportContext: null };
  const { _report_context: raw, ...phases } = payload;
  const ok = raw && typeof raw === 'object' &&
    typeof raw.score === 'number' && raw.score >= 0 && raw.score <= 100 &&
    typeof raw.maturity_level === 'string' && raw.maturity_level.trim();
  if (!ok) return { phases, reportContext: null };
  const reportContext = { score: Math.round(raw.score), maturity_level: raw.maturity_level };
  if (typeof raw.maturity_label_id === 'string' && raw.maturity_label_id.trim()) reportContext.maturity_label_id = raw.maturity_label_id;
  return { phases, reportContext };
}

async function runDeepDiagnostic(payload) {
  const { phases, reportContext } = splitReportContext(payload);
  const userContent = JSON.stringify(reportContext ? { phases, report_context: reportContext } : phases, null, 2);

  // Tier 1: fast primary model.
  try {
    const fast = await callModel({ model: DIAGNOSTIC_MODEL, userContent, reasoningEnabled: false, timeoutMs: DIAGNOSTIC_TIMEOUT_MS, tier: 'fast' });
    const result = extractJson(fast);
    if (isUsableDiagnosticResult(result)) return normalizeDiagnostic(result, reportContext);
    console.warn('[diag-worker] tier=fast result unusable — escalating to tier=fallback');
  } catch (err) {
    console.warn(`[diag-worker] tier=fast failed (${err.message}) — escalating to tier=fallback`);
  }

  // Tier 2: a DIFFERENT model, so a retired/down primary can't sink both.
  const content = await callModel({ model: DIAGNOSTIC_FALLBACK_MODEL, userContent, reasoningEnabled: false, timeoutMs: DIAGNOSTIC_FALLBACK_TIMEOUT_MS, tier: 'fallback' });
  const result = extractJson(content);
  if (!isUsableDiagnosticResult(result)) {
    throw new Error('Diagnostic generation returned an incomplete/malformed assessment (missing score, maturity_level, or any findings)');
  }
  return normalizeDiagnostic(result, reportContext);
}

/** Indonesian copy, normalized like the top-level fields; null when absent/empty. */
function normalizeTranslationId(result) {
  const t = result && result.translations && result.translations.id;
  if (!t || typeof t !== 'object') return null;
  const out = {
    strengths: ensureArray(t.strengths),
    primary_constraints: ensureArray(t.primary_constraints),
    automation_opportunities: ensureArray(t.automation_opportunities),
    narrative_summary: typeof t.narrative_summary === 'string' ? t.narrative_summary : '',
    recommended_next_step: typeof t.recommended_next_step === 'string' ? t.recommended_next_step : '',
  };
  const empty = !out.narrative_summary && !out.recommended_next_step &&
    out.strengths.length + out.primary_constraints.length + out.automation_opportunities.length === 0;
  return empty ? null : out;
}

function normalizeDiagnostic(result, reportContext = null) {
  const diagnosticId = `DIAG_${uuidv4().replace(/-/g, '').substring(0, 12).toUpperCase()}`;
  // The report's deterministic score is authoritative; the model's own
  // number is only kept when no context was sent (older dashboards).
  const score = reportContext ? reportContext.score : (result.ai_readiness_score ?? result.score);
  const idCopy = normalizeTranslationId(result);
  return {
    ...result,
    diagnostic_id: diagnosticId,
    // score/maturity_level are validated present above — no silent default
    // here; a genuinely missing value now fails the job instead of shipping
    // a placeholder that looks like a real assessment.
    ai_readiness_score: score,
    score,
    maturity_level: reportContext ? reportContext.maturity_level : result.maturity_level,
    strengths: ensureArray(result.strengths),
    primary_constraints: ensureArray(result.primary_constraints),
    automation_opportunities: ensureArray(result.automation_opportunities),
    blockers: ensureArray(result.primary_constraints || result.blockers),
    opportunities: ensureArray(result.automation_opportunities || result.opportunities),
    // narrative_summary/recommended_next_step stay optional-with-empty-
    // default — cosmetic prose, not a number/label a user could mistake for
    // a real finding the way a defaulted score or maturity level would be.
    narrative_summary: result.narrative_summary || result.narrative || '',
    recommended_next_step: result.recommended_next_step || '',
    translations: idCopy ? { id: idCopy } : undefined,
  };
}

module.exports = { QUEUE_NAME, redisOptions, connection, diagnosticQueue, runDeepDiagnostic, isUsableDiagnosticResult, ensureArray, extractJson, splitReportContext, normalizeDiagnostic, DIAGNOSTIC_SYSTEM_PROMPT };
