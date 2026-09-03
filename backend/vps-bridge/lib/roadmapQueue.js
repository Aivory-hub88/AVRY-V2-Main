'use strict';
/**
 * Roadmap generation job queue (BullMQ + Redis).
 *
 * Decouples the roadmap LLM call from the HTTP request so the frontend
 * POSTs once, gets a job_id, and polls for the result — the same pattern
 * blueprintQueue.js has used since 2026-08-09.
 *
 * 2026-08-25: roadmap generation previously ran synchronously through the
 * bridge's /console/stream (handleRoadmapGenerateDirect): 70s+ measured
 * live for a simple prompt, hard 90s server / 95s client timeouts, and a
 * silent generic-template fallback whenever those fired under load. This
 * queue replaces that path with the blueprint ladder's proven tiers.
 *
 * This module only sends the already-built prompt to the model and returns
 * the raw text response — parsing/normalization/fallback stays in the
 * Next.js layer (lib/roadmapGeneration.ts) so it's written once, in
 * TypeScript, next to the AiryRoadmap type it produces.
 */
const { Queue } = require('bullmq');
const IORedis = require('ioredis');
const { redisOptions } = require('./diagnosticQueue');

const QUEUE_NAME = 'roadmaps';

const queueConnection = new IORedis(redisOptions);
const roadmapQueue = new Queue(QUEUE_NAME, { connection: queueConnection });

// Same model the console/roadmap direct path used (server.js CONSOLE_MODEL),
// kept identical so output quality/style doesn't change — only the routing
// path and the reasoning profile do.
const ROADMAP_MODEL = process.env.ROADMAP_MODEL || 'deepseek/deepseek-v4-flash-0731';
const ROADMAP_TIMEOUT_MS = parseInt(process.env.ROADMAP_TIMEOUT_MS || '60000', 10);
const ROADMAP_FALLBACK_TIMEOUT_MS = parseInt(process.env.ROADMAP_FALLBACK_TIMEOUT_MS || '180000', 10);
// Different-model last resort, tried reasoning-off after both primary tiers
// fail — sidesteps whatever is specifically wrong with ROADMAP_MODEL's
// provider right now. Comma-separated.
const ROADMAP_FAILOVER_MODELS = (process.env.ROADMAP_FAILOVER_MODELS || 'qwen/qwen3-235b-a22b')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);
const ROADMAP_FAILOVER_TIMEOUT_MS = parseInt(process.env.ROADMAP_FAILOVER_TIMEOUT_MS || '60000', 10);

// Real roadmaps measured 2.5k-5k chars; a degenerate output can't be a real
// roadmap no matter how well-formed its JSON is.
const MIN_ROADMAP_CHARS = parseInt(process.env.MIN_ROADMAP_CHARS || '800', 10);

/**
 * Structural validation — did the model return parseable JSON containing a
 * non-empty phases array with named phases? Fence-tolerant (```json fences).
 */
function isUsableRoadmap(content) {
  if (!content || typeof content !== 'string') { console.warn('[roadmap-validator] reject: empty/non-string content'); return false; }
  if (content.length < MIN_ROADMAP_CHARS) {
    console.warn(`[roadmap-validator] reject: ${content.length} chars < MIN_ROADMAP_CHARS=${MIN_ROADMAP_CHARS} (degenerate output)`);
    return false;
  }
  let text = content.trim();
  const fence = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fence && fence[1]) text = fence[1].trim();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    console.warn(`[roadmap-validator] reject: JSON.parse failed (${err.message}); head=${text.slice(0, 150).replace(/\n/g, ' ')}`);
    return false;
  }
  const phases = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed.phases : null;
  if (!Array.isArray(phases) || phases.length === 0) {
    console.warn('[roadmap-validator] reject: phases missing/empty');
    return false;
  }
  const bad = phases.findIndex((p) => !p || typeof p !== 'object' || typeof p.name !== 'string' || !p.name.trim() || !Array.isArray(p.milestones));
  if (bad !== -1) {
    console.warn(`[roadmap-validator] reject: phases[${bad}] missing name or milestones`);
    return false;
  }
  return true;
}

/**
 * One OpenRouter chat completion (SSE streaming — keeps the connection
 * active and surfaces TTFT; see blueprintQueue.js callModel for the full
 * rationale on stream:true and reasoning:{enabled:false}).
 */
