'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { configureStep, buildConfigIntent, _validatePick, _discriminatorOptions, _extractJson, _normalizeExpressions } = require('../nodeConfigurator');
const { _parseSearchCandidates } = require('../n8nMcpClient');

// Captured from n8n 2.26.4 (search_nodes ["google drive", "schedule trigger"], trimmed).
const SEARCH = [
  '## "google drive"',
  'Found 2 nodes:',
  '',
  '- n8n-nodes-base.googleDrive',
  '  Display Name: Google Drive',
  '  Version: 3',
  '  Description: Access data on Google Drive',
  '  Discriminators:',
  '    resource:',
  '      - file:',
  '          operations:',
  '            - copy',
  '              Create a copy of an existing file',
  '            - upload',
  '              Upload an existing file to Google Drive',
  '      - folder:',
  '          operations:',
  '            - create',
  '              Create a folder',
  '',
  '  Use get_node_types with discriminators:',
  '    get_node_types({ nodeIds: [{ nodeId: "n8n-nodes-base.googleDrive", resource: "file", operation: "copy" }] })',
  '',
  '- n8n-nodes-base.scheduleTrigger [TRIGGER]',
  '  Display Name: Schedule Trigger',
  '  Version: 1.3',
  '  Description: Triggers the workflow on a given schedule',
  '  Discriminators: none (use node directly without resource/operation/mode)',
].join('\n');

test('search parsing: version and resource→operations (descriptions ignored)', () => {
  const [drive, sched] = _parseSearchCandidates(SEARCH, 8);
  assert.equal(drive.version, 3);
  assert.deepEqual(drive.discriminators.resources, { file: ['copy', 'upload'], folder: ['create'] });
  assert.equal(sched.version, 1.3);
  assert.equal(sched.discriminators, null);
  assert.equal(sched.category, 'trigger');
});

test('discriminator picks are validated against the real options', () => {
  const opts = _discriminatorOptions(_parseSearchCandidates(SEARCH, 8)[0].discriminators);
  assert.deepEqual(_validatePick({ resource: 'file', operation: 'upload' }, opts), { resource: 'file', operation: 'upload' });
  assert.equal(_validatePick({ resource: 'file', operation: 'explode' }, opts), null);
  assert.deepEqual(_validatePick({ resource: 'nope', operation: 'copy' }, opts), { resource: 'file', operation: 'copy' }, 'a unique operation fixes a wrong resource');
  assert.equal(_validatePick({ resource: 'nope', operation: 'explode' }, opts), null);
  assert.equal(_validatePick(null, opts), null);
});

test('a pick with only an operation infers its resource when unambiguous', () => {
  const opts = _discriminatorOptions({ resources: { message: ['send', 'get'], label: ['create', 'get'] }, operations: [], modes: [] });
  assert.deepEqual(_validatePick({ operation: 'send' }, opts), { resource: 'message', operation: 'send' });
  assert.equal(_validatePick({ operation: 'get' }, opts), null, 'ambiguous operation is rejected');
});

test('a mismatched resource is corrected from the operation (channel + post => message/post)', () => {
  const opts = _discriminatorOptions({ resources: { channel: ['create', 'get'], message: ['post', 'update'] }, operations: [], modes: [] });
  assert.deepEqual(_validatePick({ resource: 'channel', operation: 'post' }, opts), { resource: 'message', operation: 'post' });
  assert.equal(_validatePick({ resource: 'channel', operation: 'explode' }, opts), null);
});

test('expressions get the leading = n8n needs, nested values included', () => {
  assert.deepEqual(
    _normalizeExpressions({ text: 'New lead: {{ $json.name }}', n: 3, list: ['{{ $json.a }}', '=already {{ $json.b }}', 'plain'], o: { x: 'hi {{ $json.c }}' } }),
    { text: '=New lead: {{ $json.name }}', n: 3, list: ['={{ $json.a }}', '=already {{ $json.b }}', 'plain'], o: { x: '=hi {{ $json.c }}' } },
  );
});

test('buildConfigIntent combines workflow name, user request and the whole flow', () => {
  const out = buildConfigIntent({
    description: 'Lead alerts',
    userContext: 'When a lead arrives, email sales',
    steps: [{ title: 'Webhook Trigger', description: 'Receives a lead' }, { title: 'Send Email' }],
  });
  assert.match(out, /Workflow: Lead alerts/);
  assert.match(out, /What the user asked for:\nWhen a lead arrives, email sales/);
  assert.match(out, /1\. Webhook Trigger — Receives a lead\n2\. Send Email/);
});

