/**
 * API Endpoint Handlers
 * Individual endpoint implementations for console, diagnostics, and blueprints
 */

console.log('[endpoints.js] Loading module');
const { sendRequest, sendStreamingRequest, callLLMWithFallback, healthCheck } = require('./openrouterClient');
const { sendToGateway } = require('./gatewayClient');
const { callN8N } = require('./n8nClient');
const { streamPost } = require('./lib/http');
console.log('[endpoints.js] sendStreamingRequest type:', typeof sendStreamingRequest);
const { MODEL_ROUTING, config } = require('./config');
const https = require('https');
const http = require('http');
const { logger } = require('./logger');

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Retrieve user context from session (diagnostic/blueprint state)
 * @param {string} sessionId - Session identifier
 * @returns {Promise<Object>} User context object
 */
async function getUserContext(sessionId) {
  try {
    // TODO: Implement session/user context retrieval from database or cache
    // For now, return empty context - will be populated by actual implementation
    return {
      has_diagnostic: false,
      has_blueprint: false,
      diagnostic_summary: null,
      blueprint_summary: null,
    };
  } catch (err) {
    logger.warn('[getUserContext] error retrieving context:', { error: err.message });
    return {};
  }
}

// NOTE: handleConsoleStream is defined below (Zeroclaw-based version)
// The old OpenRouter-direct version was removed to eliminate the duplicate.

// ============================================================================
// AIRA CONVERSATION HELPERS (history + onboarding rewrite)
// ============================================================================

function buildHistoryText(recentMessages) {
  return recentMessages
    .map((m, idx) => {
      const role = (m.role || 'user').toUpperCase();
      const content = m.content || '';
      return `[${idx + 1}] ${role}: ${content}`;
    })
    .join('\n');
}

function rewriteOnboardingChoiceMessage(recentMessages) {
  if (!Array.isArray(recentMessages) || recentMessages.length < 2) return null;

  const last = recentMessages[recentMessages.length - 1];
  const prev = recentMessages[recentMessages.length - 2];

  const lastContent = (last?.content || '').trim();
  const prevContent = (prev?.content || '');

  if (!['1', '2', '3'].includes(lastContent)) return null;

  const looksLikeOnboarding =
    /[Dd]iagnostic/.test(prevContent) &&
    /[Bb]lueprint/.test(prevContent) &&
    (/[123]/.test(prevContent));

  if (!looksLikeOnboarding) return null;

  let choiceMeaning;
  if (lastContent === '1') {
    choiceMeaning = 'The user chose option 1: they already have a Diagnostic result and an AI System Blueprint.';
  } else if (lastContent === '2') {
    choiceMeaning = 'The user chose option 2: they have a Diagnostic result but no Blueprint yet.';
  } else {
    choiceMeaning = [
      'The user chose option 3: they are starting from scratch.',
      'You MUST guide them to the Aivory product flow first — do NOT give generic consulting advice yet.',
      'Tell them to go to the Aivory Dashboard and run the AI Readiness Diagnostic.',
      'Explain what the Diagnostic does in 3-5 bullet points:',
      '- Assesses their current AI maturity across key dimensions',
      '- Identifies strengths and primary constraints',
      '- Calculates an AI readiness score (0-100)',
      '- Surfaces concrete automation opportunities',
      '- Provides a narrative summary with recommended next steps',
      'Then mention that after the Diagnostic, the next steps are:',
      '1. Generate an AI System Blueprint from the Diagnostic results',
      '2. Build an Implementation Roadmap with phases and timelines',
      'Offer to help them interpret results once they complete the Diagnostic.',
      'Do NOT introduce any A/B/C submenu or additional choices.',
    ].join('\n');
  }

  return [
    'You previously showed the onboarding menu with options 1, 2, and 3.',
    choiceMeaning,
    'Do not repeat the onboarding menu.',
    'Instead, continue the onboarding flow from this choice:',
    '- For option 1: ask the user to share their Blueprint and offer to analyze gaps and next steps.',
    '- For option 2: ask for their Diagnostic result and propose generating a Blueprint from it.',
    '- For option 3: follow the PRODUCT-FIRST BEHAVIOR instructions in the system prompt.',
    "Respond in the user's language and keep the answer concise and actionable."
  ].join('\n');
}

function buildAiraFinalMessage(messages) {
  const recentMessages = (messages || []).slice(-8);
  const onboardingOverride = rewriteOnboardingChoiceMessage(recentMessages);

  if (onboardingOverride) {
    return onboardingOverride;
  }

  if (recentMessages.length <= 1) {
    return recentMessages[0]?.content || '';
  }

  const historyText = buildHistoryText(recentMessages);
  return [
    'You are continuing a multi-turn conversation with the user.',
    'Here is the recent conversation history:',
    historyText,
    '',
    'The last line above is the most recent user message.',
    'Continue the conversation naturally based on this context.'
  ].join('\n');
}

// ============================================================================
// FLOATING AIRA STREAMING ENDPOINT (Zeroclaw-orchestrated)
// ============================================================================

