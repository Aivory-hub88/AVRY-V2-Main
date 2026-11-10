'use strict';
/**
 * Node configurator — turns "step X should use node N" into a REAL n8n node:
 * the right resource/operation, the node's current typeVersion, concrete
 * parameters, and the credential types it needs.
 *
 * Pipeline per step (all grounded in n8n's own MCP, not in templates):
 *   1. choose resource/operation from the node's discriminators      (LLM, small)
 *   2. fetch the exact TypeScript parameter definitions from n8n      (MCP get_node_types)
 *   3. fill the parameters from the step + user request               (LLM)
 *   4. validate with n8n's own validator, repair once on errors       (MCP validate_node_config + LLM)
 *
 * Anything that goes wrong returns null, and the caller keeps the previous
 * behaviour (the node type alone) — a configurator failure never breaks a draft.
 *
 * Env: AETHER_NODE_CONFIG=off disables; NODE_CONFIG_MODEL overrides the model;
 *      OPENROUTER_API_KEY is required (same key the copilot handlers use).
 */

const DEFAULT_MODEL = 'deepseek/deepseek-v4-flash-0731';
const PROVIDER_OPTS = { provider: { sort: 'throughput' }, reasoning: { enabled: false } };
const MAX_DEFS_CHARS = 14000;

/** Old n8n nodes the search/skills layer still surfaces, mapped to what n8n expects today. */
const DEPRECATED_NODE_REMAP = {
  'n8n-nodes-base.cron': 'n8n-nodes-base.scheduleTrigger',
  'n8n-nodes-base.interval': 'n8n-nodes-base.scheduleTrigger',
  'n8n-nodes-base.start': 'n8n-nodes-base.manualTrigger',
  'n8n-nodes-base.function': 'n8n-nodes-base.code',
  'n8n-nodes-base.functionItem': 'n8n-nodes-base.code',
};

function remapDeprecatedNode(nodeType) {
  return DEPRECATED_NODE_REMAP[nodeType] || nodeType;
}

/** condition / switch / loop steps are built by the adapter from their branches, not from a configured node. */
function isBranchingStep(step) {
  return ['condition', 'switch', 'loop'].includes(step?.type) || (Array.isArray(step?.branches) && step.branches.length > 0);
}

function skip(id, reason) {
  console.warn(`[nodeConfigurator] ${id} not configured: ${reason}`);
}

function enabled() {
  return String(process.env.AETHER_NODE_CONFIG || 'on').toLowerCase() !== 'off' && !!process.env.OPENROUTER_API_KEY;
}

// ── LLM (JSON in, JSON out) ───────────────────────────────────────────────────

function extractJson(text) {
  if (!text) return null;
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  const raw = (fenced ? fenced[1] : text).trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(raw.slice(start, end + 1)); } catch { return null; }
}

async function llmJson({ system, user, maxTokens = 1800, timeoutMs = 25000 }) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + process.env.OPENROUTER_API_KEY,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://aivory.app',
      'X-Title': 'Aivory',
    },
    body: JSON.stringify({
      model: process.env.NODE_CONFIG_MODEL || DEFAULT_MODEL,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      max_tokens: maxTokens,
      temperature: 0.1,
      ...PROVIDER_OPTS,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`LLM ${res.status}`);
  const j = await res.json();
  return extractJson(j.choices?.[0]?.message?.content || '');
}

// ── Prompts ───────────────────────────────────────────────────────────────────

const PICK_SYSTEM = `You choose which operation of ONE n8n node a workflow step needs.
Reply with ONLY a JSON object. Pick values that appear in the options you are given; never invent one.
If the options are grouped by resource, you MUST return BOTH keys: {"resource": "<resource>", "operation": "<operation of that resource>"}.
If the options are a flat list of operations: {"operation": "..."}.
If the options are a list of modes: {"mode": "..."}.`;

