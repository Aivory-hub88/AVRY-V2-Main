const TOOLS_MATRIX = {
  // NOTE: keys below must match what getToolsForUseCase() is actually called
  // with. server.js computes useCase as
  // `body.entrypoint.replace('workflow_', 'workflow')`, which concatenates
  // (no underscore) — e.g. entrypoint "workflow_generate" -> useCase
  // "workflowgenerate", NOT "workflow". The old keys ('workflow',
  // 'workflow_edit') never matched any real useCase value, so every workflow_*
  // call silently fell through to the 'default' fallback below. Fixed by
  // adding the correctly-spelled keys; the old keys are kept for any other
  // direct callers.
  workflowgenerate: [
    'n8n-mcp__search_nodes', 'n8n-mcp__validate_workflow', 'n8n-mcp__n8n_create_workflow',
    'n8n-native__search_nodes', 'n8n-native__get_node_types', 'n8n-native__get_workflow_best_practices',
    'n8n-native__validate_workflow', 'n8n-native__get_sdk_reference', 'n8n-native__create_workflow_from_code',
  ],
  workflowclarify: [
    'n8n-mcp__search_nodes', 'n8n-native__search_nodes', 'n8n-native__get_workflow_best_practices',
  ],
  workflowedit: [
    'n8n-mcp__n8n_get_workflow', 'n8n-mcp__n8n_update_full_workflow', 'n8n-mcp__n8n_update_partial_workflow',
    'n8n-native__get_workflow_details', 'n8n-native__update_workflow', 'n8n-native__validate_workflow',
    'n8n-native__validate_node_config',
  ],
  workflowrepair: [
    'n8n-mcp__validate_workflow', 'n8n-mcp__n8n_autofix_workflow',
    'n8n-native__validate_workflow', 'n8n-native__validate_node_config', 'n8n-native__update_workflow',
  ],
  // Legacy/other callers (unchanged).
  workflow: ['n8n_list_workflows', 'n8n_get_workflow', 'n8n_create_workflow'],
  workflow_edit: ['n8n_get_workflow', 'n8n_update_workflow', 'n8n_activate_workflow', 'n8n_execute_workflow', 'n8n_list_executions'],
  activation_agent: ['n8n_activate_workflow', 'n8n_execute_workflow'],
  console: ['search_knowledge_base', 'get_user_context'],
  dev: ['inspect_logs', 'run_diagnostic', 'n8n_list_executions'],
  default: ['search_knowledge_base', 'get_user_context']
};

function getToolsForUseCase(useCase) {
  const toolNames = TOOLS_MATRIX[useCase] || TOOLS_MATRIX['default'];
  console.log('[tool-filter] useCase="' + useCase + '" -> ' + toolNames.length + ' tools: ' + toolNames.join(', '));
  return toolNames;
}

module.exports = { getToolsForUseCase };
