/**
 * Property-based tests for the pricing source-of-truth helpers.
 *
 * Property 2: Pricing fidelity
 * Validates: Requirements 2.5, 2.4
 *
 * `lib/pricing.ts` is the single source of truth for every price and credit
 * value shown on the marketing homepage. These tests pin the two invariants
 * that keep the displayed values from ever drifting from the catalog:
 *
 * 1. ROUND-TRIP (Req 2.5): `formatUsd` is a lossless display encoding of a
 *    positive integer dollar amount — stripping the leading `$` and parsing the
 *    remainder recovers the original number for every `n ∈ ℕ⁺`:
 *      `∀ n ∈ ℕ⁺, parseInt(formatUsd(n).slice(1), 10) === n`.
 *
 * 2. CREDIT-PACK MULTISET / ORDER EQUALITY (Req 2.4): the `{credits, price}`
 *    pairs a section derives for display (by splitting `CREDIT_PACKS` into the
 *    starter group `credits ≤ 1000` and the scale group `credits ≥ 2500`,
 *    preserving published order, then rendering each price via `formatUsd`)
 *    equal `CREDIT_PACKS` exactly — no pack is added, dropped, or re-priced, and
 *    the published order is preserved.
 *
 * Both run under `vitest run` (CI-safe PBT, `npm run test`); `fast-check` is a
 * devDependency.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { formatUsd, CREDIT_PACKS } from "./pricing";

// ---------------------------------------------------------------------------
// Display-derivation model (mirrors the credit-marketplace section, task 9.1)
// ---------------------------------------------------------------------------

/** Starter packs are the small bundles (credits ≤ this bound). */
const STARTER_MAX_CREDITS = 1000;
/** Scale packs are the large bundles (credits ≥ this bound). */
const SCALE_MIN_CREDITS = 2500;

/** A `{credits, price}` pair as derived for display, with its rendered label. */
interface DisplayPack {
  credits: number;
  price: number;
  priceLabel: string;
}

/**
 * Reproduce the credit-marketplace display derivation: partition the packs into
 * the starter (`credits ≤ 1000`) and scale (`credits ≥ 2500`) groups while
 * preserving published order, then concatenate them back in group order and
 * render each price through `formatUsd`. If the derivation is faithful, this
 * sequence must equal `CREDIT_PACKS` pair-for-pair in order.
 */
function deriveDisplayPacks(
  packs: ReadonlyArray<{ credits: number; price: number }>,
): DisplayPack[] {
  const starter = packs.filter((p) => p.credits <= STARTER_MAX_CREDITS);
  const scale = packs.filter((p) => p.credits >= SCALE_MIN_CREDITS);
  return [...starter, ...scale].map((p) => ({
    credits: p.credits,
    price: p.price,
    priceLabel: formatUsd(p.price),
  }));
}

/** Canonical comparison key for multiset equality of `{credits, price}` pairs. */
const packKey = (p: { credits: number; price: number }): string =>
  `${p.credits}:${p.price}`;

describe("Property 2: Pricing fidelity", () => {
  // -------------------------------------------------------------------------
  // Facet 1 — round-trip of formatUsd over ℕ⁺ (Req 2.5)
  // -------------------------------------------------------------------------
  describe("formatUsd round-trip over positive integers (Req 2.5)", () => {
    it("recovers the original amount: parseInt(formatUsd(n).slice(1), 10) === n", () => {
      fc.assert(
        fc.property(fc.integer({ min: 1 }), (n) => {
          const formatted = formatUsd(n);
          // Display contract: a single leading "$" and no decimals.
          expect(formatted.startsWith("$")).toBe(true);
          expect(formatted).toBe(`$${n}`);
          expect(parseInt(formatted.slice(1), 10)).toBe(n);
        }),
      );
    });

    it("holds at the boundary and for large safe integers", () => {
      for (const n of [1, 9, 10, 29, 85, 99, 550, Number.MAX_SAFE_INTEGER]) {
        expect(parseInt(formatUsd(n).slice(1), 10)).toBe(n);
      }
    });
  });

  // -------------------------------------------------------------------------
  // Facet 2 — credit-pack multiset / order equality (Req 2.4)
  // -------------------------------------------------------------------------
  describe("credit-pack display derivation equals CREDIT_PACKS (Req 2.4)", () => {
    it("preserves published order pair-for-pair (no re-ordering, no re-pricing)", () => {
      const derived = deriveDisplayPacks(CREDIT_PACKS);

      // No pack added or dropped.
      expect(derived.length).toBe(CREDIT_PACKS.length);

      // For every index, the derived pair equals the source pair exactly, and
      // its rendered label is the formatUsd of the source price.
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: CREDIT_PACKS.length - 1 }),
          (i) => {
            const source = CREDIT_PACKS[i];
            const shown = derived[i];
            expect(shown.credits).toBe(source.credits);
            expect(shown.price).toBe(source.price);
            expect(shown.priceLabel).toBe(formatUsd(source.price));
          },
        ),
      );
    });

    it("is a multiset equality — exactly the same {credits, price} pairs", () => {
      const derived = deriveDisplayPacks(CREDIT_PACKS);
      const derivedKeys = derived.map(packKey).sort();
      const sourceKeys = CREDIT_PACKS.map(packKey).sort();
      expect(derivedKeys).toEqual(sourceKeys);
    });

    it("matches the published order exactly as a sequence of pairs", () => {
      const derived = deriveDisplayPacks(CREDIT_PACKS).map((p) => ({
        credits: p.credits,
        price: p.price,
      }));
      const source = CREDIT_PACKS.map((p) => ({
        credits: p.credits,
        price: p.price,
      }));
      expect(derived).toEqual(source);
    });
  });
});
