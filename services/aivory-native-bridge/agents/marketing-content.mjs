import { z } from 'zod';

import { CHANNELS, MAX_LINKS, campaignLinks } from '../utm.mjs';

// Native backend for Mira (agent_type `marketing_content`).
//
// One tool, pure and local: `campaign_links` builds UTM-tagged links so Lex and Ivo can
// attribute leads to a campaign later. The calendar and the drafts live in the tenant's
// own Google Sheets/Docs; nothing here stores tenant data and nothing is posted, so
// tenant_id is only bound by the session like every other native agent.
//
// Deviation from docs/CERVEAU-NEW-AGENTS-PLAN.md section 3.3: no `content_calendar_*` and
// no `record_campaign`. They would need new aivory_ops tables on production, and the
// calendar is a Sheet by the acceptance test anyway. The campaign hand-off to Lex is a
// `campaign` packet (docs/CERVEAU-HANDOFF-PACKET.md) carrying the UTM line this tool returns.

export const agentType = 'marketing_content';
export const mcpPath = 'marketing-content';
// Every tool runs locally; server.mjs only needs the env var when a tool has no handler.
export const webhookEnvVar = 'N8N_WEBHOOK_MARKETING_CONTENT';

const linkSchema = z.object({
  channel: z.string().min(1).max(60).describe(`Where the link will be shown. Known: ${Object.keys(CHANNELS).join(', ')}`),
  url: z.string().min(1).max(2000).describe('Absolute http(s) landing URL, without any utm_ parameters'),
  content: z.string().max(80).optional().describe('Tells two links on the same channel apart (for example hero-button)'),
  term: z.string().max(80).optional().describe('Paid keyword, if any'),
  source: z.string().max(60).optional().describe('Override utm_source; needed with medium for an unknown channel'),
  medium: z.string().max(60).optional().describe('Override utm_medium; needed with source for an unknown channel'),
});

export async function campaignLinksHandler(args) {
  const out = campaignLinks({ campaign: args?.campaign, links: args?.links });
  if (!out.ok) throw new Error(out.error);
  return out;
}

export const tools = [
  {
    name: 'campaign_links',
    description:
      `UTM-tagged links for one campaign, up to ${MAX_LINKS} per call. Lowercases and cleans every tag, keeps the ` +
      'URL\'s other parameters, refuses non-http(s) URLs and URLs that already carry utm_ parameters (never overwrites), ' +
      'and refuses an unknown channel unless you give both source and medium. Returns the tagged links, a per-link ' +
      'reason for any refusal, and the "source / medium / campaign" line to put in the campaign hand-off packet to Lex. ' +
      'Pure formatting: it does not check that the page exists or that the form records the tags, and a lead can only be ' +
      'attributed to the campaign if it does; tell the user that. Nothing is posted or sent.',
    inputSchema: {
      campaign: z.string().min(1).max(120).describe('Campaign name; becomes utm_campaign (lowercase, dashes)'),
      links: z.array(linkSchema).min(1).max(MAX_LINKS),
    },
    action: 'campaign_links',
    handler: campaignLinksHandler,
  },
];