test('extractJson copes with fences and chatter', () => {
  assert.deepEqual(_extractJson('Sure!\n```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(_extractJson('{"a":{"b":2}} trailing'), { a: { b: 2 } });
  assert.equal(_extractJson('no json here'), null);
});

function fakeMcp(overrides = {}) {
  const calls = { defs: [], validate: [] };
  return {
    calls,
    getNodeDefinitions: async (id, disc) => { calls.defs.push([id, disc]); return { definitions: 'type P = { sendTo: string }', version: 2.2, credentials: ['gmailOAuth2'], error: null }; },
    validateNodeConfig: async (id, params, _m, ver) => { calls.validate.push([id, params, ver]); return { valid: true, errors: [], warnings: [] }; },
    ...overrides,
  };
}
const GMAIL = { nodeType: 'n8n-nodes-base.gmail', displayName: 'Gmail', version: 2.2, discriminators: { resources: { message: ['send', 'get'] }, operations: [], modes: [] } };
const STEP = { title: 'Send email to sales', description: 'Email the lead summary', type: 'action', config: {} };

test('configureStep: picks operation, fills params, uses the node version, merges discriminators', async () => {
  const mcp = fakeMcp();
  const prompts = [];
  const llm = async ({ user }) => {
    prompts.push(user);
    return prompts.length === 1
      ? { resource: 'message', operation: 'send' }
      : { parameters: { sendTo: 'sales@example.com', subject: 'Leads', message: '={{ $json.summary }}' }, needsInput: [] };
  };
  const out = await configureStep({ step: STEP, node: GMAIL, intent: 'email leads', previousSteps: ['Webhook'] }, { llm, mcp });
  assert.equal(out.nodeType, 'n8n-nodes-base.gmail');
  assert.equal(out.typeVersion, 2.2);
  assert.deepEqual(out.parameters, { sendTo: 'sales@example.com', subject: 'Leads', message: '={{ $json.summary }}', resource: 'message', operation: 'send' });
  assert.deepEqual(out.credentialTypes, ['gmailOAuth2']);
  assert.deepEqual(mcp.calls.defs[0], ['n8n-nodes-base.gmail', { resource: 'message', operation: 'send' }]);
  assert.equal(out.validation.valid, true);
  assert.match(prompts[1], /Earlier steps.*Webhook/);
});

test('configureStep: repairs once when n8n validation fails, keeps the better result', async () => {
  let validations = 0;
  const mcp = fakeMcp({
    validateNodeConfig: async () => (++validations === 1
      ? { valid: false, errors: [{ path: 'message', message: 'required' }], warnings: [] }
      : { valid: true, errors: [], warnings: [] }),
  });
  let n = 0;
  const llm = async ({ user }) => {
    n++;
    if (n === 1) return { resource: 'message', operation: 'send' };
    if (n === 2) return { parameters: { sendTo: 'a@b.co', subject: 'x' } };
    assert.match(user, /validation errors to fix:\nmessage: required/);
    return { parameters: { sendTo: 'a@b.co', subject: 'x', message: 'hi' }, needsInput: [{ path: 'sendTo', label: 'Recipient' }] };
  };
  const out = await configureStep({ step: STEP, node: GMAIL }, { llm, mcp });
  assert.equal(out.attempts, 2);
  assert.equal(out.validation.valid, true);
  assert.equal(out.parameters.message, 'hi');
  assert.deepEqual(out.needsInput, [{ path: 'sendTo', label: 'Recipient' }]);
});

test('configureStep: an invalid operation pick, junk output or missing definitions all fall back to null', async () => {
  const mcp = fakeMcp();
  assert.equal(await configureStep({ step: STEP, node: GMAIL }, { llm: async () => ({ resource: 'message', operation: 'explode' }), mcp }), null);
  let n = 0;
  assert.equal(await configureStep({ step: STEP, node: GMAIL }, { llm: async () => (++n === 1 ? { resource: 'message', operation: 'send' } : null), mcp }), null);
  const noDefs = fakeMcp({ getNodeDefinitions: async () => ({ definitions: '', version: null, credentials: [], error: 'not found' }) });
  assert.equal(await configureStep({ step: STEP, node: GMAIL }, { llm: async () => ({ resource: 'message', operation: 'send' }), mcp: noDefs }), null);
  assert.equal(await configureStep({ step: STEP, node: null }, { llm: async () => ({}), mcp }), null);
  const boom = async () => { throw new Error('LLM 500'); };
  assert.equal(await configureStep({ step: STEP, node: GMAIL }, { llm: boom, mcp }), null);
});

test('configureStep: a node without discriminators skips the pick call', async () => {
  const mcp = fakeMcp();
  let calls = 0;
  const llm = async () => { calls++; return { parameters: { path: 'leads' } }; };
  const out = await configureStep({ step: { title: 'Webhook', type: 'trigger' }, node: { nodeType: 'n8n-nodes-base.webhook', displayName: 'Webhook', version: 2.1, discriminators: null } }, { llm, mcp });
  assert.equal(calls, 1);
  assert.equal(out.typeVersion, 2.1);
  assert.deepEqual(out.parameters, { path: 'leads' });
});
