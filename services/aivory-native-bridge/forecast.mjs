// Sales funnel forecasting: pure arithmetic, no database, no network.
//
// The agent gathers weekly funnel counts (from the tenant's CRM/ERP, or numbers
// the user typed) and this module does every calculation. Models are poor at
// chained arithmetic over a dozen weeks; a wrong close rate here becomes a
// wrong revenue forecast the user may plan hiring around, so the numbers come
// from code and the agent only explains them.
//
// Model, in plain terms:
//   1. Step rates between consecutive funnel stages, weighted toward recent
//      weeks. Rates are ratio-of-weighted-sums (sum w*to / sum w*from), not an
//      average of weekly ratios, so a 1-lead week cannot swing the result.
//   2. Lead volume projected forward from the weighted level plus a damped
//      trend (the trend is only used with 4+ weeks of history).
//   3. Projected leads pushed through the step rates gives projected volume at
//      every stage, then jobs, revenue and gross profit.
//   4. Optionally: work backward from a target number of closes to the leads
//      each stage needs, and add expected closes from quotes already open.
//
// Known simplification: a week's leads are treated as converting at the funnel
// rates within the horizon. There is no lag model; that is reported as an
// assumption in every result so the agent can say it.

export const STAGES = ['leads', 'appointments_set', 'appointments_held', 'presentations', 'quotes', 'closes'];

// The name a roofing (or any field-sales) team uses for each adjacent step.
// Bleed is the share of leads that never get an appointment set: 1 - set rate.
const STEP_NAMES = {
  leads_to_appointments_set: 'set_rate',
  appointments_set_to_appointments_held: 'hold_rate',
  appointments_held_to_presentations: 'presentation_rate',
  presentations_to_quotes: 'quotation_rate',
  quotes_to_closes: 'close_rate',
};

const MONEY_FIELDS = ['revenue', 'units', 'cost'];
const TREND_MIN_WEEKS = 4;
const TREND_DAMPING = 0.8;

const round = (n, dp = 2) => (n === null || !Number.isFinite(n) ? null : Number(n.toFixed(dp)));
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

function weightsFor(n, weighting) {
  // Oldest week = 1, newest = n. Linear rather than exponential: it favours
  // recent weeks without letting one unusual week dominate.
  return Array.from({ length: n }, (_, i) => (weighting === 'equal' ? 1 : i + 1));
}

function weightedRatio(weeks, w, num, den) {
  let top = 0;
  let bottom = 0;
  weeks.forEach((wk, i) => {
    top += w[i] * wk[num];
    bottom += w[i] * wk[den];
  });
  return bottom > 0 ? top / bottom : null;
}

// A field is only usable when every week carries it: a stage reported for some
// weeks and not others would make the rate compare different populations.
function presentFields(weeks, fields, warnings) {
  return fields.filter((f) => {
    const have = weeks.filter((wk) => isNum(wk[f])).length;
    if (have > 0 && have < weeks.length) {
      warnings.push(`"${f}" is missing for ${weeks.length - have} of ${weeks.length} weeks, so it was left out.`);
    }
    return have === weeks.length;
  });
}

// Weighted least-squares line through lead counts, projected with a damped
// trend so a few rising weeks do not extrapolate into a runaway forecast.
function projectLeads(leads, w, horizon) {
  const n = leads.length;
  const sw = w.reduce((a, b) => a + b, 0);
  const level = leads.reduce((acc, y, i) => acc + w[i] * y, 0) / sw;
  if (n < TREND_MIN_WEEKS) {
    return { level, slope: 0, method: 'weighted_average', values: Array(horizon).fill(level) };
  }
  const xBar = w.reduce((acc, wi, i) => acc + wi * i, 0) / sw;
  let sxy = 0;
  let sxx = 0;
  leads.forEach((y, i) => {
    sxy += w[i] * (i - xBar) * (y - level);
    sxx += w[i] * (i - xBar) ** 2;
  });
  const slope = sxx > 0 ? sxy / sxx : 0;
  const base = level + slope * (n - 1 - xBar);
  const values = [];
  let damped = 0;
  for (let h = 1; h <= horizon; h++) {
    damped += TREND_DAMPING ** h;
    values.push(Math.max(0, base + slope * damped));
  }
  return { level, slope, method: 'damped_trend', values };
}

