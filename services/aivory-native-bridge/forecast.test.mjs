import { test } from 'node:test';
import assert from 'node:assert/strict';

import { forecastFunnel } from './forecast.mjs';

// Two roofing weeks, full funnel. Expected values worked by hand.
const ROOFING = [
  { label: 'W1', leads: 100, appointments_set: 80, appointments_held: 60, presentations: 50, quotes: 40, closes: 10,
    revenue: 100000, units: 300, cost: 60000 },
  { label: 'W2', leads: 100, appointments_set: 70, appointments_held: 56, presentations: 42, quotes: 30, closes: 12,
    revenue: 120000, units: 360, cost: 78000 },
];

test('step rates, bleed and unit economics from weighted sums', () => {
  const r = forecastFunnel({ weeks: ROOFING, weighting: 'equal' });
  assert.equal(r.success, true);
  assert.equal(r.rates.set_rate, 0.75);
  assert.equal(r.rates.bleed_rate, 0.25);
  assert.equal(r.rates.hold_rate, 0.7733);
  assert.equal(r.rates.presentation_rate, 0.7931);
  assert.equal(r.rates.quotation_rate, 0.7609);
  assert.equal(r.rates.close_rate, 0.3143);
  assert.equal(r.rates.lead_to_close_rate, 0.11);
  assert.deepEqual(r.unit_economics, {
    revenue_per_job: 10000, units_per_job: 30, price_per_unit: 333.33, cost_per_unit: 209.09, profit_margin: 0.3727,
  });
});

test('short history projects flat leads and says so', () => {
  const r = forecastFunnel({ weeks: ROOFING, weighting: 'equal', horizon_weeks: 2 });
  assert.equal(r.lead_trend.method, 'weighted_average');
  assert.equal(r.projection.length, 2);
  assert.equal(r.projection[0].leads, 100);
  assert.equal(r.projection[0].closes, 11);
  assert.equal(r.projection[0].revenue, 110000);
  assert.equal(r.projection[0].gross_profit, 41000);
  assert.equal(r.projection[0].closes_low, undefined); // no range under 3 weeks
  assert.equal(r.totals.closes, 22);
  assert.ok(r.warnings.some((w) => w.includes('Only 2 weeks')));
});

test('reverse funnel works back from a close target', () => {
  const r = forecastFunnel({ weeks: ROOFING, weighting: 'equal', target_closes_per_week: 15 });
  assert.deepEqual(r.target.required_per_week, {
    leads: 137, appointments_set: 103, appointments_held: 80, presentations: 63, quotes: 48, closes: 15,
  });
  assert.equal(r.target.lead_gap_per_week, 37);
  assert.equal(r.target.revenue_per_week, 150000);
});

test('open quotes use the follow-up rate when given, else the historical close rate', () => {
  const given = forecastFunnel({ weeks: ROOFING, open_quotes: { count: 20 }, follow_up_close_rate: 0.25 });
  assert.equal(given.open_quotes.expected_closes, 5);
  assert.equal(given.open_quotes.rate_source, 'follow_up_close_rate');
  assert.equal(given.open_quotes.expected_revenue, 50000);

  const derived = forecastFunnel({ weeks: ROOFING, weighting: 'equal', open_quotes: { count: 70, value: 700000 } });
  assert.equal(derived.open_quotes.rate_source, 'historical_close_rate');
  assert.equal(derived.open_quotes.expected_closes, 22);
  assert.equal(derived.open_quotes.expected_revenue, 220000);
});

test('damped trend on a rising lead series', () => {
  const weeks = [10, 20, 30, 40].map((leads) => ({ leads, closes: leads / 10 }));
  const r = forecastFunnel({ weeks, weighting: 'equal', horizon_weeks: 2 });
  assert.equal(r.lead_trend.method, 'damped_trend');
  assert.equal(r.lead_trend.slope_per_week, 10);
  assert.equal(r.projection[0].leads, 48);
  assert.equal(r.projection[1].leads, 54.4);
  assert.equal(r.projection[1].closes, 5.4);
});

