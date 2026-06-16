/**
 * Property-based tests for score bounds.
 *
 * Property 3: Score bounds
 * Validates: Requirements 5.3, 5.4, 12.2
 *
 * These tests exercise the two functions responsible for keeping a readiness
 * score inside its inclusive range:
 *
 * - `clamp(v, 0, 100)` (`./helpers`): for ANY numeric input — including very
 *   large/small magnitudes, negatives, fractionals, `Infinity`, `-Infinity`,
 *   and `NaN` — the result is always within [0, 100], with `NaN` mapping to the
 *   lower bound 0 (Req 5.4, 12.2).
 *
 * - `normalizeDiagnosticResult(raw).score` (`./diagnostic-result`): for ANY raw
 *   input shape (numbers, strings, null, undefined, arrays, objects, and fully
 *   arbitrary values via `fc.anything()`), the normalized score is always a
 *   real number within [0, 100] (Req 12.1, 12.2).
 *
 * The tests also pin the boundary behaviour: anything below 0 clamps to 0 and
 * anything above 100 clamps to 100 (Req 5.3, 12.2). They assert exactly what
 * the code does — `normalizeDiagnosticResult` clamps but does NOT round, so the
 * bound [0, 100] is asserted rather than integer-ness (rounding to an integer
 * is the badge's responsibility).
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { clamp } from "./helpers";
import { normalizeDiagnosticResult } from "./diagnostic-result";

/**
 * Arbitrary covering the full real-number input space plus the non-finite
 * doubles. `fc.double({ noNaN: false })` includes `NaN`, `Infinity`, and
 * `-Infinity`; the explicit `constantFrom` guarantees those extremes (and a
 * few representative magnitudes) are always sampled.
 */
const numericArb: fc.Arbitrary<number> = fc.oneof(
  fc.double({ noNaN: false }),
  fc.integer(),
  fc.constantFrom(
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.MAX_VALUE,
    -Number.MAX_VALUE,
    Number.MIN_VALUE,
    Number.MAX_SAFE_INTEGER,
    Number.MIN_SAFE_INTEGER,
    0,
    -0,
    0.5,
    99.999,
    100.0001,
    -0.0001,
    1e308,
    -1e308,
  ),
);

/**
 * Arbitrary for the raw payload handed to `normalizeDiagnosticResult`. Mixes
 * fully-arbitrary values with objects that carry a `score` field of varied type
 * (number, non-finite, string, null, undefined, object) so the score-coercion
 * path is exercised densely, not just incidentally.
 */
const rawArb: fc.Arbitrary<unknown> = fc.oneof(
  fc.anything(),
  fc.constantFrom(null, undefined),
  numericArb,
  fc.string(),
  fc.record({ score: numericArb }),
  fc.record({
    score: fc.oneof(
      numericArb,
      fc.string(),
      fc.constantFrom(null, undefined),
      fc.object(),
      fc.boolean(),
    ),
    category: fc.anything(),
    insights: fc.anything(),
  }),
);

describe("Property 3: Score bounds", () => {
  describe("clamp(v, 0, 100) keeps any numeric input within [0, 100]", () => {
    it("always returns a value in the inclusive range [0, 100] (Req 5.4, 12.2)", () => {
      fc.assert(
        fc.property(numericArb, (v) => {
          const result = clamp(v, 0, 100);
          // The result is always a real number in [0, 100] — never NaN.
          expect(Number.isNaN(result)).toBe(false);
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThanOrEqual(100);
        }),
      );
    });

    it("maps NaN to the lower bound 0 (Req 5.4)", () => {
      fc.assert(
        fc.property(fc.constant(Number.NaN), (v) => {
          expect(clamp(v, 0, 100)).toBe(0);
        }),
      );
    });

    it("clamps any value below 0 to 0 (Req 5.3, 12.2)", () => {
      const belowArb = fc.oneof(
        fc.double({ min: -Number.MAX_VALUE, max: -Number.MIN_VALUE, noNaN: true }),
        fc.constantFrom(
          Number.NEGATIVE_INFINITY,
          -Number.MAX_VALUE,
          -1,
          -0.0001,
          -1e308,
        ),
      );
      fc.assert(
        fc.property(belowArb, (v) => {
          expect(clamp(v, 0, 100)).toBe(0);
        }),
      );
    });

    it("clamps any value above 100 to 100 (Req 5.3, 12.2)", () => {
      const aboveArb = fc.oneof(
        fc.double({ min: 100.0000001, max: Number.MAX_VALUE, noNaN: true }),
        fc.constantFrom(
          Number.POSITIVE_INFINITY,
          Number.MAX_VALUE,
          101,
          100.0001,
          1e308,
        ),
      );
      fc.assert(
        fc.property(aboveArb, (v) => {
          expect(clamp(v, 0, 100)).toBe(100);
        }),
      );
    });

    it("returns in-range finite values unchanged (Req 12.2)", () => {
      fc.assert(
        fc.property(fc.double({ min: 0, max: 100, noNaN: true }), (v) => {
          expect(clamp(v, 0, 100)).toBe(v);
        }),
      );
    });
  });

  describe("normalizeDiagnosticResult(raw).score is always within [0, 100]", () => {
    it("produces a real number in the inclusive range [0, 100] for arbitrary raw input (Req 12.1, 12.2)", () => {
      fc.assert(
        fc.property(rawArb, (raw) => {
          const { score } = normalizeDiagnosticResult(raw);
          expect(typeof score).toBe("number");
          expect(Number.isNaN(score)).toBe(false);
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(100);
        }),
      );
    });

    it("clamps a below-0 numeric score to 0 (Req 5.3, 12.2)", () => {
      const belowArb = fc.oneof(
        fc.double({ min: -Number.MAX_VALUE, max: -Number.MIN_VALUE, noNaN: true }),
        fc.constantFrom(Number.NEGATIVE_INFINITY, -1, -1e308),
      );
      fc.assert(
        fc.property(belowArb, (score) => {
          expect(normalizeDiagnosticResult({ score }).score).toBe(0);
        }),
      );
    });

    it("clamps an above-100 numeric score to 100 (Req 5.3, 12.2)", () => {
      const aboveArb = fc.oneof(
        fc.double({ min: 100.0000001, max: Number.MAX_VALUE, noNaN: true }),
        fc.constantFrom(Number.POSITIVE_INFINITY, 101, 1e308),
      );
      fc.assert(
        fc.property(aboveArb, (score) => {
          expect(normalizeDiagnosticResult({ score }).score).toBe(100);
        }),
      );
    });

    it("defaults absent / null / non-numeric / NaN scores to 0 (Req 12.1, 12.2)", () => {
      const nonNumericArb = fc.oneof(
        fc.constantFrom(null, undefined, Number.NaN),
        fc.string(),
        fc.boolean(),
        fc.object(),
        fc.array(fc.anything()),
      );
      fc.assert(
        fc.property(nonNumericArb, (score) => {
          // `{ score }` carries a non-numeric value; absent is covered by `{}`.
          expect(normalizeDiagnosticResult({ score }).score).toBe(0);
        }),
      );
      expect(normalizeDiagnosticResult({}).score).toBe(0);
    });

    it("preserves an in-range finite numeric score unchanged (Req 12.2)", () => {
      fc.assert(
        fc.property(fc.double({ min: 0, max: 100, noNaN: true }), (score) => {
          expect(normalizeDiagnosticResult({ score }).score).toBe(score);
        }),
      );
    });
  });
});