function stdDev(xs) {
  if (xs.length < 2) return null;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
}

export function forecastFunnel(input) {
  const {
    weeks,
    horizon_weeks: horizon = 4,
    weighting = 'recent',
    target_closes_per_week: target,
    open_quotes: openQuotes,
    follow_up_close_rate: followUpRate,
    currency,
    units_label: unitsLabel,
  } = input;
  const warnings = [];

  const stages = presentFields(weeks, STAGES, warnings);
  if (!stages.includes('leads') || !stages.includes('closes')) {
    return { success: false, error: 'Every week needs both "leads" and "closes".' };
  }
  const money = presentFields(weeks, MONEY_FIELDS, warnings);
  const w = weightsFor(weeks.length, weighting);

  if (weeks.length < TREND_MIN_WEEKS) {
    warnings.push(
      `Only ${weeks.length} weeks of history: leads are projected flat (no trend). ` +
      `${TREND_MIN_WEEKS}+ weeks gives a trend-aware forecast.`,
    );
  }
  weeks.forEach((wk, i) => {
    for (let s = 1; s < stages.length; s++) {
      if (wk[stages[s]] > wk[stages[s - 1]]) {
        warnings.push(
          `${wk.label || `week ${i + 1}`}: ${stages[s]} (${wk[stages[s]]}) is higher than ` +
          `${stages[s - 1]} (${wk[stages[s - 1]]}). Counts may come from different date filters.`,
        );
      }
    }
  });

  // 1. Step rates.
  const steps = [];
  for (let s = 1; s < stages.length; s++) {
    const key = `${stages[s - 1]}_to_${stages[s]}`;
    const rate = weightedRatio(weeks, w, stages[s], stages[s - 1]);
    if (rate === null) warnings.push(`No ${stages[s - 1]} in any week, so the ${key} rate is unknown.`);
    steps.push({ from: stages[s - 1], to: stages[s], key, name: STEP_NAMES[key] || key, rate });
  }
  const rates = Object.fromEntries(steps.map((st) => [st.name, round(st.rate, 4)]));
  if (steps[0].key === 'leads_to_appointments_set' && steps[0].rate !== null) {
    rates.bleed_rate = round(1 - steps[0].rate, 4);
  }
  const chain = steps.every((st) => st.rate !== null)
    ? steps.reduce((acc, st) => acc * st.rate, 1)
    : null;
  rates.lead_to_close_rate = round(chain, 4);

  // Unit economics, as weighted sums so big weeks count for more.
  const sum = (f) => weeks.reduce((acc, wk, i) => acc + w[i] * wk[f], 0);
  const econ = {};
  if (money.includes('revenue')) {
    econ.revenue_per_job = sum('closes') > 0 ? sum('revenue') / sum('closes') : null;
  }
  if (money.includes('units')) {
    econ.units_per_job = sum('closes') > 0 ? sum('units') / sum('closes') : null;
    if (money.includes('revenue')) econ.price_per_unit = sum('units') > 0 ? sum('revenue') / sum('units') : null;
    if (money.includes('cost')) econ.cost_per_unit = sum('units') > 0 ? sum('cost') / sum('units') : null;
  }
  if (money.includes('revenue') && money.includes('cost')) {
    econ.profit_margin = sum('revenue') > 0 ? 1 - sum('cost') / sum('revenue') : null;
  }

  // 2-3. Lead projection pushed through the funnel.
  const leadsProj = projectLeads(weeks.map((wk) => wk.leads), w, horizon);
  const weeklyOverall = weeks.filter((wk) => wk.leads > 0).map((wk) => wk.closes / wk.leads);
  const sd = weeks.length >= 3 ? stdDev(weeklyOverall) : null;

  const projection = leadsProj.values.map((leads, h) => {
    const row = { week_ahead: h + 1, leads: round(leads, 1) };
    let vol = leads;
    for (const st of steps) {
      vol = st.rate === null ? null : vol === null ? null : vol * st.rate;
      row[st.to] = round(vol, 1);
    }
    if (chain !== null && sd !== null) {
      row.closes_low = round(leads * Math.max(0, chain - sd), 1);
      row.closes_high = round(leads * Math.min(1, chain + sd), 1);
    }
    if (row.closes !== null && isNum(econ.revenue_per_job)) {
      row.revenue = round(row.closes * econ.revenue_per_job);
      if (isNum(econ.profit_margin)) row.gross_profit = round(row.revenue * econ.profit_margin);
    }
    if (row.closes !== null && isNum(econ.units_per_job)) row.units = round(row.closes * econ.units_per_job, 1);
    return row;
  });
  const totals = { leads: round(leadsProj.values.reduce((a, b) => a + b, 0), 1) };
  for (const f of ['closes', 'revenue', 'gross_profit', 'units']) {
    if (projection.every((r) => isNum(r[f]))) totals[f] = round(projection.reduce((a, r) => a + r[f], 0), f === 'closes' || f === 'units' ? 1 : 2);
  }

  const result = {
    success: true,
    weeks_used: weeks.length,
    weighting,
    currency: currency || null,
    units_label: unitsLabel || null,
    rates,
    unit_economics: Object.fromEntries(Object.entries(econ).map(([k, v]) => [k, round(v, k === 'profit_margin' ? 4 : 2)])),
    lead_trend: {
      method: leadsProj.method,
      weighted_average_leads: round(leadsProj.level, 1),
      slope_per_week: round(leadsProj.slope, 2),
    },
    projection,
    totals,
  };

  // 4a. Reverse funnel: what each stage needs per week to hit the target.
  if (isNum(target) && target > 0) {
    if (steps.some((st) => !st.rate)) {
      warnings.push('A step rate is zero or unknown, so the leads needed for the target cannot be computed.');
    } else {
      const need = { closes: target };
      for (let s = steps.length - 1; s >= 0; s--) need[steps[s].from] = need[steps[s].to] / steps[s].rate;
      const required = Object.fromEntries(stages.map((st) => [st, Math.ceil(need[st] - 1e-9)]));
      result.target = {
        closes_per_week: target,
        required_per_week: required,
        current_weighted_leads: round(leadsProj.level, 1),
        lead_gap_per_week: round(required.leads - leadsProj.level, 1),
      };
      if (isNum(econ.revenue_per_job)) result.target.revenue_per_week = round(target * econ.revenue_per_job);
    }
  }

  // 4b. Quotes already out, closed later by follow-up.
  if (openQuotes && isNum(openQuotes.count) && openQuotes.count > 0) {
    const closeStep = steps.find((st) => st.to === 'closes' && st.from === 'quotes');
    const rate = isNum(followUpRate) ? followUpRate : closeStep?.rate ?? null;
    if (rate === null) {
      warnings.push('Open quotes were given but there is no follow-up close rate and no quotes stage to derive one.');
    } else {
      const expected = openQuotes.count * rate;
      result.open_quotes = {
        count: openQuotes.count,
        close_rate_used: round(rate, 4),
        rate_source: isNum(followUpRate) ? 'follow_up_close_rate' : 'historical_close_rate',
        expected_closes: round(expected, 1),
      };
      if (isNum(openQuotes.value)) result.open_quotes.expected_revenue = round(openQuotes.value * rate);
      else if (isNum(econ.revenue_per_job)) result.open_quotes.expected_revenue = round(expected * econ.revenue_per_job);
    }
  }

  result.assumptions = [
    'Rates are weighted toward recent weeks' + (weighting === 'equal' ? ' (equal weighting was requested).' : '.'),
    "Each week's leads are assumed to convert at these rates within the forecast window; there is no lag model.",
  ];
  if (projection.some((r) => 'closes_low' in r)) {
    result.assumptions.push('closes_low/closes_high use one standard deviation of the weekly lead-to-close rate.');
  }
  result.warnings = warnings;
  return result;
}