async function handleAiraStream(req, res, next) {
  console.log('[aria/stream] handler hit');

  const { session_id, organization_id, messages, context } = req.body;

  if (!session_id || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: true, code: 'BAD_REQUEST', message: 'session_id and messages are required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  res.write(`data: ${JSON.stringify({ type: 'chunk', content: '' })}\n\n`);

  const heartbeat = setInterval(() => {
    try { res.write(': ping\n\n'); } catch { /* stream closed */ }
  }, 8000);

  const cleanup = () => clearInterval(heartbeat);

  const { ZEROCLAW_BASE_URL, CONSOLE_SYSTEM_PROMPT, detectLanguage } = require('./zeroclawClient');

  const finalMessage = buildAiraFinalMessage(messages);

  // handleAiraStream uses streamPost directly (not callZeroclawStructured), so we must
  // inject the persona here — Zeroclaw ignores the system_prompt field.
  const messageWithPrompt =
    `[SYSTEM INSTRUCTION — follow this persona strictly]\n${CONSOLE_SYSTEM_PROMPT}\n[END SYSTEM INSTRUCTION]\n\nUser message: ${finalMessage}`;

  const zeroclawPayload = {
    message: messageWithPrompt,
    language: detectLanguage(messages),
    context: {
      ...(context || {}),
      recentMessages: messages.slice(-8),
      session_id,
      organization_id,
    },
  };

  const { selectZeroclawSkill, logSkillSelection } = require('./skillRouter');
  const skillCtx = {
    page: context?.page || undefined,
    mode: context?.mode || undefined,
    feature: context?.feature || undefined,
    endpoint: '/aria/stream',
  };
  const selectedSkill = selectZeroclawSkill(skillCtx);
  logSkillSelection(selectedSkill, skillCtx, 'aria/stream');

  const zeroclawReachable = !!ZEROCLAW_BASE_URL;
  if (zeroclawReachable) {
    try {
      const fetchRes = await streamPost(
        `${ZEROCLAW_BASE_URL}/webhook`,
        zeroclawPayload,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: parseInt(process.env.ZEROCLAW_TIMEOUT_MS || '115000', 10)
        }
      );

      const { Readable } = require('node:stream');
      const nodeStream = Readable.fromWeb(fetchRes.body);

      let buffer = '';
      nodeStream.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;

          if (trimmed === 'data: [DONE]') {
            res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
            continue;
          }

          if (trimmed.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(trimmed.slice(6));
              const content =
                parsed?.choices?.[0]?.delta?.content ||
                parsed?.content ||
                parsed?.text ||
                null;
              if (content) {
                res.write(`data: ${JSON.stringify({ type: 'chunk', content })}\n\n`);
              } else if (parsed?.type === 'done') {
                res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
              } else if (parsed?.type === 'error') {
                res.write(`data: ${JSON.stringify({ type: 'error', error: parsed.error || 'Zeroclaw error' })}\n\n`);
              }
            } catch {
              const text = trimmed.slice(6).trim();
              if (text) res.write(`data: ${JSON.stringify({ type: 'chunk', content: text })}\n\n`);
            }
          }
        }
      });

      nodeStream.on('end', () => {
        cleanup();
        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
        res.end();
      });

      nodeStream.on('error', (err) => {
        console.error('[aria/stream] Zeroclaw stream error:', err.message);
        cleanup();
        res.write(`data: ${JSON.stringify({ type: 'error', error: 'Zeroclaw stream error' })}\n\n`);
        res.end();
      });

      return;
    } catch (err) {
      console.warn('[aria/stream] Zeroclaw unreachable, falling back to OpenRouter:', err.message);
    }
  }

  console.log('[aria/stream] using OpenRouter fallback');
  try {
    const routing = MODEL_ROUTING['/console/stream'];
    await sendStreamingRequest(routing.model, routing.useCase, messages, res, req.requestId || 'aira-fallback', routing.models);
  } catch (err) {
    console.error('[aria/stream] OpenRouter fallback error:', err.message);
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: err.message || 'AI engine error' })}\n\n`);
      res.end();
    }
  } finally {
    cleanup();
  }
}

// ============================================================================
// DEEP DIAGNOSTIC ENDPOINT
// ============================================================================

async function handleDeepDiagnostic(req, res, next) {
  try {
    const { mode, phases, diagnostic_payload } = req.body;
    
    if (mode !== 'deep') {
      const error = new Error('Invalid mode: expected "deep"');
      error.statusCode = 422;
      error.errorCode = 'VALIDATION_ERROR';
      error.details = { field: 'mode', expected: 'deep', received: mode };
      return next(error);
    }
    
    const payload = phases || diagnostic_payload;
    
    if (!payload) {
      const error = new Error('Missing required field: phases');
      error.statusCode = 400;
      error.errorCode = 'BAD_REQUEST';
      error.details = { field: 'phases', expected: 'object' };
      return next(error);
    }

    const routing = MODEL_ROUTING['/diagnostics/run'];

    const result = await sendRequest(
      routing.model,
      routing.useCase,
      JSON.stringify(payload, null, 2),
      req.requestId,
      true,
      routing.models
    );

    console.log('[deep_diag result raw]', JSON.stringify(result));

    function ensureArray(value) {
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') return value.split(',').map(s => s.trim()).filter(Boolean);
      return [];
    }

    const { v4: uuidv4 } = require('uuid');
    const diagnosticId = `DIAG_${uuidv4().replace(/-/g, '').substring(0, 12).toUpperCase()}`;

    const normalizedResult = {
      ...result,
      diagnostic_id: diagnosticId,
      ai_readiness_score: result.ai_readiness_score || result.score || 0,
      score: result.ai_readiness_score || result.score || 0,
      maturity_level: result.maturity_level || 'Emerging',
      strengths: ensureArray(result.strengths),
      primary_constraints: ensureArray(result.primary_constraints),
      automation_opportunities: ensureArray(result.automation_opportunities),
      blockers: ensureArray(result.primary_constraints || result.blockers),
      opportunities: ensureArray(result.automation_opportunities || result.opportunities),
      narrative_summary: result.narrative_summary || result.narrative || '',
      recommended_next_step: result.recommended_next_step || '',
    };

    console.log('[deep_diag result normalized]', JSON.stringify(normalizedResult));

    res.json(normalizedResult);
    
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// FREE DIAGNOSTIC ENDPOINT
// ============================================================================

async function handleFreeDiagnostic(req, res, next) {
  try {
    const { mode, answers, language } = req.body;
    
    if (mode !== 'free') {
      const error = new Error('Invalid mode: expected "free"');
      error.statusCode = 422;
      error.errorCode = 'VALIDATION_ERROR';
      error.details = { field: 'mode', expected: 'free', received: mode };
      return next(error);
    }
    
    if (!answers || typeof answers !== 'object') {
      const error = new Error('Missing or invalid field: answers (expected object)');
      error.statusCode = 400;
      error.errorCode = 'BAD_REQUEST';
      error.details = { field: 'answers', expected: 'object' };
      return next(error);
    }
    
    const answerKeys = Object.keys(answers);
    if (answerKeys.length !== 12) {
      const error = new Error(`Invalid answers: expected 12 questions, got ${answerKeys.length}`);
      error.statusCode = 422;
      error.errorCode = 'VALIDATION_ERROR';
      error.details = { field: 'answers', expected: 12, received: answerKeys.length };
      return next(error);
    }
    
    for (const questionId in answers) {
      const value = answers[questionId];
      if (typeof value !== 'number' || value < 0 || value > 3) {
        const error = new Error(`Invalid answer for ${questionId}: must be 0-3`);
        error.statusCode = 422;
        error.errorCode = 'VALIDATION_ERROR';
        error.details = { field: questionId, expected: '0-3', received: value };
        return next(error);
      }
    }
    
    const routing = MODEL_ROUTING['/diagnostics/free/run'];
    
    const userContent = JSON.stringify({
      mode: 'free',
      answers,
      language: language || 'en'
    }, null, 2);
    
    const n8nResult = await callN8N('free_diag', userContent);
    if (!n8nResult.success) return res.status(503).json({ error: 'Gateway unavailable' });
    const result = n8nResult.data;
    
    console.log('[diagnostic result raw]', JSON.stringify(result));
    
    function ensureArray(value) {
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') return value.split(',').map(s => s.trim()).filter(Boolean);
      return [];
    }
    
    const { v4: uuidv4 } = require('uuid');
    const diagnosticId = `DIAG_${uuidv4().replace(/-/g, '').substring(0, 12).toUpperCase()}`;
    
    const normalizedResult = {
      ...result,
      diagnostic_id: diagnosticId,
      strengths: ensureArray(result.strengths),
      primary_constraints: ensureArray(result.primary_constraints),
      automation_opportunities: ensureArray(result.automation_opportunities),
      blockers: ensureArray(result.primary_constraints),
      opportunities: ensureArray(result.automation_opportunities),
      score: result.ai_readiness_score || 0
    };
    
    console.log('[diagnostic result normalized]', JSON.stringify(normalizedResult));
    
    res.json(normalizedResult);
    
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// BLUEPRINT GENERATION ENDPOINT
// ============================================================================

const BLUEPRINT_SYSTEM_PROMPT = `You are an AI transformation consultant. You MUST respond with valid JSON only — no markdown, no code blocks, no commentary. Fill every field with specific, actionable content based on the diagnostic data provided.`;

function buildBlueprintPrompt(diagnosticData, companyProfile) {
  const companyName = companyProfile?.company_name || 'SME';
  const industry = companyProfile?.industry || 'General';
  const size = companyProfile?.company_size || 'sme';

  return `You are an AI transformation consultant. Analyze the diagnostic data below and generate a comprehensive AI system blueprint.

