// @ts-nocheck
/**
 * Unit tests for `useCardCapture` — html2canvas-based Score_Card capture.
 *
 * These tests run under jsdom. jsdom does not implement a real canvas backend,
 * so the browser/canvas surfaces the hook touches are stubbed:
 *  - `html2canvas` is mocked via `vi.mock` (a controllable hoisted mock fn whose
 *    module `default` can be toggled to simulate a chunk-load failure).
 *  - `HTMLCanvasElement.prototype.getContext` is stubbed to return a fake 2D
 *    context so the badge raster swap can run (jsdom returns null otherwise).
 *  - The global `Image` is stubbed so a data-URL `src` resolves `onload`
 *    deterministically (jsdom never fires load events for data URLs).
 *  - The html2canvas output canvas is a fake object exposing `toDataURL` and
 *    `toBlob`, which jsdom canvases lack.
 *
 * Covered acceptance criteria: 6.2 (dynamic import), 6.6 (filename derivation),
 * 6.7 / 13.1 (load-failure abort), 6.9 (absent-card failure), with supporting
 * coverage for 6.3 / 6.8 (SVG raster swap / no-swap) and 6.4 (controls removed).
 */

import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildCardFileName,
  CardCaptureError,
  useCardCapture,
  type CardCaptureResult,
} from "./use-card-capture";

// ---------------------------------------------------------------------------
// Controllable html2canvas mock.
//
// `html2canvasMock` is the function the hook invokes once it resolves the
// dynamic import. The module's `default` is exposed via a getter so that
// flipping `state.importShouldFail` makes accessing it throw — modeling a
// dynamic-import / chunk-load failure that the hook surfaces as a
// `CardCaptureError` (Req 6.7, 13.1).
// ---------------------------------------------------------------------------
const h = vi.hoisted(() => ({
  html2canvasMock: vi.fn(),
  state: { importShouldFail: false },
}));

vi.mock("html2canvas", () => ({
  get default() {
    if (h.state.importShouldFail) {
      throw new Error("simulated html2canvas chunk load failure");
    }
    return h.html2canvasMock;
  },
}));

// Captures the node html2canvas was asked to rasterize, for assertions.
let capturedNode: HTMLElement | null = null;

/** A fake html2canvas output canvas exposing the APIs the hook reads. */
function makeFakeOutputCanvas() {
  return {
    toDataURL: vi.fn(() => "data:image/png;base64,FAKEPNGDATA"),
    toBlob: (cb: (blob: Blob | null) => void) => {
      cb(new Blob(["fake-png-bytes"], { type: "image/png" }));
    },
  } as unknown as HTMLCanvasElement;
}

/**
 * A deterministic `Image` replacement: assigning `src` resolves `onload` on the
 * next microtask so the badge rasterization can complete under jsdom.
 */
class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  width = 0;
  height = 0;
  private _src = "";

  set src(value: string) {
    this._src = value;
    Promise.resolve().then(() => this.onload?.());
  }
  get src(): string {
    return this._src;
  }
}

/** Build a Score_Card DOM region, optionally containing a `#badge svg`. */
function buildCard({ withSvg }: { withSvg: boolean }): HTMLElement {
  const card = document.createElement("div");
  card.className = "score-card";

  const badge = document.createElement("div");
  badge.id = "badge";
  if (withSvg) {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 100 100");
    const circle = document.createElementNS(svgNS, "circle");
    circle.setAttribute("cx", "50");
    circle.setAttribute("cy", "50");
    circle.setAttribute("r", "40");
    svg.appendChild(circle);
    badge.appendChild(svg);
  }
  card.appendChild(badge);

  // Controls that must be excluded from the captured image (Req 6.4).
  const actions = document.createElement("div");
  actions.className = "badge-actions";
  card.appendChild(actions);

  const share = document.createElement("div");
  share.className = "share-section";
  card.appendChild(share);

  document.body.appendChild(card);
  return card;
}

/** Render the hook and return its stable capture function. */
function getCapture() {
  const { result } = renderHook(() => useCardCapture());
  return result.current;
}

