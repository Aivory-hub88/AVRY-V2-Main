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
 * Run the deep diagnostic against OpenRouter and return the normalized result.
 * Throws on any failure (worker marks the job failed).
 */
async function runDeepDiagnostic(payload) {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  if (!OPENROUTER_API_KEY) throw new Error('OpenRouter API key not configured');

  const openrouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://aivory.app',
      'X-Title': 'Aivory',
    },
    body: JSON.stringify({
      model: process.env.DIAGNOSTIC_MODEL || 'qwen/qwen3-235b-a22b',
      messages: [
        { role: 'system', content: DIAGNOSTIC_SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(payload, null, 2) },
      ],
      stream: false,
    }),
    signal: AbortSignal.timeout(115_000),
  });

  if (!openrouterRes.ok) {
    const errText = await openrouterRes.text().catch(() => 'unknown error');
    throw new Error(`OpenRouter error ${openrouterRes.status}: ${String(errText).substring(0, 200)}`);
  }

  const openrouterData = await openrouterRes.json();
  const content = openrouterData?.choices?.[0]?.message?.content;
  if (!content) throw new Error('AI engine returned empty response');

  let result;
  try {
    result = JSON.parse(content);
  } catch {
    const jsonMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : null;
    if (!jsonStr) throw new Error('AI engine returned invalid JSON');
    result = JSON.parse(jsonStr);
  }

  const diagnosticId = `DIAG_${uuidv4().replace(/-/g, '').substring(0, 12).toUpperCase()}`;
  return {
    ...result,
    diagnostic_id: diagnosticId,
    ai_readiness_score: result.ai_readiness_score || result.score || 0,
    score: result.ai_readiness_score || result.score || 0,
    maturity_level: result.maturity_level || 'Developing',
    strengths: ensureArray(result.strengths),
    primary_constraints: ensureArray(result.primary_constraints),
    automation_opportunities: ensureArray(result.automation_opportunities),
    blockers: ensureArray(result.primary_constraints || result.blockers),
    opportunities: ensureArray(result.automation_opportunities || result.opportunities),
    narrative_summary: result.narrative_summary || result.narrative || '',
    recommended_next_step: result.recommended_next_step || '',
  };
}

module.exports = { QUEUE_NAME, redisOptions, connection, diagnosticQueue, runDeepDiagnostic };