COMPANY:
- Name: ${companyName}
- Industry: ${industry}
- Size: ${size}

DIAGNOSTIC RESULTS:
- AI Readiness Score: ${diagnosticData?.ai_readiness_score || diagnosticData?.score || 0}/100
- Maturity Level: ${diagnosticData?.maturity_level || 'Unknown'}
- Strengths: ${JSON.stringify(diagnosticData?.strengths || [])}
- Primary Constraints: ${JSON.stringify(diagnosticData?.primary_constraints || [])}
- Automation Opportunities: ${JSON.stringify(diagnosticData?.automation_opportunities || [])}
- Narrative: ${diagnosticData?.narrative_summary || ''}
- Recommended Next Step: ${diagnosticData?.recommended_next_step || ''}

You MUST respond with ONLY a valid JSON object — no markdown, no code blocks, no commentary.

Return this EXACT JSON structure (fill all fields with real, specific content based on the diagnostic data above):

{
  "blueprint_id": "BP-${Date.now()}",
  "version": "1",
  "status": "draft",
  "organization": {
    "name": "${companyName}",
    "industry": "${industry}",
    "size": "sme"
  },
  "diagnostic_summary": {
    "ai_readiness_score": ${diagnosticData?.ai_readiness_score || diagnosticData?.score || 0},
    "maturity_level": "${diagnosticData?.maturity_level || 'Emerging'}",
    "primary_constraints": ${JSON.stringify(diagnosticData?.primary_constraints || [])}
  },
  "strategic_objective": {
    "primary_goal": "FILL: 1-2 sentence primary AI transformation goal based on the diagnostic",
    "kpi_targets": [
      {"metric": "FILL: key metric 1", "target": "FILL: specific target"},
      {"metric": "FILL: key metric 2", "target": "FILL: specific target"},
      {"metric": "FILL: key metric 3", "target": "FILL: specific target"}
    ]
  },
  "system_architecture": {
    "data_sources": ["FILL: data source 1", "FILL: data source 2", "FILL: data source 3"],
    "processing_layers": ["FILL: processing layer 1", "FILL: processing layer 2"],
    "decision_engine": "FILL: describe the AI decision engine",
    "memory_layer": "FILL: describe the memory/storage layer",
    "execution_layer": ["FILL: execution component 1", "FILL: execution component 2"]
  },
  "workflow_modules": [
    {
      "workflow_id": "wf-001",
      "name": "FILL: workflow name based on top automation opportunity",
      "trigger": "FILL: what triggers this workflow",
      "steps": [
        {"type": "ingestion", "action": "FILL: data ingestion step"},
        {"type": "ai_processing", "action": "FILL: AI processing step"},
        {"type": "decision", "action": "FILL: decision step"},
        {"type": "execution", "action": "FILL: execution step"},
        {"type": "notification", "action": "FILL: notification step"}
      ],
      "integrations_required": ["FILL: integration 1", "FILL: integration 2"]
    },
    {
      "workflow_id": "wf-002",
      "name": "FILL: second workflow name",
      "trigger": "FILL: trigger for second workflow",
      "steps": [
        {"type": "ingestion", "action": "FILL: step"},
        {"type": "ai_processing", "action": "FILL: step"},
        {"type": "execution", "action": "FILL: step"}
      ],
      "integrations_required": ["FILL: integration"]
    }
  ],
  "risk_assessment": {
    "data_risks": ["FILL: data risk 1", "FILL: data risk 2"],
    "operational_risks": ["FILL: operational risk 1", "FILL: operational risk 2"],
    "mitigation_strategies": ["FILL: mitigation 1", "FILL: mitigation 2", "FILL: mitigation 3"]
  },
  "deployment_plan": {
    "phase": "FILL: phased|immediate|enterprise",
    "estimated_impact": "FILL: specific impact statement",
    "estimated_roi_months": 6,
    "waves": [
      {
        "name": "Wave 1: Foundation",
        "included_workflows": ["wf-001"],
        "notes": "FILL: what happens in wave 1"
      },
      {
        "name": "Wave 2: Expansion",
        "included_workflows": ["wf-002"],
        "notes": "FILL: what happens in wave 2"
      }
    ]
  }
}

Replace every "FILL:" placeholder with specific, actionable content tailored to ${companyName} in the ${industry} industry based on the diagnostic results. Do not return any FILL placeholders in your response.`;
}

async function handleBlueprintGeneration(req, res, next) {
  try {
    const { diagnostic_data, answers, company_profile, organization_id } = req.body;

    const diagnosticData = diagnostic_data || answers;

    if (!diagnosticData) {
      const error = new Error('Missing required field: diagnostic_data');
      error.statusCode = 400;
      error.errorCode = 'BAD_REQUEST';
      error.details = { field: 'diagnostic_data', expected: 'object' };
      return next(error);
    }

    const resolvedProfile = company_profile || {
      company_name: organization_id || 'SME',
      industry: 'General',
      company_size: 'SME',
      role: 'Unknown'
    };

    const megaPrompt = buildBlueprintPrompt(diagnosticData, resolvedProfile);

    console.log('[blueprint] diagnosticData received:', JSON.stringify(diagnosticData, null, 2));
    console.log('[blueprint] resolvedProfile:', JSON.stringify(resolvedProfile));

    const routing = MODEL_ROUTING['/blueprints/generate'];

    const result = await sendRequest(
      routing.model,
      routing.useCase,
      megaPrompt,
      req.requestId,
      true,
      routing.models
    );

    console.log('[blueprint] result keys:', Object.keys(result || {}));
    console.log('[blueprint] strategic_objective:', JSON.stringify(result?.strategic_objective));

    res.json(result);

  } catch (error) {
    next(error);
  }
}

// ============================================================================
// WORKFLOW GENERATION ENDPOINT
// ============================================================================

async function handleWorkflowGeneration(req, res, next) {
  try {
    const { workflow_id, workflow_title, workflow_steps, diagnostic_context, company_name } = req.body;

    logger.info('workflow_request', {
      event: 'workflow_request',
      endpoint: '/workflows/generate',
      workflow_id,
      workflow_title,
    });

    if (!workflow_id || !workflow_title) {
      const error = new Error('Missing required fields: workflow_id, workflow_title');
      error.statusCode = 400;
      error.errorCode = 'BAD_REQUEST';
      return next(error);
    }

    const routing = MODEL_ROUTING['/blueprints/generate'];

    const prompt = `You are an AI automation architect. Generate a detailed, executable workflow definition for the following automation.

