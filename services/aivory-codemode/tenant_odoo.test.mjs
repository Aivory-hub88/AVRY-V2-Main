import test from 'node:test';
import assert from 'node:assert/strict';
import { createOdooResolver } from './tenant_odoo.mjs';

const resolverFor = (url) =>
  createOdooResolver({
    backendUrl: 'http://backend.invalid',
    token: 't',
    fetchImpl: async () => ({ ok: true, json: async () => ({ servers: [{ name: 'odoo', url, disabled_tools: [] }] }) }),
  });

test('accepts only the exact shared Odoo MCP host', async () => {
  assert.ok(await resolverFor('https://odoo-mcp.aivory.uk/mcp?token=a')('t1', 'autonomous'));
  for (const bad of [
    'https://odoo-mcp.aivory.uk.evil.example/mcp?token=a',
    'https://odoo-mcp.aivory.uk@evil.example/mcp?token=a',
    'http://odoo-mcp.aivory.uk/mcp?token=a',
    'https://evil.example/mcp?token=a',
    'https://odoo-mcp.aivory.uk/other?token=a',
    'not a url',
  ]) {
    assert.equal(await resolverFor(bad)('t1', 'autonomous'), null, bad);
  }
});

test('rejects malformed tenant or agent ids and is off without backend config', async () => {
  const r = resolverFor('https://odoo-mcp.aivory.uk/mcp?token=a');
  assert.equal(await r('../x', 'autonomous'), null);
  assert.equal(await r('t1', 'a/b'), null);
  assert.equal(createOdooResolver({ backendUrl: '', token: '' }), null);
});
