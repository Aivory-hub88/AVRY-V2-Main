// Pure maths for Juno's `reorder_suggestion` (agents/operations-inventory.mjs).
//
// No database and no clock: the model reads on-hand, demand and lead time from the
// tenant's ERP (Odoo stock.quant / sale history, ERPNext bins) and passes them in;
// this file only does the arithmetic, shows every input back, and refuses to guess.
//
//   reorder_point = avg_daily_demand * lead_time_days + safety_stock
//   position      = on_hand + on_order
//   target_level  = reorder_point + avg_daily_demand * order_cover_days
//   suggested_qty = max(0, target_level - position), rounded UP to MOQ then pack size
//
// Honesty rules (docs/CERVEAU-HANDOFF-PACKET.md): a demand figure built on fewer than
// DEMAND_MIN_DAYS of history is flagged directional; missing inputs are listed, never
// defaulted silently; every default that IS applied is echoed in `assumptions`.

export const DEMAND_MIN_DAYS = 14;
export const DEFAULT_ORDER_COVER_DAYS = 14;
export const MAX_ITEMS = 50;

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const r2 = (n) => Number(n.toFixed(2));

function roundUpTo(qty, step) {
  if (!step || step <= 0) return qty;
  return Math.ceil(qty / step) * step;
}

export function reorderItem(item) {
  const sku = item?.sku ?? null;
  const name = item?.name ?? null;
  const errors = [];

  const onHand = num(item?.on_hand);
  const onOrder = item?.on_order == null ? 0 : num(item.on_order);
  const lead = num(item?.lead_time_days);
  if (onHand == null || onHand < 0) errors.push('on_hand must be a number >= 0');
  if (onOrder == null || onOrder < 0) errors.push('on_order must be a number >= 0 when given');
  if (lead == null || lead < 0) errors.push('lead_time_days must be a number >= 0 (ask the supplier or read it from the PO history; do not guess)');

  // Demand: either a daily average, or units sold over a stated number of days.
  let daily = num(item?.avg_daily_demand);
  let demandBasisDays = num(item?.demand_basis_days);
  const hasSold = item?.units_sold != null;
  if (daily == null && hasSold) {
    const sold = num(item.units_sold);
    if (sold == null || sold < 0 || demandBasisDays == null || demandBasisDays <= 0) {
      errors.push('units_sold needs demand_basis_days > 0 (the number of days that sale total covers)');
    } else {
      daily = sold / demandBasisDays;
    }
  }
  if (daily == null && !errors.some((e) => e.startsWith('units_sold'))) {
    errors.push('give avg_daily_demand, or units_sold with demand_basis_days');
  }
  if (daily != null && daily < 0) errors.push('demand cannot be negative');

  const assumptions = [];
  let safety = num(item?.safety_stock_units);
  if (safety == null && num(item?.safety_stock_days) != null) {
    safety = daily == null ? null : num(item.safety_stock_days) * daily;
  }
  if (safety == null) {
    safety = 0;
    assumptions.push('No safety stock was given, so 0 was used. Ask the owner for a safety level before ordering on this.');
  } else if (safety < 0) {
    errors.push('safety stock cannot be negative');
  }

  const coverDaysGiven = num(item?.order_cover_days);
  const coverDays = coverDaysGiven ?? DEFAULT_ORDER_COVER_DAYS;
  if (coverDaysGiven == null) assumptions.push(`Order cover defaulted to ${DEFAULT_ORDER_COVER_DAYS} days of demand beyond the reorder point.`);

  if (errors.length) return { sku, name, ok: false, errors };

  const rp = daily * lead + safety;
  const position = onHand + onOrder;
  const target = rp + daily * coverDays;
  const daysOfCover = daily > 0 ? onHand / daily : null;

  let status;
  if (onHand <= 0) status = 'stock_out';
  else if (position <= rp) status = 'reorder_now';
  else if (onHand <= rp) status = 'covered_by_open_orders';
  else status = 'ok';

  let qty = 0;
  const notes = [];
  if (status === 'stock_out' || status === 'reorder_now') {
    qty = Math.max(0, target - position);
    const moq = num(item?.moq);
    const pack = num(item?.pack_size);
    qty = Math.ceil(qty);
    if (moq && qty > 0 && qty < moq) { qty = moq; notes.push(`Raised to the supplier minimum order of ${moq}.`); }
    if (pack && pack > 0) { const rounded = roundUpTo(qty, pack); if (rounded !== qty) notes.push(`Rounded up to a multiple of the pack size ${pack}.`); qty = rounded; }
  }

  if (daily === 0) notes.push('Demand is 0 in the period, so the reorder point is just the safety stock; check that the item is still sold.');
  const directional = demandBasisDays != null && demandBasisDays < DEMAND_MIN_DAYS;
  if (directional) notes.push(`Demand rests on only ${demandBasisDays} days of history (under ${DEMAND_MIN_DAYS}): directional only.`);
  if (status === 'covered_by_open_orders') notes.push('On hand is below the reorder point but open purchase orders bring the position above it; check they are not late.');

  return {
    sku,
    name,
    ok: true,
    status,
    inputs: {
      on_hand: onHand,
      on_order: onOrder,
      avg_daily_demand: r2(daily),
      demand_basis_days: demandBasisDays,
      lead_time_days: lead,
      safety_stock_units: r2(safety),
      order_cover_days: coverDays,
      moq: num(item?.moq),
      pack_size: num(item?.pack_size),
    },
    reorder_point: r2(rp),
    stock_position: r2(position),
    target_level: r2(target),
    days_of_cover: daysOfCover == null ? null : r2(daysOfCover),
    suggested_order_qty: qty,
    directional_only: directional,
    formula: 'reorder_point = avg_daily_demand x lead_time_days + safety_stock; suggested = target_level - (on_hand + on_order), rounded up to MOQ then pack size',
    assumptions,
    notes,
  };
}

export function reorderSuggestion(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, error: 'Give at least one item.' };
  }
  if (items.length > MAX_ITEMS) {
    return { ok: false, error: `At most ${MAX_ITEMS} items per call; split the list.` };
  }
  const results = items.map(reorderItem);
  const order = { stock_out: 0, reorder_now: 1, covered_by_open_orders: 2, ok: 3 };
  results.sort((a, b) => (a.ok === b.ok ? (order[a.status] ?? 9) - (order[b.status] ?? 9) : a.ok ? -1 : 1));
  const count = (s) => results.filter((r) => r.ok && r.status === s).length;
  return {
    ok: true,
    summary: {
      items: results.length,
      stock_out: count('stock_out'),
      reorder_now: count('reorder_now'),
      covered_by_open_orders: count('covered_by_open_orders'),
      ok: count('ok'),
      could_not_compute: results.filter((r) => !r.ok).length,
    },
    results,
  };
}