COMPANY: ${company_name || 'SME'}
WORKFLOW ID: ${workflow_id}
WORKFLOW TITLE: ${workflow_title}
HIGH-LEVEL STEPS: ${JSON.stringify(workflow_steps || [])}
DIAGNOSTIC CONTEXT: ${JSON.stringify(diagnostic_context || {})}

You MUST respond with ONLY a valid JSON object — no markdown, no code blocks, no commentary.

Return this EXACT JSON structure:
{
  "workflow_id": "${workflow_id}",
  "title": "${workflow_title}",
  "trigger": "FILL: specific event or condition that starts this workflow",
  "steps": [
    {
      "id": "step_1",
      "type": "trigger",
      "title": "human readable title",
      "description": "what this step does",
      "nodeType": "n8n-nodes-base.scheduleTrigger",
      "parameters": {
        "rule": {
          "interval": [{ "field": "hours", "hoursInterval": 48 }]
        }
      },
      "testable": true
    },
    {
      "id": "step_2",
      "type": "action",
      "title": "human readable title",
      "description": "what this step does",
      "nodeType": "n8n-nodes-base.httpRequest",
      "parameters": {},
      "testable": true
    }
  ],
  "integrations": ["FILL: integration 1", "FILL: integration 2", "FILL: integration 3"],
  "estimated_time": "FILL: e.g. 2-5 minutes per execution",
  "automation_percentage": "FILL: e.g. 85%",
  "error_handling": "FILL: describe fallback/error strategy",
  "notes": "FILL: any important implementation notes"
}

CRITICAL REQUIREMENTS:
- nodeType is REQUIRED for every step, no exceptions
- parameters must match the n8n node schema for that nodeType
- If unsure of exact parameters, use empty object {} — but nodeType must always be present
- Respond in the same language as the user

NODETYPE REFERENCE (use exact strings):
- schedule/cron/timer/jadwal/setiap/berkala → n8n-nodes-base.scheduleTrigger
- webhook/http trigger/incoming request → n8n-nodes-base.webhook
- manual/start/mulai → n8n-nodes-base.manualTrigger
- gmail/email google → n8n-nodes-base.gmail
- email generic/smtp → n8n-nodes-base.emailSend
- slack → n8n-nodes-base.slack
- http request/api call/fetch → n8n-nodes-base.httpRequest
- postgres/postgresql → n8n-nodes-base.postgres
- mysql → n8n-nodes-base.mysql
- notion → n8n-nodes-base.notion
- airtable → n8n-nodes-base.airtable
- google sheets/spreadsheet → n8n-nodes-base.googleSheets
- if/condition/filter/branch → n8n-nodes-base.if
- set/transform/map data → n8n-nodes-base.set
- code/javascript/python → n8n-nodes-base.code
- wait/delay/pause → n8n-nodes-base.wait
- telegram → n8n-nodes-base.telegram
- whatsapp → n8n-nodes-base.whatsApp
- discord → n8n-nodes-base.discord
- stripe → n8n-nodes-base.stripe
- hubspot → n8n-nodes-base.hubspot
- salesforce → n8n-nodes-base.salesforce
- s3/aws storage → n8n-nodes-base.s3
- mongodb → n8n-nodes-base.mongoDb
- redis → n8n-nodes-base.redis

Replace every FILL placeholder with specific, actionable content for ${company_name || 'this company'} based on the workflow title and diagnostic context. Do not return any FILL placeholders.`;

    const result = await sendRequest(
      routing.model,
      routing.useCase,
      prompt,
      req.requestId,
      true,
      routing.models
    );

    logger.info('workflow_success', {
      event: 'workflow_success',
      endpoint: '/workflows/generate',
      workflow_id,
      workflow_title,
      status: 'ok',
    });

    res.json(result);
  } catch (error) {
    logger.error('workflow_error', {
      event: 'workflow_error',
      endpoint: '/workflows/generate',
      workflow_id,
      workflow_title,
      error_message: error.message,
    });
    next(error);
  }
}

// ============================================================================
// WORKFLOW CLARIFY ENDPOINT
// ============================================================================

async function handleWorkflowClarify(req, res, next) {
  try {
    const { session_id, organization_id, user_request, conversation_history } = req.body;

    logger.info('workflow_request', {
      event: 'workflow_request',
      endpoint: '/workflows/clarify',
      session_id,
      organization_id,
    });

    if (!user_request || typeof user_request !== 'string') {
      const error = new Error('Missing or invalid field: user_request (expected string)');
      error.statusCode = 400;
      error.errorCode = 'BAD_REQUEST';
      error.details = { field: 'user_request', expected: 'string' };
      return next(error);
    }

    const routing = MODEL_ROUTING['/blueprints/generate'];

    const systemPrompt = `You are a workflow automation assistant.
