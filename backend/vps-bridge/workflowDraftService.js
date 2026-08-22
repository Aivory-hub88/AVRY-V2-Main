const crypto = require('crypto');
const { callN8nAsCodeService } = require('./n8nAsCodeServiceClient');
const {
  getNodeSchema,
  validateNodeConfig,
  searchNodes,
  isAvailable: isN8nMcpAvailable,
} = require('./n8nMcpClient');

// --- n8n-as-code grounded node resolver (@n8n-as-code/skills) ---------------
// Replaces the weak MCP-only candidate scoring (which mapped hubspot->Monica CRM,
// slack->LINE). KnowledgeSearch is grounded in the bundled 537-node index.
let _ks = null, _ksLoad = null;
function getKnowledgeSearch() {
  if (_ks) return Promise.resolve(_ks);
  if (_ksLoad) return _ksLoad;
  _ksLoad = (async () => {
    try {
      const { KnowledgeSearch } = require('@n8n-as-code/skills');
      const idx = require.resolve('@n8n-as-code/skills/dist/assets/n8n-knowledge-index.json');
      const ks = new KnowledgeSearch(idx);
      await ks.loadIndex();
      _ks = ks; return ks;
    } catch (e) {
      console.warn('[node-resolver] @n8n-as-code/skills unavailable:', e.message);
      return null;
    }
  })();
  return _ksLoad;
}
async function resolveNodeIdFromSkills(step) {
  try {
    const ks = await getKnowledgeSearch();
    if (!ks) return null;
    // The app name is the definitive integration signal — query it first so
    // "hubspot" resolves to HubSpot (not Zoho/Monica from title keywords).
    const queries = [];
    if (step.app) queries.push(`${step.app} ${step.action || ''}`.trim());
    const fb = [step.title, step.action, step.description, step.type].filter(Boolean).join(' ').trim();
    if (fb) queries.push(fb);
    for (const q of queries) {
      const res = await ks.searchAll(q);
      const nodes = (res && res.results || []).filter((r) => r.type === 'node');
      // Prefer the standalone node over its AI-agent "*Tool" variant (which
      // n8n rejects as a normal workflow action: "Node cannot be used as a tool").
      const top = nodes.find((r) => !/tool$/i.test(String(r.id || ''))) || nodes[0];
      if (top) return top.id;
    }
    return null;
  } catch (e) { return null; }
}

