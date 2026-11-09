import { test } from 'node:test';
import assert from 'node:assert/strict';

import { tools, agentType, mcpPath, campaignLinksHandler } from './marketing-content.mjs';

test('module identity matches the server route and the roster', () => {
  assert.equal(agentType, 'marketing_content');
  assert.equal(mcpPath, 'marketing-content');
  assert.deepEqual(tools.map((t) => t.name), ['campaign_links']);
});

test('the tool runs locally and never takes a tenant id', () => {
  const t = tools[0];
  assert.equal(typeof t.handler, 'function');
  assert.equal('tenant_id' in t.inputSchema, false);
  assert.equal('tenantId' in t.inputSchema, false);
});

test('handler returns tagged links', async () => {
  const out = await campaignLinksHandler({ campaign: 'Promo', links: [{ channel: 'linkedin', url: 'https://x.id/a' }] });
  assert.equal(out.summary.tagged, 1);
  assert.match(out.results[0].url, /utm_campaign=promo/);
});

test('handler throws on an empty campaign name (generic error upstream)', async () => {
  await assert.rejects(() => campaignLinksHandler({ campaign: '!!!', links: [{ channel: 'email', url: 'https://x.id/' }] }));
});

test('the input schema rejects an empty list and a missing url before the code runs', () => {
  const { links } = tools[0].inputSchema;
  assert.equal(links.safeParse([]).success, false);
  assert.equal(links.safeParse([{ channel: 'email' }]).success, false);
  assert.equal(links.safeParse([{ channel: 'email', url: 'https://x.id/' }]).success, true);
});