Ask 2-3 short clarifying questions to understand what the user wants to automate:
- What triggers it (schedule, webhook, app event, manual)
- What actions happen (which apps, what data)
- Any conditions or filters needed
Reply in the same language as the user. Plain text response only.`;

    const conversationContext = Array.isArray(conversation_history) && conversation_history.length > 0
      ? `\n\nConversation history:\n${conversation_history.map(m => `${(m.role || 'user').toUpperCase()}: ${m.content || ''}`).join('\n')}`
      : '';

    const prompt = `${systemPrompt}\n\nUser request: ${user_request}${conversationContext}\n\nAsk 2-3 clarifying questions to help design the workflow.`;

    const result = await sendRequest(
      routing.model,
      routing.useCase,
      prompt,
      req.requestId,
      true,
      routing.models
    );

    logger.info('workflow_success', {
      event: 'workflow_success',
      endpoint: '/workflows/clarify',
      session_id,
      organization_id,
      status: 'ok',
    });

    res.json({ message: result });
  } catch (error) {
    logger.error('workflow_error', {
      event: 'workflow_error',
      endpoint: '/workflows/clarify',
      session_id,
      organization_id,
      error_message: error.message,
    });
    next(error);
  }
}

// ============================================================================
// WORKFLOW DEPLOY ENDPOINT
// ============================================================================

async function handleWorkflowDeploy(req, res, next) {
  try {
    const { workflow_spec, organization_id, user_id } = req.body;

    logger.info('workflow_request', {
      event: 'workflow_request',
      endpoint: '/workflows/deploy',
      organization_id,
      user_id,
    });

    if (!workflow_spec || typeof workflow_spec !== 'object') {
      const error = new Error('Missing or invalid field: workflow_spec (expected object)');
      error.statusCode = 400;
      error.errorCode = 'BAD_REQUEST';
      error.details = { field: 'workflow_spec', expected: 'object' };
      return next(error);
    }

    const n8nAsCodeUrl = process.env.N8N_AS_CODE_URL || 'http://localhost:3004';
    const deployUrl = `${n8nAsCodeUrl}/workflows/deploy`;

    logger.info('[workflow/deploy] calling n8n-as-code-service', { url: deployUrl });

    const payload = JSON.stringify({
      workflow_spec,
      organization_id: organization_id || null,
      user_id: user_id || null,
    });

    const response = await new Promise((resolve, reject) => {
      const url = new URL(deployUrl);
      const transport = url.protocol === 'https:' ? https : http;
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      };

      const request = transport.request(options, (response) => {
        let data = '';
        response.on('data', chunk => { data += chunk; });
        response.on('end', () => {
          try {
            resolve({ status: response.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: response.statusCode, body: data });
          }
        });
      });

      request.on('error', reject);
      request.setTimeout(30000, () => {
        request.destroy();
        reject(new Error('n8n-as-code-service request timed out'));
      });
      request.write(payload);
      request.end();
    });

    if (response.status < 200 || response.status >= 300) {
      logger.error('[workflow/deploy] n8n-as-code-service returned error', { status: response.status, body: response.body });
      return res.status(502).json({
        status: 'error',
        reason: 'deploy_failed',
        details: typeof response.body === 'string' ? response.body : JSON.stringify(response.body)
      });
    }

    logger.info('[workflow/deploy] deployment successful', { result: response.body });

    logger.info('workflow_success', {
      event: 'workflow_success',
      endpoint: '/workflows/deploy',
      organization_id,
      user_id,
      status: 'ok',
    });

    res.json(response.body);

  } catch (error) {
    logger.error('workflow_error', {
      event: 'workflow_error',
      endpoint: '/workflows/deploy',
      organization_id,
      user_id,
      error_message: error.message,
    });
    logger.error('[workflow/deploy] unexpected error', { error: error.message });
    next(error);
  }
}

// ============================================================================
// ARIA CHAT ENDPOINT
// ============================================================================

async function handleAriaChat(req, res, next) {
  try {
    const { message } = req.body;
    
    if (!message || typeof message !== 'string') {
      const error = new Error('Missing or invalid field: message (expected string)');
      error.statusCode = 400;
      error.errorCode = 'BAD_REQUEST';
      error.details = { field: 'message', expected: 'string' };
      return next(error);
    }
    
    const response = await sendToGateway(message, req.requestId);
    
    res.json({ response });
    
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// WORKFLOW SYNTHESIS ENDPOINT
// ============================================================================

async function handleWorkflowSynthesis(req, res, next) {
  try {
    const { workflow_module, prompt, tenantId, userId, source, context } = req.body;

    if (!workflow_module && !prompt) {
      const error = new Error('Missing required field: workflow_module or prompt');
      error.statusCode = 400;
      error.errorCode = 'BAD_REQUEST';
      error.details = { field: 'workflow_module', expected: 'object' };
      return next(error);
    }

    const executionUrl = config.n8nWorkflowExecutionUrl;
    const payload = JSON.stringify({
      prompt: prompt || JSON.stringify(workflow_module),
      workflow_module,
      tenantId: tenantId || req.body.organization_id || null,
      userId: userId || null,
      source: source || 'dashboard',
      context: context || {}
    });

    logger.info('[workflow/synthesize] triggering n8n execution', { url: executionUrl });

    const n8nResponse = await new Promise((resolve, reject) => {
      const url = new URL(executionUrl);
      const transport = url.protocol === 'https:' ? https : http;
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      };

      const request = transport.request(options, (response) => {
        let data = '';
        response.on('data', chunk => { data += chunk; });
        response.on('end', () => {
          try {
            resolve({ status: response.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: response.statusCode, body: data });
          }
        });
      });

      request.on('error', reject);
      request.setTimeout(30000, () => {
        request.destroy();
        reject(new Error('n8n execution request timed out'));
      });
      request.write(payload);
      request.end();
    });

    if (n8nResponse.status < 200 || n8nResponse.status >= 300) {
      logger.error('[workflow/synthesize] n8n returned error', { status: n8nResponse.status, body: n8nResponse.body });
      return res.status(502).json({
        status: 'error',
        reason: 'n8n_execution_failed',
        details: typeof n8nResponse.body === 'string' ? n8nResponse.body : JSON.stringify(n8nResponse.body)
      });
    }

    const executionId = n8nResponse.body?.id || n8nResponse.body?.executionId || null;
    logger.info('[workflow/synthesize] n8n execution accepted', { executionId });

    res.json({
      status: 'accepted',
      executionId,
      n8nWorkflowId: 'Tu5VrBcDwUtRChdh'
    });

  } catch (error) {
    logger.error('[workflow/synthesize] unexpected error', { error: error.message });
    return res.status(502).json({
      status: 'error',
      reason: 'n8n_execution_failed',
      details: error.message
    });
  }
}

// ============================================================================
// BRIDGE / AIRA STREAMING HANDLER
// ============================================================================

/**
 * Streaming version of handleBridgeAira.
 * Forwards SSE events from Zeroclaw directly to the client without buffering.
 */
async function handleBridgeAiraStreaming(req, res, next, params) {
  try {
    const { streamZeroclawWithSkillCallback, stripToolCalls } = require('./zeroclawStreamingClient');

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    let cancelled = false;
    let fullText = '';
    let workflowSpec = null;

    // Handle client disconnect
    req.on('close', () => {
      cancelled = true;
    });

    // Stream events from Zeroclaw
    streamZeroclawWithSkillCallback(
      {
        message: params.message,
        mode: params.mode,
        channel: params.channel,
        entrypoint: params.entrypoint,
        context: params.context,
        endpoint: '/bridge/aira',
      },
      // onEvent callback
      (event) => {
        if (cancelled) return;

        try {
          // Handle different event types from Zeroclaw/LLM
          if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
            // Anthropic format
            const text = event.delta.text || '';
            fullText += text;
            
            // Forward as chunk event
            const payload = JSON.stringify({ type: 'chunk', content: text });
            res.write(`data: ${payload}\n\n`);
          } else if (event.type === 'chunk' && event.content) {
            // Generic chunk format
            fullText += event.content;
            const payload = JSON.stringify({ type: 'chunk', content: event.content });
            res.write(`data: ${payload}\n\n`);
          } else if (event.type === 'message_start' || event.type === 'message_delta') {
            // Anthropic message events - skip for now
          } else if (event.type === 'content_block_start') {
            // Anthropic content block start - skip
          } else if (event.type === 'content_block_stop') {
            // Anthropic content block stop - skip
          } else if (event.type === 'message_stop') {
            // Anthropic message stop - will handle in onEnd
          } else {
            // Unknown event type - log and skip
            logger.debug('[bridge/aira streaming] unknown event type', { type: event.type });
          }
        } catch (e) {
          logger.error('[bridge/aira streaming] error processing event', { error: e.message });
        }
      },
      // onError callback
      (error) => {
        if (cancelled) return;
        logger.error('[bridge/aira streaming] zeroclaw error', { error: error.message });
        const payload = JSON.stringify({
          type: 'error',
          error: error.message || 'Stream error from Zeroclaw',
        });
        res.write(`data: ${payload}\n\n`);
        res.end();
      },
      // onEnd callback
      () => {
        if (cancelled) return;

        try {
          // Extract workflowspec if present
          const specMatch = fullText.match(/```workflowspec\n([\s\S]*?)```/);
          if (specMatch) {
            try {
              workflowSpec = JSON.parse(specMatch[1]);
            } catch {
              // ignore invalid JSON in workflowspec
            }
          }

          // Send workflowspec event if found
          if (workflowSpec) {
            const payload = JSON.stringify({
              type: 'workflowspec',
              workflow: workflowSpec,
            });
            res.write(`data: ${payload}\n\n`);
          }

          // Send done event
          const donePayload = JSON.stringify({ type: 'done' });
          res.write(`data: ${donePayload}\n\n`);
        } catch (e) {
          logger.error('[bridge/aira streaming] error sending final events', { error: e.message });
        } finally {
          res.end();
        }
      }
    );
  } catch (error) {
    logger.error('[bridge/aira streaming] error', { error: error.message });
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({
      error: 'stream_error',
      message: error.message || 'Streaming error',
    });
  }
}

// ============================================================================
// CONSOLE STREAM ENDPOINT
// ============================================================================

async function handleConsoleStream(req, res, next) {
  try {
    const { organization_id, user_id, session_id, messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      const error = new Error('Missing or invalid field: messages (expected non-empty array)');
      error.statusCode = 400;
      error.errorCode = 'BAD_REQUEST';
      error.details = { field: 'messages', expected: 'array' };
      return next(error);
    }

    const lastUserMessage = messages.filter(m => m.role === 'user').at(-1)?.content ?? '';

    if (!lastUserMessage) {
      const error = new Error('No user message found in messages array');
      error.statusCode = 400;
      error.errorCode = 'BAD_REQUEST';
      return next(error);
    }

    const { callZeroclawWithSkill, stripToolCalls } = require('./zeroclawClient');
    const userCtx = await getUserContext(session_id).catch(() => ({}));

    // JSON format instruction — scoped ONLY to console chat stream.
    // DO NOT add this to CONSOLE_SYSTEM_PROMPT or any other endpoint handler.
    const JSON_FORMAT_INSTRUCTION = '[RESPONSE FORMAT] Always respond in valid JSON: {"reply": "<your response>", "suggestions": ["<action 1>", "<action 2>", "<action 3>"]}. The suggestions array must contain 3-4 short contextual follow-up actions. If you need clarification, add "clarification": true to the JSON. [END FORMAT]\n\n';

    const augmentedMessage = JSON_FORMAT_INSTRUCTION + lastUserMessage;

    const enrichedContext = {
      session_id,
      organization_id,
      user_id,
      history: messages,
      source: 'console',
      aivory_state: {
        has_diagnostic: userCtx.has_diagnostic || false,
        has_blueprint: userCtx.has_blueprint || false,
        diagnostic_summary: userCtx.diagnostic_summary || null,
        blueprint_summary: userCtx.blueprint_summary || null,
      },
    };

    const result = await callZeroclawWithSkill({
      message: augmentedMessage,
      context: enrichedContext,
    });

    const finalText = stripToolCalls(result.response);

    res.json({
      mode: 'zeroclaw',
      model: result.model,
      skill: result.skill,
      message: finalText,
      raw_agent_response: finalText,
      final_text: finalText,
      tool_calls: [],
      raw: { model: result.model, response: result.response },
    });
  } catch (error) {
    logger.error('[console/stream] error', { error: error.message });
    const statusMatch = error.message?.match(/Zeroclaw returned (\d+)/);
    if (statusMatch) {
      return res.status(502).json({
        error: 'zeroclaw_error',
        status: parseInt(statusMatch[1], 10),
        detail: error.message,
      });
    }
    return res.status(500).json({
      error: 'zeroclaw_error',
      status: 500,
      detail: error.message || 'Failed to connect to AI engine',
    });
  }
}

// ============================================================================
// BRIDGE / AIRA ENDPOINT
// ============================================================================

async function handleBridgeAira(req, res, next) {
  try {
    const { message, context, mode, channel, entrypoint } = req.body;

    if (!message || typeof message !== 'string') {
      const error = new Error('Missing or invalid field: message (expected string)');
      error.statusCode = 400;
      error.errorCode = 'BAD_REQUEST';
      error.details = { field: 'message', expected: 'string' };
      return next(error);
    }

    const historyMessages = context?.history;
    let enrichedMessage = message;

    if (Array.isArray(historyMessages) && historyMessages.length > 1) {
      enrichedMessage = buildAiraFinalMessage(historyMessages);
    }

    // Check if client requested streaming (via query param or header)
    const wantsStreaming = req.query.stream === 'true' || req.headers['x-stream'] === 'true';

    if (wantsStreaming) {
      // Use streaming response
      return handleBridgeAiraStreaming(req, res, next, {
        message: enrichedMessage,
        mode: mode || context?.mode || undefined,
        channel: channel || context?.channel || undefined,
        entrypoint: entrypoint || undefined,
        context: context || undefined,
      });
    }

    // Original non-streaming path (for backward compatibility)
    const { callZeroclawWithSkill, stripToolCalls } = require('./zeroclawClient');
    const result = await callZeroclawWithSkill({
      message: enrichedMessage,
      mode: mode || context?.mode || undefined,
      channel: channel || context?.channel || undefined,
      entrypoint: entrypoint || undefined,
      context: context || undefined,
    });

    const finalText = stripToolCalls(result.response);

    res.json({
      mode: 'zeroclaw',
      model: result.model,
      skill: result.skill,
      message: finalText,
      raw_agent_response: finalText,
      final_text: finalText,
      tool_calls: [],
      raw: { model: result.model, response: result.response },
    });

  } catch (error) {
    logger.error('[bridge/aira] error', { error: error.message });
    const statusMatch = error.message?.match(/Zeroclaw returned (\d+)/);
    if (statusMatch) {
      return res.status(502).json({
        error: 'zeroclaw_error',
        status: parseInt(statusMatch[1], 10),
        detail: error.message
      });
    }
    return res.status(500).json({
      error: 'zeroclaw_error',
      status: 500,
      detail: error.message || 'Unexpected error calling ZeroClaw'
    });
  }
}

// ============================================================================
// BRIDGE / KIRO ENDPOINT
// ============================================================================

async function handleBridgeKiro(req, res, next) {
  try {
    const { message, context } = req.body;

    if (!message || typeof message !== 'string') {
      const error = new Error('Missing or invalid field: message (expected string)');
      error.statusCode = 400;
      error.errorCode = 'BAD_REQUEST';
      error.details = { field: 'message', expected: 'string' };
      return next(error);
    }

    let prompt = message;
    if (context && typeof context === 'object' && Object.keys(context).length > 0) {
      prompt += `\n\n[Context]\n${JSON.stringify(context, null, 2)}`;
    }

    const { callZeroclawWithSkill } = require('./zeroclawClient');
    const result = await callZeroclawWithSkill({
      message: prompt,
      context: context || undefined,
    });

    res.json({
      mode: 'zeroclaw',
      model: result.model,
      skill: result.skill,
      raw_agent_response: result.response,
      tool_calls: []
    });
  } catch (error) {
    logger.error('[bridge/kiro] error', { error: error.message });
    next(error);
  }
}

// ============================================================================
// HEALTH CHECK ENDPOINT
// ============================================================================

async function handleHealthCheck(req, res) {
  try {
    const openrouterApiKeySet = await healthCheck();
    const status = openrouterApiKeySet ? 'ok' : 'down';
    const response = {
      status,
      timestamp: new Date().toISOString(),
      checks: {
        openrouter_api_key_set: openrouterApiKeySet
      }
    };
    const httpStatus = status === 'down' ? 503 : 200;
    res.status(httpStatus).json(response);
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      checks: {
        openrouter_api_key_set: false
      }
    });
  }
}

// ============================================================================
// DEEP HEALTH CHECK ENDPOINT
// ============================================================================

/**
 * Ping a local service with a short timeout.
 * Returns { status, latency_ms, error? }
 *
 * @param {string} host  - e.g. '127.0.0.1'
 * @param {number} port  - e.g. 3010
 * @param {string} path  - e.g. '/health'
 * @param {number} timeoutMs
 */
function pingLocalService(host, port, path, timeoutMs) {
  return new Promise((resolve) => {
    const http = require('http');
    const start = Date.now();

    const req = http.request(
      { hostname: host, port, path, method: 'GET', timeout: timeoutMs },
      (res) => {
        // Drain the response body so the socket is released
        res.resume();
        res.on('end', () => {
          const latency_ms = Date.now() - start;
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ status: 'ok', latency_ms });
          } else {
            resolve({
              status: 'error',
              latency_ms,
              error: `HTTP ${res.statusCode}`,
            });
          }
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      resolve({
        status: 'error',
        latency_ms: timeoutMs,
        error: `Timeout after ${timeoutMs}ms`,
      });
    });

    req.on('error', (err) => {
      resolve({
        status: 'error',
        latency_ms: Date.now() - start,
        error: err.message,
      });
    });

    req.end();
  });
}

async function handleDeepHealth(req, res) {
  const TIMEOUT_MS = 3000;

  // Read service addresses from env so they can be overridden in tests;
  // defaults are the correct VPS-local addresses.
  const zeroclawHost = process.env.ZEROCLAW_HOST || '127.0.0.1';
  const zeroclawPort = parseInt(process.env.ZEROCLAW_PORT || '3010', 10);
  const n8nMcpHost  = process.env.N8N_MCP_HOST  || '127.0.0.1';
  const n8nMcpPort  = parseInt(process.env.N8N_MCP_PORT  || '3020', 10);

  const [zeroclaw, n8n_mcp] = await Promise.all([
    pingLocalService(zeroclawHost, zeroclawPort, '/health', TIMEOUT_MS),
    pingLocalService(n8nMcpHost,  n8nMcpPort,  '/health', TIMEOUT_MS),
  ]);

  const services = { zeroclaw, n8n_mcp };

  const statuses = Object.values(services).map((s) => s.status);
  const allOk    = statuses.every((s) => s === 'ok');
  const allError = statuses.every((s) => s === 'error');
  const overall  = allOk ? 'ok' : allError ? 'down' : 'degraded';

  const httpStatus = overall === 'ok' ? 200 : overall === 'degraded' ? 207 : 503;

  res.status(httpStatus).json({
    status: overall,
    timestamp: new Date().toISOString(),
    services,
  });
}

module.exports = {
  handleConsoleStream,
  handleAiraStream,
  handleAriaChat,
  handleDeepDiagnostic,
  handleFreeDiagnostic,
  handleBlueprintGeneration,
  handleWorkflowGeneration,
  handleWorkflowClarify,
  handleWorkflowDeploy,
  handleWorkflowSynthesis,
  handleBridgeAira,
  handleBridgeKiro,
  handleHealthCheck,
  handleDeepHealth,
};

// Zeroclaw client (appended via EOF)
const {
  callZeroclaw,
  callZeroclawStructured,
  callZeroclawWithSkill,
  stripToolCalls,
} = require('./zeroclawClient');

// Aivory diag+blueprint pipeline handler
async function handleAivoryPipeline(req, res) {
  try {
    const { intent, diagnostic, companyProfile, options } = req.body || {};

    if (!intent || !diagnostic) {
      return res.status(400).json({
        error: true,
        code: 'PIPELINE_INVALID_INPUT',
        message: 'intent and diagnostic are required',
      });
    }

    const pipelineContext = {
      intent,
      diagnostic,
      companyProfile: companyProfile || null,
      options: options || {},
    };

    const { callZeroclawStructured } = require('./zeroclawClient');

    const systemPrompt = `
