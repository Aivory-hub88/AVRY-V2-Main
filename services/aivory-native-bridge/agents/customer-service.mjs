import { z } from 'zod';

// Native, zero-signup ticketing backend for the customer_service agent type.
// Every tool forwards to ONE n8n webhook workflow with an `action` field;
// tenant_id is injected by the bridge from the MCP session, never accepted
// from tool arguments even if the model supplies one.

export const agentType = 'customer_service';
export const mcpPath = 'customer-service';
export const webhookEnvVar = 'N8N_WEBHOOK_CUSTOMER_SERVICE';

export const tools = [
  {
    name: 'create_ticket',
    description: 'Create a new support ticket for this tenant.',
    inputSchema: {
      subject: z.string().min(1).max(300),
      description: z.string().max(10000).default(''),
      priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
    },
    action: 'create_ticket',
  },
  {
    name: 'list_tickets',
    description: 'List this tenant\'s support tickets, optionally filtered by status.',
    inputSchema: {
      status: z.enum(['open', 'pending', 'closed', 'all']).default('all'),
    },
    action: 'list_tickets',
  },
  {
    name: 'get_ticket',
    description: 'Get full details of one ticket by id, including its comment thread.',
    inputSchema: {
      ticket_id: z.string().uuid(),
    },
    action: 'get_ticket',
  },
  {
    name: 'reply_ticket',
    description: 'Add a reply/comment to an existing ticket.',
    inputSchema: {
      ticket_id: z.string().uuid(),
      body: z.string().min(1).max(10000),
    },
    action: 'reply_ticket',
  },
  {
    name: 'close_ticket',
    description: 'Close a ticket (mark resolved).',
    inputSchema: {
      ticket_id: z.string().uuid(),
    },
    action: 'close_ticket',
  },
];