beforeEach(() => {
  vi.clearAllMocks();
  capturedNode = null;
  h.state.importShouldFail = false;

  // Default: html2canvas succeeds and records the node it received.
  h.html2canvasMock.mockImplementation(async (node: HTMLElement) => {
    capturedNode = node;
    return makeFakeOutputCanvas();
  });

  // jsdom returns null for getContext; provide a fake 2D context.
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D);

  vi.stubGlobal("Image", MockImage);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("buildCardFileName (Req 6.6 — filename derivation)", () => {
  it.each([
    { score: 72.4, expected: "aivory-readiness-card-72.png" },
    { score: 72.6, expected: "aivory-readiness-card-73.png" },
    { score: 150, expected: "aivory-readiness-card-100.png" },
    { score: -5, expected: "aivory-readiness-card-0.png" },
    { score: NaN, expected: "aivory-readiness-card-0.png" },
    { score: 0, expected: "aivory-readiness-card-0.png" },
    { score: 100, expected: "aivory-readiness-card-100.png" },
    { score: 49.5, expected: "aivory-readiness-card-50.png" },
  ])(
    "rounds and clamps $score to $expected",
    ({ score, expected }) => {
      expect(buildCardFileName(score)).toBe(expected);
    },
  );
});

describe("useCardCapture", () => {
  it("dynamically imports and invokes html2canvas when capture runs (Req 6.2)", async () => {
    const capture = getCapture();
    const card = buildCard({ withSvg: false });

    const res = await capture(card, { fileName: buildCardFileName(80) });

    expect(h.html2canvasMock).toHaveBeenCalledTimes(1);
    expect(res.dataUrl).toContain("data:image/png");
    expect(res.blob).toBeInstanceOf(Blob);
  });

  it("download() triggers a download using the derived filename (Req 6.6)", async () => {
    let downloadName: string | undefined;
    let downloadHref: string | undefined;
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
      function (this: HTMLAnchorElement) {
        downloadName = this.download;
        downloadHref = this.href;
      },
    );

    const capture = getCapture();
    const card = buildCard({ withSvg: false });
    const fileName = buildCardFileName(72.4);

    const res: CardCaptureResult = await capture(card, { fileName });
    res.download();

    expect(fileName).toBe("aivory-readiness-card-72.png");
    expect(downloadName).toBe(fileName);
    expect(downloadHref).toContain("data:image/png");
  });

  it("swaps a serializable #badge svg for a <canvas> before capture (Req 6.3, 6.4)", async () => {
    const capture = getCapture();
    const card = buildCard({ withSvg: true });

    await capture(card, { fileName: buildCardFileName(60) });

    expect(capturedNode).not.toBeNull();
    // The badge SVG was pre-rasterized: no svg remains, a canvas took its place.
    expect(capturedNode!.querySelector("#badge svg")).toBeNull();
    expect(capturedNode!.querySelector("#badge canvas")).not.toBeNull();
    // Controls were excluded from the captured node (Req 6.4).
    expect(capturedNode!.querySelector(".badge-actions")).toBeNull();
    expect(capturedNode!.querySelector(".share-section")).toBeNull();
    // The capture operates on a clone; the original card is left intact.
    expect(card.querySelector("#badge svg")).not.toBeNull();
  });

  it("proceeds without a raster swap when no badge svg is present (Req 6.8)", async () => {
    const capture = getCapture();
    const card = buildCard({ withSvg: false });

    await capture(card, { fileName: buildCardFileName(40) });

    expect(h.html2canvasMock).toHaveBeenCalledTimes(1);
    expect(capturedNode).not.toBeNull();
    expect(capturedNode!.querySelector("#badge svg")).toBeNull();
    expect(capturedNode!.querySelector("#badge canvas")).toBeNull();
  });

  it("throws CardCaptureError and never calls html2canvas for an absent card (Req 6.9)", async () => {
    const capture = getCapture();

    await expect(
      capture(null, { fileName: buildCardFileName(50) }),
    ).rejects.toBeInstanceOf(CardCaptureError);

    expect(h.html2canvasMock).not.toHaveBeenCalled();
  });

  it("throws CardCaptureError when html2canvas fails to load on both attempts (Req 6.7, 13.1)", async () => {
    h.state.importShouldFail = true;

    const capture = getCapture();
    const card = buildCard({ withSvg: false });

    await expect(
      capture(card, { fileName: buildCardFileName(90) }),
    ).rejects.toBeInstanceOf(CardCaptureError);

    // Aborted before capture — the capture function was never invoked.
    expect(h.html2canvasMock).not.toHaveBeenCalled();
  });
});
