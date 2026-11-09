// Pure helpers for Ivo's `kpi_snapshot` (agents/data-analyst.mjs).
//
// No database, no clock reads unless `today` is omitted: everything here is
// deterministic so it can be unit-tested (kpi.test.mjs). The SQL lives in the
// agent module; this file only decides periods, ratios and honesty flags.
//
// Honesty rules baked in (docs/CERVEAU-HANDOFF-PACKET.md, "Sample honesty"):
//   * a ratio over fewer than SAMPLE_MIN records is flagged directional_only;
//   * a ratio with a zero denominator is null, never 0 and never NaN;
//   * a change against a zero baseline is null ("n/a"), never Infinity.

export const SAMPLE_MIN = 30;
export const MAX_PERIOD_DAYS = 366;
const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDay(s) {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return null;
  const t = Date.parse(`${s}T00:00:00Z`);
  if (Number.isNaN(t)) return null;
  // Date.parse rolls 2026-02-31 over to March; refuse that instead of guessing.
  if (new Date(t).toISOString().slice(0, 10) !== s) return null;
  return t;
}

function fmtDay(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Resolve the reporting window. Dates are UTC calendar days; `end` is
 * INCLUSIVE in what the caller says and returned as `end_exclusive` for SQL
 * (`created_at >= start AND created_at < end_exclusive`).
 *
 * With no dates: the 7 full days ending yesterday. Only one date: an error,
 * because guessing the other half is exactly how a wrong week gets reported.
 */
export function resolvePeriod({ period_start, period_end } = {}, today = new Date()) {
  const hasStart = period_start != null && period_start !== '';
  const hasEnd = period_end != null && period_end !== '';
  if (hasStart !== hasEnd) {
    return { ok: false, error: 'Give both period_start and period_end (YYYY-MM-DD), or neither for the last 7 full days.' };
  }

  let startMs;
  let endMs;
  let defaulted = false;
  if (!hasStart) {
    const todayMs = Date.parse(`${today.toISOString().slice(0, 10)}T00:00:00Z`);
    endMs = todayMs - DAY_MS; // yesterday
    startMs = endMs - 6 * DAY_MS;
    defaulted = true;
  } else {
    startMs = parseDay(period_start);
    endMs = parseDay(period_end);
    if (startMs == null || endMs == null) {
      return { ok: false, error: 'period_start and period_end must be real dates in YYYY-MM-DD form.' };
    }
    if (endMs < startMs) {
      return { ok: false, error: 'period_end is before period_start.' };
    }
  }

  const days = Math.round((endMs - startMs) / DAY_MS) + 1;
  if (days > MAX_PERIOD_DAYS) {
    return { ok: false, error: `Period is ${days} days; the maximum is ${MAX_PERIOD_DAYS}. Ask for a shorter window or run it in parts.` };
  }

  const start = fmtDay(startMs);
  const end = fmtDay(endMs);
  const prevEndMs = startMs - DAY_MS;
  const prevStartMs = prevEndMs - (days - 1) * DAY_MS;
  return {
    ok: true,
    defaulted,
    days,
    start,
    end,
    end_exclusive: fmtDay(endMs + DAY_MS),
    previous: {
      start: fmtDay(prevStartMs),
      end: fmtDay(prevEndMs),
      end_exclusive: fmtDay(prevEndMs + DAY_MS),
    },
  };
}

/** numerator/denominator rounded to 4 places, or null when it cannot be computed. */
export function ratio(numerator, denominator) {
  const n = Number(numerator);
  const d = Number(denominator);
  if (!Number.isFinite(n) || !Number.isFinite(d) || d <= 0) return null;
  return Number((n / d).toFixed(4));
}

/** Win rate over decided deals (won / (won + lost)) with the sample-size flag. */
export function closeRate(won, lost) {
  const w = Number(won) || 0;
  const l = Number(lost) || 0;
  const n = w + l;
  return {
    value: ratio(w, n),
    won: w,
    lost: l,
    n,
    directional_only: n < SAMPLE_MIN,
    note: n === 0
      ? 'No deals were closed won or lost in this period, so there is no close rate.'
      : n < SAMPLE_MIN
        ? `Only ${n} decided deals (under ${SAMPLE_MIN}): directional only, do not pick a winner from it.`
        : null,
  };
}

/** Change of `current` against `previous`: absolute and relative; relative is null on a zero baseline. */
export function change(current, previous) {
  const c = Number(current) || 0;
  const p = Number(previous) || 0;
  return {
    current: c,
    previous: p,
    delta: Number((c - p).toFixed(2)),
    pct: p === 0 ? null : Number((((c - p) / p) * 100).toFixed(1)),
  };
}

/**
 * Collapse [{currency, total}] rows into a { CUR: number } map, rounded.
 * Currencies are never added together: sums across currencies are not
 * comparable (same rule as pipeline_summary).
 */
export function byCurrency(rows, valueKey = 'total') {
  const out = {};
  for (const r of rows || []) {
    if (!r || !r.currency) continue;
    out[r.currency] = Number((Number(r[valueKey]) || 0).toFixed(2));
  }
  return out;
}

/** A fixed-shape metric so every number in the report carries its own source. */
export function metric(value, source, extra = {}) {
  return { value, source, ...extra };
}
