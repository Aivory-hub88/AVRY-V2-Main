// @ts-nocheck
/**
 * Homepage Section Presence / Order Tests (Task 13.2)
 *
 * Property 1: Section completeness & order
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4
 *
 * Static React Testing Library / jsdom assertions (CI-safe, no browser) that pin
 * the structural parity contract of the homepage route (`page.tsx`):
 *
 *  - Req 1.1 — ALL nine legacy regions render (navbar, hero, features, pricing,
 *              subscription, credit-marketplace, privacy, strategy, footer).
 *  - Req 1.2 — the nine regions appear in the DOM in LEGACY_SECTION_ORDER, i.e.
 *              their flattened document index is STRICTLY INCREASING.
 *  - Req 1.3 — each region is reachable through a stable, queryable identifier
 *              (landmark element or `id`) without a browser.
 *  - Req 1.4 — if any region were absent, the lookup returns `null` and the
 *              completeness assertion fails the suite.
 *
 * `page.tsx` is a (synchronous) server component composing client components;
 * in jsdom the `'use client'` directives are no-ops, so it renders directly.
 * `next/navigation` (`useRouter`), `@/lib/auth`, `@/lib/payment`, and
 * `next/image` (used by `BrandLogo`) are mocked so the composed client
 * components render in isolation. `@/lib/pricing` is intentionally NOT mocked so
 * the real catalog backs the price-rendering sections. `next/link` is mocked in
 * the shared test setup.
 */

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import fc from "fast-check";

// ---------------------------------------------------------------------------
// Mocks (hoisted so factories can reference the spies safely)
// ---------------------------------------------------------------------------

const { pushMock, isAuthenticatedMock, logoutMock, openPaymentModalMock } =
  vi.hoisted(() => ({
    pushMock: vi.fn(),
    isAuthenticatedMock: vi.fn<[], boolean>(() => false),
    logoutMock: vi.fn(),
    openPaymentModalMock: vi.fn(() => Promise.resolve()),
  }));

// next/navigation — navbar + price sections read useRouter().push.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

// @/lib/auth — navbar auth state.
vi.mock("@/lib/auth", () => ({
  isAuthenticated: isAuthenticatedMock,
  logout: logoutMock,
}));

// @/lib/payment — pricing/subscription/credit sections + the Midtrans loader.
vi.mock("@/lib/payment", () => ({
  openPaymentModal: (...args: unknown[]) => openPaymentModalMock(...args),
  loadMidtransSnap: vi.fn(() => Promise.resolve()),
  PAYMENT_CONFIG: { products: { BLUEPRINT: "ai_blueprint" } },
}));

// next/image — BrandLogo renders the SVG via next/image; render a plain <img>
// and drop non-DOM props (priority/unoptimized/width/height) to avoid warnings.
vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    className,
  }: {
    src: string;
    alt: string;
    className?: string;
  }) => React.createElement("img", { src, alt, className }),
}));

import Home from "./page";

// ---------------------------------------------------------------------------
// Region model — the nine stable identifiers in legacy order (Req 1.3)
// ---------------------------------------------------------------------------

/**
 * The ordered region list and, for each, how to locate its stable queryable
 * identifier in the rendered DOM (landmark element or `id`). The order here is
 * LEGACY_SECTION_ORDER from the design.
 */
const LEGACY_SECTION_ORDER: ReadonlyArray<{
  id: string;
  find: (container: HTMLElement) => Element | null;
}> = [
  { id: "navbar", find: (c) => c.querySelector("nav") },
  { id: "hero", find: (c) => c.querySelector("section.hero") },
  { id: "features", find: (c) => c.querySelector("#features") },
  { id: "pricing", find: (c) => c.querySelector("#pricing-section") },
  { id: "subscription", find: (c) => c.querySelector("#subscription-section") },
  {
    id: "credit-marketplace",
    find: (c) => c.querySelector("#credit-marketplace-section"),
  },
  { id: "privacy", find: (c) => c.querySelector("#privacy-section") },
  { id: "strategy", find: (c) => c.querySelector("#strategy-cta") },
  { id: "footer", find: (c) => c.querySelector("footer") },
];

/**
 * Flatten the rendered tree into a document-order node list and return each
 * region's index within it. A region absent from the DOM yields `-1`.
 */
function regionDomIndices(container: HTMLElement): Array<{ id: string; index: number }> {
  const allNodes = Array.from(container.querySelectorAll("*"));
  return LEGACY_SECTION_ORDER.map(({ id, find }) => {
    const el = find(container);
    return { id, index: el ? allNodes.indexOf(el) : -1 };
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  isAuthenticatedMock.mockReturnValue(false);
});

describe("Property 1: Section completeness & order", () => {
  // -------------------------------------------------------------------------
  // Req 1.1 / 1.3 — all nine regions present and queryable
  // -------------------------------------------------------------------------
  describe("completeness (Req 1.1, 1.3, 1.4)", () => {
    it("renders all nine legacy regions, each reachable by a stable identifier", () => {
      const { container } = render(<Home />);

      for (const { id, find } of LEGACY_SECTION_ORDER) {
        const el = find(container);
        // Req 1.4: a missing region -> null -> this assertion fails the suite.
        expect(el, `region "${id}" must be present in the DOM`).not.toBeNull();
      }
    });

    it("exposes exactly the nine expected regions (no region resolves to -1)", () => {
      const { container } = render(<Home />);
      const indices = regionDomIndices(container);

      expect(indices).toHaveLength(9);
      for (const { id, index } of indices) {
        expect(index, `region "${id}" must be locatable in the DOM walk`).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // -------------------------------------------------------------------------
  // Req 1.2 — DOM order matches LEGACY_SECTION_ORDER (strictly increasing index)
  // -------------------------------------------------------------------------
  describe("order (Req 1.2)", () => {
    it("places the nine regions in strictly increasing DOM index per LEGACY_SECTION_ORDER", () => {
      const { container } = render(<Home />);
      const indices = regionDomIndices(container).map((r) => r.index);

      // Strictly increasing: each region begins after the previous one.
      for (let i = 1; i < indices.length; i++) {
        expect(
          indices[i],
          `${LEGACY_SECTION_ORDER[i].id} must come after ${LEGACY_SECTION_ORDER[i - 1].id}`,
        ).toBeGreaterThan(indices[i - 1]);
      }
    });

    it("orders every region pair (i < j) as region[i] before region[j] (compareDocumentPosition)", () => {
      const { container } = render(<Home />);
      const elements = LEGACY_SECTION_ORDER.map(({ id, find }) => {
        const el = find(container);
        expect(el, `region "${id}" must be present`).not.toBeNull();
        return el as Element;
      });

      // Property: for ANY ordered pair of region indices i < j, the earlier
      // region precedes the later one in document order.
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: elements.length - 1 }),
          fc.integer({ min: 0, max: elements.length - 1 }),
          (a, b) => {
            const i = Math.min(a, b);
            const j = Math.max(a, b);
            if (i === j) return; // trivial
            const position = elements[i].compareDocumentPosition(elements[j]);
            // region[j] must FOLLOW region[i] in the document.
            expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
          },
        ),
      );
    });
  });
});
