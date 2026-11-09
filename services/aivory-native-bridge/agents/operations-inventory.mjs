import { z } from 'zod';

import { reorderSuggestion } from '../reorder.mjs';

// Native backend for Juno (agent_type `operations_inventory`).
//
// One tool, and it is pure maths: the stock, demand and supplier figures come from
// the tenant's own ERP (Odoo stock.quant / purchase history through Od-MCP, ERPNext
// bins), which Juno reads with those read tools and passes in here. The bridge holds
// no inventory tables, so there is nothing to query and no tenant data is touched;
// tenant_id is still bound by the session like every other native agent.
//
// Deviation from docs/CERVEAU-NEW-AGENTS-PLAN.md section 3.2: no `record_ops_alert`.
// An alert would need a new aivory_ops table on production for little gain; Juno
// hands alerts on as `alert` packets (docs/CERVEAU-HANDOFF-PACKET.md) via team_handoff.

export const agentType = 'operations_inventory';
export const mcpPath = 'operations-inventory';
// Every tool runs locally; server.mjs only needs the env var when a tool has no handler.
export const webhookEnvVar = 'N8N_WEBHOOK_OPERATIONS_INVENTORY';

const nonneg = z.number().finite().min(0);

const itemSchema = z.object({
  sku: z.string().max(120).optional().describe('Product code or name as the ERP shows it'),
  name: z.string().max(200).optional(),
  on_hand: nonneg.describe('Units in stock right now (quantity on hand, not forecast)'),
  on_order: nonneg.optional().describe('Units on open purchase orders not yet received'),
  avg_daily_demand: nonneg.optional().describe('Average units sold or consumed per day'),
  units_sold: nonneg.optional().describe('Alternative to avg_daily_demand: units sold over demand_basis_days'),
  demand_basis_days: z.number().finite().positive().optional().describe('Days of history behind units_sold / avg_daily_demand'),
  lead_time_days: nonneg.describe('Supplier lead time in days, from the supplier or PO history'),
  safety_stock_units: nonneg.optional(),
  safety_stock_days: nonneg.optional().describe('Safety stock expressed as days of demand'),
  order_cover_days: nonneg.optional().describe('Days of demand to order beyond the reorder point (default 14)'),
  moq: nonneg.optional().describe('Supplier minimum order quantity'),
  pack_size: nonneg.optional().describe('Order in multiples of this'),
});

export async function reorderSuggestionHandler(args) {
  const out = reorderSuggestion(args?.items);
  if (!out.ok) throw new Error(out.error);
  return out;
}

export const tools = [
  {
    name: 'reorder_suggestion',
    description:
      'Reorder points and suggested order quantities for up to 50 products, with every input shown. ' +
      'reorder_point = avg daily demand x supplier lead time + safety stock; suggested quantity = target level minus ' +
      '(on hand + on order), rounded up to the supplier MOQ and pack size. Pure arithmetic: YOU read on-hand, ' +
      'demand history and lead time from the ERP first, name the system and period for each, and pass them in. ' +
      'Never invent lead time or demand; if an input is missing the item comes back with the reason and no number. ' +
      'Results are sorted most urgent first (stock_out, reorder_now, covered_by_open_orders, ok). Demand built on ' +
      'fewer than 14 days is flagged directional. Applied defaults are listed under assumptions: tell the user. ' +
      'This only suggests; creating or confirming a purchase order is a separate approval-gated step.',
    inputSchema: { items: z.array(itemSchema).min(1).max(50) },
    action: 'reorder_suggestion',
    handler: reorderSuggestionHandler,
  },
];
