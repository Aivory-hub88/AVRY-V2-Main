import { z } from 'zod';

// Native, zero-signup invoice tracking backend for the finance_invoice_ops
// agent type. Status/document tracking only — real payment collection still
// needs a real processor (Stripe, already wired separately). tenant_id is
// injected by the bridge from the MCP session, never accepted from tool
// arguments.

export const agentType = 'finance_invoice_ops';
export const mcpPath = 'finance-invoice-ops';
export const webhookEnvVar = 'N8N_WEBHOOK_FINANCE_INVOICE_OPS';

const statusEnum = z.enum(['draft', 'sent', 'paid', 'overdue', 'void']);

export const tools = [
  {
    name: 'create_invoice',
    description: 'Create a new draft invoice for this tenant.',
    inputSchema: {
      customer_name: z.string().min(1).max(300),
      customer_email: z.string().max(300).default(''),
      currency: z.string().min(3).max(3).default('USD'),
      due_date: z.string().max(30).default(''),
    },
    action: 'create_invoice',
  },
  {
    name: 'add_invoice_line',
    description: 'Add a line item to an existing invoice (only works while the invoice belongs to this tenant).',
    inputSchema: {
      invoice_id: z.string().uuid(),
      description: z.string().min(1).max(500),
      quantity: z.number().positive().default(1),
      unit_price: z.number().nonnegative(),
    },
    action: 'add_invoice_line',
  },
  {
    name: 'list_invoices',
    description: "List this tenant's invoices, optionally filtered by status.",
    inputSchema: {
      status: z.union([statusEnum, z.literal('all')]).default('all'),
    },
    action: 'list_invoices',
  },
  {
    name: 'get_invoice',
    description: 'Get full details of one invoice by id, including line items and computed total.',
    inputSchema: {
      invoice_id: z.string().uuid(),
    },
    action: 'get_invoice',
  },
  {
    name: 'update_invoice_status',
    description: 'Change an invoice status (e.g. mark sent, paid, overdue, or void).',
    inputSchema: {
      invoice_id: z.string().uuid(),
      status: statusEnum,
    },
    action: 'update_invoice_status',
  },
];