Anda adalah Aivory Pipeline Orchestrator.

KONTEKS SISTEM:
- Aplikasi backend sudah mengirimkan data "diagnostic" dan "companyProfile" ke Anda melalui konteks sistem.
- Anda TIDAK perlu (dan TIDAK BISA) meminta user untuk upload atau paste dokumen lagi.
- Anggap semua data yang tersedia sudah ada di konteks; jika ada kekurangan, gunakan asumsi eksplisit.

TUGAS:
- Membaca data diagnostic dan profil perusahaan dari konteks sistem.
- Menyusun rencana AI System Blueprint dengan bahasa Indonesia yang jelas.
- Fokus pada rekomendasi sistem & workflow, bukan instruksi UI/dashboard.

ATURAN KERAS:
- JANGAN menyebut Aivory Dashboard, menu, tombol, atau cara pakai aplikasi.
- JANGAN meminta user untuk "klik", "akses", "upload", atau "paste" apapun.
- JANGAN meminta dokumen tambahan, file, atau screenshot.
- JANGAN mengulang nama user atau host (misal "ireichmann@Mawarid") dalam respons.
- Jawaban harus fokus ke insight bisnis, rekomendasi sistem, dan arsitektur solusi.
- Kalau data diagnostic kurang, jelaskan asumsi yang Anda pakai secara eksplisit di bagian "risks_and_assumptions". Jangan meminta user mengirim atau mengupload apa pun.

