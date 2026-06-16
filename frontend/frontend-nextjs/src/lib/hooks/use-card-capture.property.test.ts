/**
 * Property-based tests for the Score_Card capture hook.
 *
 * Property 2: Capture excludes controls and always unmounts
 * Validates: Requirements 6.4, 6.5
 *
 * For arbitrary card DOM structures (varying numbers of `.badge-actions`,
 * `.share-section`, `#badge svg`, and other content, nested to arbitrary
 * depth), after a capture:
 *
 * - The node handed to html2canvas contains ZERO `.badge-actions` and ZERO
 *   `.share-section` elements (Req 6.4), AND
 * - The offscreen clone is removed from `document.body` once the call settles —
 *   on BOTH the success path and the path where html2canvas throws (Req 6.5).
 *   This is asserted by checking that `document.body`'s child count returns to
 *   the pre-capture baseline in both cases.
 *
 * html2canvas is mocked: the mock inspects the cloned node it receives, records
 * how many controls survived (they must be zero) and whether the clone was
 * actually mounted offscreen, then returns a fake canvas exposing `toDataURL`
 * and `toBlob`. The hook's badge pre-rasterization path (`new Image()` +
 * `canvas.getContext("2d")`) is stubbed so it resolves under jsdom instead of
 * hanging on unimplemented image loading.
 */

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import fc from "fast-check";
import { renderHook } from "@testing-library/react";

import { useCardCapture, type CardCaptureFn } from "./use-card-capture";

/**
 * Shared, hoisted state that both the `html2canvas` mock factory and the test
 * body can read/write. `vi.mock` factories are hoisted above imports, so the
 * state they reference must be created with `vi.hoisted`.
 */
const h2c = vi.hoisted(() => ({
  /** Observations recorded by the mock, one entry per html2canvas call. */
  calls: [] as Array<{
    badgeActions: number;
    shareSection: number;
    mountedOffscreen: boolean;
  }>,
  /** When true, the mock throws to exercise the failure code path. */
  shouldThrow: false,
}));

vi.mock("html2canvas", () => ({
  default: vi.fn(async (node: HTMLElement) => {
    // Inspect the clone html2canvas actually receives.
    h2c.calls.push({
      badgeActions: node.querySelectorAll(".badge-actions").length,
      shareSection: node.querySelectorAll(".share-section").length,
      mountedOffscreen: document.body.contains(node),
    });

    if (h2c.shouldThrow) {
      throw new Error("simulated html2canvas failure");
    }

    // Minimal fake canvas exposing just what the hook consumes.
    return {
      width: 810,
      height: 1000,
      toDataURL: (type = "image/png") => `data:${type};base64,AAAA`,
      toBlob: (cb: (b: Blob | null) => void, type = "image/png") =>
        cb(new Blob(["x"], { type })),
    } as unknown as HTMLCanvasElement;
  }),
}));

/**
 * A fake `Image` whose `src` setter resolves `onload` on the next microtask, so
 * the hook's badge rasterization (`loadImage`) settles under jsdom rather than
 * hanging on jsdom's no-op image loading.
 */
class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  width = 360;
  height = 360;
  private _src = "";
  set src(value: string) {
    this._src = value;
    queueMicrotask(() => this.onload?.());
  }
  get src(): string {
    return this._src;
  }
}

let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;

beforeAll(() => {
  vi.stubGlobal("Image", FakeImage);
  // Provide a no-op 2D context so the badge raster swap can proceed quietly
  // instead of emitting jsdom "not implemented" noise.
  originalGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    drawImage: vi.fn(),
  })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
});

afterAll(() => {
  vi.unstubAllGlobals();
  HTMLCanvasElement.prototype.getContext = originalGetContext;
});

// ---------------------------------------------------------------------------
// Arbitrary card DOM structures
// ---------------------------------------------------------------------------

type NodeSpec =
  | { kind: "badge" }
  | { kind: "leaf" }
  | { kind: "content"; children: NodeSpec[] }
  | { kind: "badge-actions"; children: NodeSpec[] }
  | { kind: "share-section"; children: NodeSpec[] };

/**
 * A recursive arbitrary that models card DOM trees containing arbitrary,
 * arbitrarily-nested `.badge-actions` / `.share-section` controls, optional
 * `#badge` SVG badges, and plain content.
 */