function buildWorkflowId() {
  return `wf_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

function buildStepSearchQuery(step) {
  return [
    step.title,
    step.description,
    step.type,
    step.config?.integration,
    step.config?.service,
    step.config?.app,
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
}

function normalizeSearchResults(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.results)) return raw.results;
  if (Array.isArray(raw?.nodes)) return raw.nodes;
  return [];
}

function sanitizeCandidate(candidate) {
  return {
    nodeType: candidate.nodeType || null,
    workflowNodeType: candidate.workflowNodeType || null,
    displayName: candidate.displayName || candidate.name || null,
    description: candidate.description || null,
    category: candidate.category || null,
    package: candidate.package || null,
    relevance: candidate.relevance || null,
  };
}

function scoreCandidate(candidate, step) {
  const displayName = String(candidate.displayName || candidate.name || '').toLowerCase();
  const category = String(candidate.category || '').toLowerCase();
  const packageName = String(candidate.package || '').toLowerCase();
  const haystack = `${step.title || ''} ${step.description || ''}`.toLowerCase();

  let score = 0;
  if (packageName === 'n8n-nodes-base') score += 5;
  if (candidate.relevance === 'high') score += 3;
  if (step.type === 'trigger' && category.includes('trigger')) score += 4;
  if (step.type !== 'trigger' && !category.includes('trigger')) score += 2;
  for (const word of displayName.split(/\s+/).filter((w) => w.length > 3)) {
    if (haystack.includes(word)) score += 1;
  }
  return score;
}

function selectBestCandidate(candidates, step) {
  return [...candidates]
    .filter((candidate) => candidate.nodeType || candidate.workflowNodeType)
    .sort((a, b) => scoreCandidate(b, step) - scoreCandidate(a, step))[0] || null;
}

function summarizeSchema(schema) {
  if (!schema || typeof schema !== 'object') return null;
  return {
    displayName: schema.displayName || schema.name || null,
    description: schema.description || null,
    propertiesCount: Array.isArray(schema.properties) ? schema.properties.length : undefined,
    credentials: schema.credentials || schema.credentialTypes || undefined,
  };
}

async function inspectStepWithMcp(step) {
  const query = buildStepSearchQuery(step);
  if (!query) {
    return { mcpAvailable: true, query: '', candidates: [], selectedNode: null };
  }

  const rawSearch = await searchNodes(query, { limit: 8, source: 'core' });
  const candidates = normalizeSearchResults(rawSearch).map(sanitizeCandidate);
  const skillsNodeId = await resolveNodeIdFromSkills(step);
  let selectedNode = null;
  if (skillsNodeId) {
    const idLc = skillsNodeId.toLowerCase();
    selectedNode = candidates.find((c) => {
      const nt = (c.nodeType || c.workflowNodeType || '').toLowerCase();
      return nt.endsWith('.' + idLc) || nt === idLc || nt === 'nodes-base.' + idLc;
    }) || { nodeType: `nodes-base.${skillsNodeId}`, workflowNodeType: `n8n-nodes-base.${skillsNodeId}`, displayName: skillsNodeId };
  }
  if (!selectedNode) selectedNode = selectBestCandidate(candidates, step);
  const selectedNodeType = selectedNode?.nodeType || selectedNode?.workflowNodeType || null;
  // n8n expects the full package form (n8n-nodes-base.*); MCP returns a short
  // form (nodes-base.*) in nodeType. Prefer workflowNodeType for the draft so
  // n8n-as-code does not reject it as an unrecognized node type.
  const selectedWorkflowNodeType = selectedNode?.workflowNodeType || selectedNode?.nodeType || null;
  const schema = selectedNodeType ? await getNodeSchema(selectedNodeType) : null;
  const validation = selectedNodeType
    ? await validateNodeConfig(selectedNodeType, step.config || {}, 'minimal')
    : null;

  return {
    mcpAvailable: true,
    query,
    candidates: candidates.slice(0, 5),
    selectedNode: selectedNode ? sanitizeCandidate(selectedNode) : null,
    selectedNodeType,
    selectedWorkflowNodeType,
    schema: summarizeSchema(schema),
    validation,
  };
}

async function enrichStepsWithMcp(steps) {
  const available = await isN8nMcpAvailable();
  if (!available) {
    return {
      steps,
      inspectionReport: {
        source: 'n8n_mcp',
        available: false,
        steps: [],
        warnings: ['n8n MCP inspection unavailable; continued with n8n-as-code validation.'],
      },
    };
  }

  const inspected = [];
  const enrichedSteps = [];

  for (const step of steps) {
    try {
      const inspection = await inspectStepWithMcp(step);
      inspected.push({
        stepId: step.id,
        title: step.title,
        ...inspection,
      });
      // Extract selectedNodeType from inspection as top-level nodeType
      // This allows n8n-as-code-service to use the exact n8n node type
      const selectedNodeType = inspection.selectedWorkflowNodeType || inspection.selectedNodeType || null;
      // n8n-as-code reads node parameters from step.parameters when a direct
      // nodeType is provided. UI/copilot steps carry their config under
      // step.config, so map it through to avoid building parameter-less nodes
      // that fail n8n pre-execution validation.
      const mappedParameters = step.parameters || step.config || {};
      enrichedSteps.push({
        ...step,
        nodeType: selectedNodeType,
        parameters: mappedParameters,
        n8nInspection: inspection,
      });
    } catch (error) {
      inspected.push({
        stepId: step.id,
        title: step.title,
        mcpAvailable: true,
        error: error.message,
      });
      enrichedSteps.push(step);
    }
  }

  return {
    steps: enrichedSteps,
    inspectionReport: {
      source: 'n8n_mcp',
      available: true,
      steps: inspected,
      warnings: inspected.some((item) => item.error)
        ? ['Some n8n MCP inspections failed; continued with available schema data.']
        : [],
    },
  };
}

async function prepareWorkflowDraft({ workflowId, description, steps }) {
  const resolvedWorkflowId = workflowId || buildWorkflowId();
  const { steps: enrichedSteps, inspectionReport } = await enrichStepsWithMcp(steps || []);

  const buildResult = await callN8nAsCodeService('/drafts/build', {
    session_id: resolvedWorkflowId,
    draft_id: resolvedWorkflowId,
    intent: description,
    steps: enrichedSteps,
    config: {
      inspectionReport,
    },
  });

  const testResult = await callN8nAsCodeService('/drafts/test', {
    draft_id: buildResult.draft_id,
  });

  const setupReport = await callN8nAsCodeService('/drafts/report', {
    draft_id: buildResult.draft_id,
  });

  return {
    workflowId: buildResult.draft_id,
    draftArtifactPath: buildResult.workflow_code_path,
    inspectionReport,
    dummyTest: {
      passed: testResult.status === 'passed',
      sandboxWorkflowId: testResult.sandboxWorkflowId,
      validationMode: testResult.validationMode,
      cleanupStatus: testResult.cleanupStatus,
      cleanupError: testResult.cleanupError,
      nodeResults: testResult.nodeResults,
      logs: testResult.logs,
      errors: testResult.errors,
    },
    setupReport,
  };
}

module.exports = {
  prepareWorkflowDraft,
};