async function callModel({ userContent, reasoningEnabled, timeoutMs, model = ROADMAP_MODEL, tier = 'unnamed' }) {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  if (!OPENROUTER_API_KEY) throw new Error('OpenRouter API key not configured');

  const body = {
    model,
    messages: [{ role: 'user', content: userContent }],
    stream: true,
    max_tokens: 6000,
    temperature: 0.4,
  };
  if (!reasoningEnabled) body.reasoning = { enabled: false };

  const t0 = Date.now();
  console.log(`[roadmap-worker] model call start tier=${tier} model=${model} reasoning=${reasoningEnabled ? 'on' : 'off'} promptChars=${userContent.length}`);
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
    console.warn(`[roadmap-worker] model call ${isTimeout ? 'TIMED OUT' : 'NETWORK ERROR'} tier=${tier} model=${model} elapsedMs=${Date.now() - t0}: ${err.message}`);
    throw err;
  }
  console.log(`[roadmap-worker] model call headers tier=${tier} model=${model} status=${orRes.status} elapsedMs=${Date.now() - t0}`);

  if (!orRes.ok || !orRes.body) {
    const errText = orRes.body ? await orRes.text().catch(() => 'unknown error') : 'no body';
    throw new Error(`OpenRouter error ${orRes.status} (model=${model}): ${String(errText).substring(0, 200)}`);
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
  console.log(`[roadmap-worker] model call done tier=${tier} model=${model} reasoning=${reasoningEnabled ? 'on' : 'off'} elapsedMs=${Date.now() - t0} ttftMs=${ttftMs} finish=${finishReason} chars=${content.length}`);
  if (!content.trim()) throw new Error('Roadmap generation returned empty content');
  return content;
}

/**
 * Escalating generation: fast no-reasoning → reasoning-on → failover models.
 * Identical shape to the blueprint ladder; roadmap JSON is smaller, so the
 * timeouts are tighter.
 */
async function runRoadmapGeneration({ messages }) {
  if (!Array.isArray(messages)) throw new Error('messages array required');
  const lastUserMessage = [...messages].reverse().find(
    (m) => m && m.role === 'user' && typeof m.content === 'string' && m.content.trim()
  );
  if (!lastUserMessage) throw new Error('No user message provided');
  const userContent = lastUserMessage.content;

  // Tier 1: fast, no-reasoning, primary model.
  try {
    const fast = await callModel({ userContent, reasoningEnabled: false, timeoutMs: ROADMAP_TIMEOUT_MS, tier: 'fast' });
    if (isUsableRoadmap(fast)) return { content: fast, tier: 'fast' };
    console.warn('[roadmap-worker] tier=fast result not a usable roadmap — escalating to tier=fallback');
  } catch (err) {
    console.warn(`[roadmap-worker] tier=fast failed (${err.message}) — escalating to tier=fallback`);
  }

  // Tier 2: reasoning-on, primary model. Warn-only on structure (the Next.js
  // poll route has its own JSON extraction + flagged fallback — failing here
  // on format alone would throw away a result it might salvage) but a
  // suspiciously SMALL result can't be repaired by anyone.
  let fallbackErr = null;
  try {
    const fallback = await callModel({ userContent, reasoningEnabled: true, timeoutMs: ROADMAP_FALLBACK_TIMEOUT_MS, tier: 'fallback' });
    if (fallback.length >= MIN_ROADMAP_CHARS) {
      if (!isUsableRoadmap(fallback)) {
        console.warn('[roadmap-worker] tier=fallback result not structurally clean — returning it anyway for Next.js-layer normalization');
      }
      return { content: fallback, tier: 'fallback' };
    }
    fallbackErr = new Error(`Roadmap generation degenerate: ${fallback.length} chars even with reasoning enabled`);
  } catch (err) {
    fallbackErr = err;
  }
  console.warn(`[roadmap-worker] tier=fallback failed (${fallbackErr.message})${ROADMAP_FAILOVER_MODELS.length ? ` — escalating to failover models: ${ROADMAP_FAILOVER_MODELS.join(', ')}` : ' — no ROADMAP_FAILOVER_MODELS configured, failing job'}`);

  // Tier 3+: fast, no-reasoning, each configured DIFFERENT model in order.
  for (const failoverModel of ROADMAP_FAILOVER_MODELS) {
    const tierLabel = `failover:${failoverModel}`;
    try {
      const failover = await callModel({ userContent, reasoningEnabled: false, timeoutMs: ROADMAP_FAILOVER_TIMEOUT_MS, model: failoverModel, tier: tierLabel });
      if (failover.length >= MIN_ROADMAP_CHARS) {
        if (!isUsableRoadmap(failover)) {
          console.warn(`[roadmap-worker] tier=${tierLabel} result not structurally clean — returning it anyway for Next.js-layer normalization`);
        }
        return { content: failover, tier: tierLabel };
      }
      console.warn(`[roadmap-worker] tier=${tierLabel} result too small (${failover.length} chars) — trying next tier`);
    } catch (err) {
      console.warn(`[roadmap-worker] tier=${tierLabel} failed (${err.message}) — trying next tier`);
    }
  }

  throw fallbackErr;
}

module.exports = { QUEUE_NAME, roadmapQueue, runRoadmapGeneration, isUsableRoadmap };