const nodeArb: fc.Arbitrary<NodeSpec> = fc.letrec<{ node: NodeSpec }>((tie) => ({
  node: fc.oneof(
    { maxDepth: 4, withCrossShrink: true },
    fc.constant<NodeSpec>({ kind: "badge" }),
    fc.constant<NodeSpec>({ kind: "leaf" }),
    fc.record({
      kind: fc.constant<"content">("content"),
      children: fc.array(tie("node"), { maxLength: 3 }),
    }),
    fc.record({
      kind: fc.constant<"badge-actions">("badge-actions"),
      children: fc.array(tie("node"), { maxLength: 2 }),
    }),
    fc.record({
      kind: fc.constant<"share-section">("share-section"),
      children: fc.array(tie("node"), { maxLength: 2 }),
    }),
  ),
})).node;

/** Top-level card content: a list of (nestable) node specs. */
const cardArb: fc.Arbitrary<NodeSpec[]> = fc.array(nodeArb, { maxLength: 6 });

const BADGE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
  '<circle cx="50" cy="50" r="40" /></svg>';

/** Build a real DOM subtree from a node spec. */
function renderSpec(spec: NodeSpec): HTMLElement {
  switch (spec.kind) {
    case "badge": {
      const el = document.createElement("div");
      el.id = "badge";
      el.innerHTML = BADGE_SVG;
      return el;
    }
    case "leaf": {
      const el = document.createElement("p");
      el.className = "content";
      el.textContent = "content";
      return el;
    }
    case "content":
    case "badge-actions":
    case "share-section": {
      const el = document.createElement("div");
      el.className = spec.kind;
      spec.children.forEach((child) => el.appendChild(renderSpec(child)));
      return el;
    }
  }
}

/** Build the `.score-card` root element holding the generated content. */
function buildCard(specs: NodeSpec[]): HTMLElement {
  const card = document.createElement("div");
  card.className = "score-card";
  specs.forEach((spec) => card.appendChild(renderSpec(spec)));
  return card;
}

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

describe("Property 2: Capture excludes controls and always unmounts", () => {
  function getCapture(): CardCaptureFn {
    const { result } = renderHook(() => useCardCapture());
    return result.current;
  }

  it("excludes .badge-actions/.share-section and unmounts the clone on the success path (Req 6.4, 6.5)", async () => {
    const capture = getCapture();
    h2c.shouldThrow = false;
    let sawControlsInSource = false;

    await fc.assert(
      fc.asyncProperty(cardArb, async (specs) => {
        h2c.calls.length = 0;

        const card = buildCard(specs);
        document.body.appendChild(card);

        const sourceControls =
          card.querySelectorAll(".badge-actions").length +
          card.querySelectorAll(".share-section").length;
        if (sourceControls > 0) sawControlsInSource = true;

        const baseline = document.body.childElementCount;

        try {
          await capture(card, { fileName: "aivory-readiness-card-50.png" });

          // html2canvas was invoked exactly once with a mounted clone.
          expect(h2c.calls).toHaveLength(1);
          const call = h2c.calls[0];
          expect(call.mountedOffscreen).toBe(true);

          // Req 6.4: no controls survive into the captured node.
          expect(call.badgeActions).toBe(0);
          expect(call.shareSection).toBe(0);

          // Req 6.5: the offscreen clone is removed after success.
          expect(document.body.childElementCount).toBe(baseline);
        } finally {
          card.remove();
        }
      }),
      { numRuns: 60 },
    );

    // The suite actually exercised control removal across the generated cases.
    expect(sawControlsInSource).toBe(true);
  });

  it("still excludes controls and unmounts the clone when html2canvas throws (Req 6.4, 6.5)", async () => {
    const capture = getCapture();
    h2c.shouldThrow = true;

    try {
      await fc.assert(
        fc.asyncProperty(cardArb, async (specs) => {
          h2c.calls.length = 0;

          const card = buildCard(specs);
          document.body.appendChild(card);
          const baseline = document.body.childElementCount;

          try {
            await expect(
              capture(card, { fileName: "aivory-readiness-card-50.png" }),
            ).rejects.toThrow();

            // The clone reached html2canvas with controls already stripped.
            expect(h2c.calls).toHaveLength(1);
            const call = h2c.calls[0];
            expect(call.mountedOffscreen).toBe(true);
            expect(call.badgeActions).toBe(0);
            expect(call.shareSection).toBe(0);

            // Req 6.5: the offscreen clone is removed even on the throw path.
            expect(document.body.childElementCount).toBe(baseline);
          } finally {
            card.remove();
          }
        }),
        { numRuns: 60 },
      );
    } finally {
      h2c.shouldThrow = false;
    }
  });
});