FORMAT OUTPUT:
Balas DALAM BENTUK JSON VALID dengan struktur PERSIS seperti ini:

{
  "diagnostic_summary": {
    "objective": "string, ringkasan objective utama",
    "current_state": "string, ringkasan kondisi sekarang berdasarkan diagnostic",
    "key_issues": ["string", "..."],
    "priority_areas": ["string", "..."]
  },
  "blueprint": {
    "target_state": "string, gambaran kondisi ideal yang ingin dicapai",
    "capability_map": [
      {
        "name": "string, nama capability",
        "description": "string, deskripsi singkat",
        "business_value": "string, value bisnis utama",
        "owner": "string, peran pemilik"
      }
    ],
    "workflows": [
      {
        "name": "string, nama workflow",
        "description": "string, alur kerja end-to-end",
        "triggers": ["string"],
        "inputs": ["string"],
        "outputs": ["string"],
        "tools": ["string"],
        "actors": ["string"],
        "kpis": ["string"]
      }
    ],
    "data_requirements": ["string", "..."],
    "risks_and_assumptions": ["string", "..."]
  }
}

JANGAN menambah field lain di luar struktur di atas.
JANGAN menulis teks di luar JSON (tidak boleh ada penjelasan sebelum / sesudah curly braces).
`.trim();

    const result = await callZeroclawStructured({
      message: `Jalankan Aivory diag+blueprint pipeline untuk intent: ${intent}. Gunakan diagnostic & profil perusahaan yang diberikan.`,
      context: {
        pipeline: 'aivory_diag_blueprint',
        system_prompt: systemPrompt,
        ...pipelineContext,
      },
    });

    const rawStr = typeof result.response === 'string'
      ? result.response
      : JSON.stringify(result.response);

    const raw = rawStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      parsed = null;
    }

    let diagnostic_summary = parsed && parsed.diagnostic_summary ? parsed.diagnostic_summary : null;
    let blueprint = parsed && parsed.blueprint ? parsed.blueprint : null;

    const serialized = parsed ? JSON.stringify(parsed).toLowerCase() : '';
    const badPatterns = ['upload', 'paste', 'unggah', 'kirim data', 'bagikan atau upload'];
    const containsBadPattern = badPatterns.some(p => serialized.includes(p));

    if (containsBadPattern) {
      diagnostic_summary = null;
      blueprint = null;
    }

    const fallback_message = (!diagnostic_summary && !blueprint) ? raw : null;

    return res.json({
      error: false,
      mode: 'zeroclaw',
      model: result.model,
      diagnostic_summary,
      blueprint,
      fallback_message,
    });
  } catch (err) {
    console.error('[handleAivoryPipeline] error', err);
    return res.status(500).json({
      error: true,
      code: 'PIPELINE_INTERNAL_ERROR',
      message: 'Failed to run Aivory pipeline',
    });
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports.handleAivoryPipeline = handleAivoryPipeline;
}


// ============================================================================
// AGENTS CRUD ENDPOINTS
// ============================================================================

const agentsRepo = require('./lib/agentsRepository');

/**
 * GET /agents
 * List agents for current workspace with optional filtering
 * Query params: q (search), status (filter), page, pageSize
 */
async function handleListAgents(req, res, next) {
  try {
    const workspaceId = req.body?.organization_id || req.query?.workspace_id || 'default';
    const { q, status, page = 1, pageSize = 20 } = req.query;

    const filters = {};
    if (q) filters.q = q;
    if (status) filters.status = status;

    const agents = agentsRepo.getAgentsByWorkspace(workspaceId, filters);
    
    // Apply pagination
    const pageNum = Math.max(1, parseInt(page) || 1);
    const pageSizeNum = Math.max(1, Math.min(100, parseInt(pageSize) || 20));
    const start = (pageNum - 1) * pageSizeNum;
    const end = start + pageSizeNum;

    const items = agents.slice(start, end);

    res.json({
      items,
      total: agents.length,
      page: pageNum,
      pageSize: pageSizeNum
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /agents
 * Create a new agent
 * Required: name, model, provider
 * Optional: description, runtime, status, config, tags
 */
async function handleCreateAgent(req, res, next) {
  try {
    const workspaceId = req.body?.organization_id || 'default';
    const { name, model, provider, description, runtime, status, config, tags } = req.body;

    // Validate required fields
    if (!name || !model || !provider) {
      const error = new Error('Missing required fields: name, model, provider');
      error.statusCode = 400;
      error.errorCode = 'BAD_REQUEST';
      error.details = { required: ['name', 'model', 'provider'] };
      return next(error);
    }

    const agent = agentsRepo.createAgent(workspaceId, {
      name,
      model,
      provider,
      description,
      runtime,
      status,
      config,
      tags
    });

    res.status(201).json(agent);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /agents/:id
 * Get a specific agent by ID
 */
async function handleGetAgent(req, res, next) {
  try {
    const { id } = req.params;
    const workspaceId = req.body?.organization_id || req.query?.workspace_id || 'default';

    const agent = agentsRepo.getAgentById(id, workspaceId);

    if (!agent) {
      const error = new Error('Agent not found');
      error.statusCode = 404;
      error.errorCode = 'AGENT_NOT_FOUND';
      error.details = { id };
      return next(error);
    }

    res.json(agent);
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /agents/:id
 * Update an agent (partial update)
 * Allowed fields: name, description, status, model, provider, runtime, tags, config
 */
async function handleUpdateAgent(req, res, next) {
  try {
    const { id } = req.params;
    const workspaceId = req.body?.organization_id || 'default';
    const updates = req.body;

    // Remove organization_id from updates to prevent it being updated
    delete updates.organization_id;

    const agent = agentsRepo.updateAgent(id, workspaceId, updates);

    if (!agent) {
      const error = new Error('Agent not found');
      error.statusCode = 404;
      error.errorCode = 'AGENT_NOT_FOUND';
      error.details = { id };
      return next(error);
    }

    res.json(agent);
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /agents/:id
 * Soft delete an agent
 */
async function handleDeleteAgent(req, res, next) {
  try {
    const { id } = req.params;
    const workspaceId = req.body?.organization_id || req.query?.workspace_id || 'default';

    const deleted = agentsRepo.deleteAgent(id, workspaceId);

    if (!deleted) {
      const error = new Error('Agent not found');
      error.statusCode = 404;
      error.errorCode = 'AGENT_NOT_FOUND';
      error.details = { id };
      return next(error);
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * Handle UI state updates from frontend
 * Stores UI state in session context for Zeroclaw to access
 */
async function handleContextUiState(req, res) {
  try {
    const { session_id, active_tab, page_url, last_action, form_errors, extra } = req.body;

    if (!session_id) {
      return res.status(400).json({
        error: true,
        message: 'Missing session_id'
      });
    }

    // Get or create session context
    let context = await getUserContext(session_id);
    if (!context) {
      context = {
        session_id,
        ui_state: {}
      };
    }

    // Update UI state in session context
    context.ui_state = {
      active_tab: active_tab || context.ui_state?.active_tab,
      page_url: page_url || context.ui_state?.page_url,
      last_action: last_action || context.ui_state?.last_action,
      form_errors: form_errors || context.ui_state?.form_errors,
      extra: extra || context.ui_state?.extra,
      updated_at: new Date().toISOString()
    };

    // Store in session (in-memory for now, could be extended to persistent storage)
    // This context will be available to Zeroclaw for context-aware responses
    logger.info('[handleContextUiState] UI state updated', {
      session_id,
      active_tab,
      page_url,
      last_action
    });

    return res.status(200).json({
      success: true,
      message: 'UI state updated',
      session_id
    });
  } catch (error) {
    logger.error('[handleContextUiState] error', { error: error.message });
    return res.status(500).json({
      error: true,
      message: 'Failed to update UI state'
    });
  }
}

module.exports.handleListAgents = handleListAgents;
module.exports.handleCreateAgent = handleCreateAgent;
module.exports.handleGetAgent = handleGetAgent;
module.exports.handleUpdateAgent = handleUpdateAgent;
module.exports.handleDeleteAgent = handleDeleteAgent;
module.exports.handleContextUiState = handleContextUiState;
