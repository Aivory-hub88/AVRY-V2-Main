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

// Model + timeout knobs. DIAGNOSTIC_MODEL is a hybrid-thinking model on
// OpenRouter; the ladder below disables thinking on tier 1 (see callModel).
const DIAGNOSTIC_MODEL = process.env.DIAGNOSTIC_MODEL || 'qwen/qwen3-235b-a22b';
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

const DIAGNOSTIC_SYSTEM_PROMPT = `You are an AI readiness diagnostic expert. Analyze the provided business diagnostic data and return a structured JSON assessment.

You MUST respond with ONLY a valid JSON object — no markdown, no code blocks, no commentary.

Return this EXACT JSON structure:
{
  "ai_readiness_score": <number 0-100>,
  "maturity_level": "<Nascent|Initiating|Developing|Defined|Optimizing>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "primary_constraints": ["<constraint 1>", "<constraint 2>", "<constraint 3>"],
  "automation_opportunities": ["<opportunity 1>", "<opportunity 2>", "<opportunity 3>"],
  "narrative_summary": "<2-3 sentence summary of AI readiness>",
  "recommended_next_step": "<single most important next action>"
}

Base your assessment on the four diagnostic phases provided: business objectives & KPIs, data & process readiness, risk & constraints, and AI opportunity mapping.

Every recommendation — whether it's adopting a no-code automation, building custom software/an SDK/an API, purchasing or installing a specific tool, restructuring a process, or hiring a role — must be tied explicitly to a specific answer or pain point from THIS diagnostic, not a generic best practice. If you recommend building or buying something, name what it should do and which of the business's actual constraints/systems it addresses. Never suggest a solution that doesn't map to a concrete signal in the data provided.`;

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
async function callModel({ userContent, reasoningEnabled, timeoutMs, tier }) {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  if (!OPENROUTER_API_KEY) throw new Error('OpenRouter API key not configured');

  const body = {
    model: DIAGNOSTIC_MODEL,
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
  console.log(`[diag-worker] model call start tier=${tier} model=${DIAGNOSTIC_MODEL} reasoning=${reasoningEnabled ? 'on' : 'off'} promptChars=${userContent.length}`);
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

/** Fence-tolerant JSON extraction — models occasionally wrap JSON in ```json fences. */
function extractJson(content) {
  try {
    return JSON.parse(content);
  } catch {
    const jsonMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : null;
    if (!jsonStr) throw new Error('AI engine returned invalid JSON');
    return JSON.parse(jsonStr);
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
async function runDeepDiagnostic(payload) {
  const userContent = JSON.stringify(payload, null, 2);

  // Tier 1: fast, no-reasoning.
  try {
    const fast = await callModel({ userContent, reasoningEnabled: false, timeoutMs: DIAGNOSTIC_TIMEOUT_MS, tier: 'fast' });
    const result = extractJson(fast);
    if (isUsableDiagnosticResult(result)) return normalizeDiagnostic(result);
    console.warn('[diag-worker] tier=fast result unusable — escalating to tier=fallback');
  } catch (err) {
    console.warn(`[diag-worker] tier=fast failed (${err.message}) — escalating to tier=fallback`);
  }

  // Tier 2: reasoning-on — the pre-2026-08-25 behaviour.
  const content = await callModel({ userContent, reasoningEnabled: true, timeoutMs: DIAGNOSTIC_FALLBACK_TIMEOUT_MS, tier: 'fallback' });
  const result = extractJson(content);
  if (!isUsableDiagnosticResult(result)) {
    throw new Error('Diagnostic generation returned an incomplete/malformed assessment (missing score, maturity_level, or any findings)');
  }
  return normalizeDiagnostic(result);
}

function normalizeDiagnostic(result) {
  const diagnosticId = `DIAG_${uuidv4().replace(/-/g, '').substring(0, 12).toUpperCase()}`;
  const score = result.ai_readiness_score ?? result.score;
  return {
    ...result,
    diagnostic_id: diagnosticId,
    // score/maturity_level are validated present above — no silent default
    // here; a genuinely missing value now fails the job instead of shipping
    // a placeholder that looks like a real assessment.
    ai_readiness_score: score,
    score,
    maturity_level: result.maturity_level,
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
  };
}

module.exports = { QUEUE_NAME, redisOptions, connection, diagnosticQueue, runDeepDiagnostic, isUsableDiagnosticResult, ensureArray };