test('recent weighting leans toward the newest week', () => {
  const weeks = [{ leads: 100, closes: 10 }, { leads: 100, closes: 30 }];
  const equal = forecastFunnel({ weeks, weighting: 'equal' });
  const recent = forecastFunnel({ weeks });
  assert.equal(equal.rates.lead_to_close_rate, 0.2);
  assert.equal(recent.rates.lead_to_close_rate, 0.2333); // (10 + 2*30) / (100 + 2*100)
});

test('a stage missing in some weeks is dropped with a warning, the chain skips it', () => {
  const weeks = [
    { leads: 50, quotes: 20, presentations: 25, closes: 5 },
    { leads: 50, quotes: 20, closes: 5 },
  ];
  const r = forecastFunnel({ weeks, weighting: 'equal' });
  assert.equal(r.rates.leads_to_quotes, 0.4);
  assert.equal(r.rates.close_rate, 0.25);
  assert.equal(r.rates.bleed_rate, undefined);
  assert.ok(r.warnings.some((w) => w.includes('"presentations" is missing for 1 of 2')));
});

test('inconsistent counts are flagged, not silently used', () => {
  const r = forecastFunnel({ weeks: [{ label: 'W9', leads: 5, quotes: 8, closes: 2 }, { leads: 10, quotes: 5, closes: 2 }] });
  assert.ok(r.warnings.some((w) => w.startsWith('W9: quotes (8) is higher than leads (5)')));
});

test('leads and closes are required', () => {
  const r = forecastFunnel({ weeks: [{ leads: 10 }, { leads: 12 }] });
  assert.equal(r.success, false);
});

test('a zero rate blocks the reverse funnel instead of dividing by zero', () => {
  const r = forecastFunnel({ weeks: [{ leads: 10, quotes: 0, closes: 0 }, { leads: 10, quotes: 0, closes: 0 }], target_closes_per_week: 3 });
  assert.equal(r.target, undefined);
  assert.ok(r.warnings.some((w) => w.includes('cannot be computed')));
});

test('rate override re-runs the funnel with only that step changed', () => {
  const r = forecastFunnel({
    weeks: ROOFING, weighting: 'equal', horizon_weeks: 1, target_closes_per_week: 15,
    rate_overrides: { close_rate: 0.5 },
  });
  // Baseline untouched: 200 leads * 0.11 / 2 weeks = 11 closes.
  assert.equal(r.projection[0].closes, 11);
  // Same chain with close 22/70 -> 0.5: 11 * 0.5 / (22/70) = 17.5.
  assert.equal(r.scenario.projection[0].closes, 17.5);
  assert.equal(r.scenario.lead_to_close_rate, 0.175);
  assert.equal(r.scenario.change_vs_baseline.closes, 6.5);
  assert.equal(r.scenario.change_vs_baseline.revenue, 65000);
  assert.equal(r.scenario.projection[0].quotes, r.projection[0].quotes); // upstream unchanged
  assert.equal(r.scenario.target_required_per_week.quotes, 30);
});

test('bleed_rate override sets the set rate; unknown names are ignored with a warning', () => {
  const r = forecastFunnel({
    weeks: ROOFING, weighting: 'equal', horizon_weeks: 1,
    rate_overrides: { bleed_rate: 0.1, nonsense_rate: 0.9 },
  });
  assert.deepEqual(r.scenario.rate_overrides, { bleed_rate: 0.1 });
  assert.equal(r.scenario.projection[0].appointments_set, 90);
  assert.ok(r.warnings.some((w) => w.includes('"nonsense_rate"')));
});

test('history totals are plain sums of the input weeks', () => {
  const r = forecastFunnel({ weeks: ROOFING });
  assert.deepEqual(r.history_totals, {
    leads: 200, appointments_set: 150, appointments_held: 116, presentations: 92, quotes: 70, closes: 22,
    revenue: 220000, units: 660, cost: 138000,
  });
  const partial = forecastFunnel({ weeks: [{ leads: 2, closes: 1 }, { leads: 0, closes: 3, revenue: 5 }] });
  assert.deepEqual(partial.history_totals, { leads: 2, closes: 4 }); // revenue missing in a week: left out
});