const FILL_SYSTEM = `You configure ONE n8n node so it does exactly what a workflow step describes.
Reply with ONLY a JSON object: {"parameters": { ... }, "needsInput": [ {"path": "...", "label": "..."} ]}.
Rules:
- Use ONLY parameter names and enum values defined in the TypeScript definitions. Include every required (non-optional) field.
- If the user's request or the step gives a concrete value (email address, URL, channel, subject, interval), use it exactly.
- ALWAYS read data from earlier steps with an explicit reference to that step by its exact title: ={{ $('Exact Step Title').item.json.field }}. This is correct whether or not the step is adjacent, so never use a bare $json (except in the very first node). Only reference fields that plausibly exist.
- Never invent secrets, credentials, IDs, addresses, company names or brand names (write "our team" instead of guessing a company). If a REQUIRED value cannot be known (a spreadsheet ID, a channel ID, a folder), set it to a short placeholder like "<SPREADSHEET_ID>" and list it in needsInput with a human-readable label.
- Do NOT invent fields that other nodes output. Use fields the user named, or generic ones that always exist ($now, $('Step').all().length, $('Step').all() to loop over every item, e.g. ={{ $('Step').all().map(i => i.json.amount).join(', ') }}). If you must reference a field or column the user did NOT name, still use your best guess but ALSO add a needsInput item labelled exactly: Confirm the field "<field>" exists in "<step title>".
- Names the user did NOT state (the spreadsheet tab/sheet name, a folder, a label, a project, a table) are required inputs: use a short placeholder like "<SHEET_NAME>" and list it in needsInput; do not invent them. Channel names, addresses and values the user DID state are used exactly.
- Leave optional fields out unless the step clearly implies them.
- Write message bodies, subjects and prompts concisely and professionally, in the same language as the user's request.
- Be SPECIFIC to this workflow's goal. Never write generic filler such as "automated notification" or "this is a message from the workflow": a subject or message must say what happened and include the relevant data from earlier steps via expressions (names, emails, amounts, links the flow produces).
- A Webhook trigger's payload is under .json.body (POST/PUT body) or .json.query (query string): e.g. ={{ $('Webhook Step Title').item.json.body.email }}. Fields of other earlier steps are directly under .json.<field>.
- A Webhook trigger that receives data from another system uses httpMethod "POST" (GET only for simple pings or links).
- A Schedule trigger must express the exact times the user asked for (days, hours, minutes).
- Do not output credentials, authentication objects or the "credentials" key.`;

function describeStep(step, intent, previousSteps) {
  const cfg = step.parameters && Object.keys(step.parameters).length ? step.parameters : step.config || {};
  return [
    `User request / workflow goal: ${intent || '(not given)'}`,
    `Step title: ${step.title || ''}`,
    `Step description: ${step.description || ''}`,
    `Step type: ${step.type || ''}`,
    `Step settings already known (may be empty): ${JSON.stringify(cfg).slice(0, 1200)}`,
    `Earlier steps, in order (node name = exact title; data flows from these): ${previousSteps.length ? previousSteps.join(' -> ') : '(this is the first step)'}`,
  ].join('\n');
}

// ── Discriminators ────────────────────────────────────────────────────────────

function discriminatorOptions(disc) {
  if (!disc) return null;
  const resources = disc.resources && Object.keys(disc.resources).length ? disc.resources : null;
  if (resources) return { kind: 'resource', resources };
  if (disc.operations?.length) return { kind: 'operation', operations: disc.operations };
  if (disc.modes?.length) return { kind: 'mode', modes: disc.modes };
  return null;
}

function validatePick(pick, options) {
  if (!pick || typeof pick !== 'object') return null;
  if (options.kind === 'resource') {
    let resource = pick.resource;
    // Models often return just the operation. If it exists under exactly one
    // resource, that resource is unambiguous.
    if (!resource && pick.operation) {
      const owners = Object.keys(options.resources).filter((r) => options.resources[r].includes(pick.operation));
      if (owners.length === 1) resource = owners[0];
    }
    // The operation is more specific than the resource: a model that returns
    // resource "channel" + operation "post" (post only exists under "message",
    // and the step text said "channel") means message/post.
    if (pick.operation && !(options.resources[resource] || []).includes(pick.operation)) {
      const owners = Object.keys(options.resources).filter((r) => options.resources[r].includes(pick.operation));
      if (owners.length === 1) resource = owners[0];
    }
    const ops = options.resources[resource];
    if (!ops) return null;
    if (ops.length === 0) return { resource };
    return ops.includes(pick.operation) ? { resource, operation: pick.operation } : null;
  }
  if (options.kind === 'operation') return options.operations.includes(pick.operation) ? { operation: pick.operation } : null;
  return options.modes.includes(pick.mode) ? { mode: pick.mode } : null;
}

// ── Expressions ───────────────────────────────────────────────────────────────

/** n8n only evaluates a string as an expression when it starts with "=". */
function normalizeExpressions(value) {
  if (typeof value === 'string') return value.includes('{{') && !value.startsWith('=') ? '=' + value : value;
  if (Array.isArray(value)) return value.map(normalizeExpressions);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, normalizeExpressions(v)]));
  return value;
}

/**
 * What the node configurator sees as "the goal": the workflow name, what the
 * user actually asked for (recent chat turns), and the whole flow outline, so a
 * step such as "email sales" is written for THIS workflow, not generically.
 */
