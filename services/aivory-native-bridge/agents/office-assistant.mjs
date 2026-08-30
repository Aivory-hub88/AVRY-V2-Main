import { z } from 'zod';

// Native, zero-signup meeting-summary backend for the office_assistant agent
// type. Unlike the other native modules (customer-service/leads-qualifier/
// finance-invoice-ops), this does NOT own an aivory_ops table — the legacy
// telegram-agent.js record_meeting_summary tool already writes to the
// operator dashboard's generic agent_actions log (action_type='meeting'),
// so this module's one n8n workflow proxies to that same backend endpoint
// instead of inventing a parallel store the dashboard can't render.
// tenant_id is injected by the bridge from the MCP session, never accepted
// from tool arguments even if the model supplies one.

export const agentType = 'office_assistant';
export const mcpPath = 'office-assistant';
export const webhookEnvVar = 'N8N_WEBHOOK_OFFICE_ASSISTANT';

export const tools = [
  {
    name: 'record_meeting_summary',
    description:
      'Persist a structured meeting summary to the operator dashboard: decisions made, action items with owners and due dates, and risks raised. Use when the user shares meeting notes, minutes, or a transcript (typed, attached, or voice-transcribed) and wants it processed.',
    inputSchema: {
      title: z.string().min(1).max(300),
      meeting_date: z.string().max(40).default(''),
      duration_minutes: z.number().default(0),
      participants: z.array(z.string()).default([]),
      decisions: z.array(z.string()).default([]),
      action_items: z
        .array(
          z.object({
            task: z.string(),
            owner: z.string().default(''),
            due_date: z.string().default(''),
          })
        )
        .default([]),
      risks: z.array(z.string()).default([]),
      summary: z.string().min(1).max(4000),
    },
    action: 'record_meeting_summary',
  },
];