function buildConfigIntent({ description, userContext, steps }) {
  const outline = (steps || [])
    .map((st, i) => `${i + 1}. ${st.title || 'Step'}${st.description ? ` — ${st.description}` : ''}`)
    .join('\n');
  return [
    description ? `Workflow: ${description}` : '',
    userContext ? `What the user asked for:\n${String(userContext).slice(0, 1500)}` : '',
    outline ? `Whole flow:\n${outline}` : '',
  ].filter(Boolean).join('\n\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────

/**
 * @param {object} args { step, node, intent, previousSteps }
 *   node: { nodeType (full id), displayName, version, discriminators } from MCP search
 * @param {object} deps { llm, mcp } injectable for tests
 * @returns {Promise<null | { nodeType, typeVersion, parameters, credentialTypes, needsInput, validation, discriminators, attempts }>}
 */
async function configureStep({ step, node, intent, previousSteps = [] }, deps = {}) {
  const llm = deps.llm || llmJson;
  const mcp = deps.mcp || require('./n8nMcpClient');
  if (!node?.nodeType) return null;
  if (isBranchingStep(step)) return null; // built by the adapter from its branches
  const id = node.nodeType;

  try {
    const stepText = describeStep(step, intent, previousSteps);

    // 1) resource / operation
    let disc = {};
    const options = discriminatorOptions(node.discriminators);
    if (options) {
      const pick = await llm({
        system: PICK_SYSTEM,
        user: `${stepText}\n\nNode: ${id} (${node.displayName || ''})\n${options.kind === 'resource' ? 'Options grouped by resource (resource -> operations)' : options.kind === 'operation' ? 'Operations' : 'Modes'}: ${JSON.stringify(options.resources || options.operations || options.modes)}`,
        maxTokens: 120,
        timeoutMs: 15000,
      });
      const valid = validatePick(pick, options);
      if (!valid) { skip(id, `invalid operation pick ${JSON.stringify(pick)}`); return null; }
      disc = valid;
    }

    // 2) exact definitions
    const defs = await mcp.getNodeDefinitions(id, disc);
    if (defs.error || !defs.definitions) { skip(id, `no definitions (${defs.error || 'empty'})`); return null; }
    const typeVersion = Number(node.version) || defs.version || 1;
    const definitions = defs.definitions.length > MAX_DEFS_CHARS ? defs.definitions.slice(0, MAX_DEFS_CHARS) + '\n/* …truncated */' : defs.definitions;

    // 3) fill parameters
    const baseUser = `${stepText}\n\nNode: ${id} (typeVersion ${typeVersion})${Object.keys(disc).length ? `\nDiscriminators: ${JSON.stringify(disc)}` : ''}\n\nTypeScript definitions:\n${definitions}`;
    let out = await llm({ system: FILL_SYSTEM, user: baseUser, maxTokens: 1800 });
    if (!out || typeof out.parameters !== 'object' || out.parameters === null) { skip(id, 'LLM returned no parameters'); return null; }

    const finalize = (o) => normalizeExpressions({ ...(o.parameters || {}), ...disc });
    let parameters = finalize(out);
    let needsInput = Array.isArray(out.needsInput) ? out.needsInput : [];

    // 4) validate, repair once
    let validation = await mcp.validateNodeConfig(id, parameters, null, typeVersion);
    let attempts = 1;
    if (validation && validation.valid === false && validation.errors?.length) {
      const errText = validation.errors.map((e) => `${e.path || '(root)'}: ${e.message}`).join('\n').slice(0, 1500);
      const fixed = await llm({
        system: FILL_SYSTEM,
        user: `${baseUser}\n\nYour previous parameters:\n${JSON.stringify(parameters).slice(0, 3000)}\n\nn8n validation errors to fix:\n${errText}\n\nReturn the corrected JSON object.`,
        maxTokens: 1800,
      });
      attempts = 2;
      if (fixed && typeof fixed.parameters === 'object' && fixed.parameters !== null) {
        const reParams = finalize(fixed);
        const reValidation = await mcp.validateNodeConfig(id, reParams, null, typeVersion);
        // keep whichever is better: valid wins; otherwise the one with fewer errors
        if (reValidation.valid || (reValidation.errors?.length ?? 99) <= (validation.errors?.length ?? 99)) {
          parameters = reParams;
          validation = reValidation;
          needsInput = Array.isArray(fixed.needsInput) ? fixed.needsInput : needsInput;
        }
      }
    }

    // Model-authored code is never trusted blindly: always ask the user to review it.
    if (id === 'n8n-nodes-base.code') {
      needsInput = [...needsInput, { path: 'jsCode', label: `Review the generated code in "${step.title || 'Code'}"` }];
    }

    return {
      nodeType: id,
      displayName: node.displayName || null,
      typeVersion,
      parameters,
      credentialTypes: defs.credentials || [],
      needsInput: needsInput
        .filter((n) => n && typeof n.label === 'string')
        .map((n) => ({ path: String(n.path || ''), label: n.label.slice(0, 120) }))
        .slice(0, 8),
      validation: { valid: !!validation?.valid, errors: validation?.errors || [] },
      discriminators: disc,
      attempts,
    };
  } catch (err) {
    console.warn(`[nodeConfigurator] ${id} failed, keeping node type only:`, err.message);
    return null;
  }
}

module.exports = { configureStep, buildConfigIntent, remapDeprecatedNode, isBranchingStep, enabled, _normalizeExpressions: normalizeExpressions, _extractJson: extractJson, _discriminatorOptions: discriminatorOptions, _validatePick: validatePick };
