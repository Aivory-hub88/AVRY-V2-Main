// @ts-nocheck
/**
 * Integration test for the Free Diagnostic results flow (`DiagnosticResults`).
 *
 * This test renders the full results experience with a mock
 * {@link DiagnosticResult} and asserts that the four results-flow surfaces are
 * composed together and wired correctly (Req 9.1, 9.4):
 *  - the readiness BADGE (`#badge`) is rendered inside the capture region,
 *  - the per-network SHARE BAR (`share-bar`) is rendered with one button per
 *    network,
 *  - the DOWNLOAD control ("Download score card") is rendered, and
 *  - the UPGRADE CTA ("Sign in / Upgrade") is rendered,
 *  - clicking the download button INVOKES the html2canvas capture.
 *
 * It runs under jsdom, which has no real canvas backend, so the browser/canvas
 * surfaces the capture hook touches are stubbed exactly as in
 * `lib/hooks/use-card-capture.test.ts`:
 *  - `html2canvas` is mocked via a hoisted `vi.mock` so the capture's dynamic
 *    import resolves to a controllable mock function,
 *  - `HTMLCanvasElement.prototype.getContext` returns a fake 2D context so the
 *    badge SVG raster swap can run,
 *  - the global `Image` is stubbed so a data-URL `src` resolves `onload`
 *    deterministically, and
 *  - `HTMLAnchorElement.prototype.click` is spied so `download()` does not try
 *    to navigate jsdom.
 *
 * _Requirements: 9.1, 9.4_
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DiagnosticResult } from "@/lib/diagnostic-result";

import { DiagnosticResults } from "./diagnostic-results";

// ---------------------------------------------------------------------------
// Controllable html2canvas mock — the function the capture hook invokes once it
// resolves its dynamic `import("html2canvas")`. Exposed via a getter to mirror
// the module's `default` export shape.
// ---------------------------------------------------------------------------
const h = vi.hoisted(() => ({
  html2canvasMock: vi.fn(),
}));

vi.mock("html2canvas", () => ({
  get default() {
    return h.html2canvasMock;
  },
}));

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
 * next microtask so the badge rasterization completes under jsdom.
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

/** A well-formed badge SVG so the SVG render + raster-swap path is exercised. */
const BADGE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
  '<circle cx="50" cy="50" r="40" fill="#0ae8af" /></svg>';

/** A representative mock diagnostic result. */
const MOCK_RESULT: DiagnosticResult = {
  score: 72,
  category: "Advanced",
  category_explanation: "Your organization is ahead of most peers.",
  insights: ["Strong data foundation", "Clear AI ownership"],
  recommendation: "Invest in an AI system blueprint next.",
  badge_svg: BADGE_SVG,
};

const SHARE_URL = "https://aivory.id";

beforeEach(() => {
  vi.clearAllMocks();

  // Default: html2canvas succeeds with a fake output canvas.
  h.html2canvasMock.mockResolvedValue(makeFakeOutputCanvas());

  // jsdom returns null for getContext; provide a fake 2D context so the badge
  // raster swap can run.
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D);

  // download() creates an anchor and clicks it; prevent jsdom navigation.
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

  vi.stubGlobal("Image", MockImage);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("DiagnosticResults — results flow integration (Req 9.1, 9.4)", () => {
  it("renders the badge, share bar, download control, and upgrade CTA", () => {
    const { container } = render(
      <DiagnosticResults result={MOCK_RESULT} shareUrl={SHARE_URL} />,
    );

    // Readiness badge appears inside the capture region (`#badge`).
    const badge = container.querySelector("#badge");
    expect(badge).not.toBeNull();
    // The capture region itself is present.
    expect(screen.getByTestId("score-card-snapshot")).toBeInTheDocument();

    // Share bar appears with one button per default network.
    const shareBar = screen.getByTestId("share-bar");
    expect(shareBar).toBeInTheDocument();
    for (const label of [
      "Share on LinkedIn",
      "Share on X",
      "Share on WhatsApp",
      "Share via Email",
      "Share",
    ]) {
      expect(
        screen.getByRole("button", { name: label }),
      ).toBeInTheDocument();
    }
    // Per-network buttons carry their `data-network` attribute.
    expect(shareBar.querySelectorAll("[data-network]")).toHaveLength(5);

    // Download control appears.
    expect(
      screen.getByRole("button", { name: "Download score card" }),
    ).toBeInTheDocument();

    // Upgrade CTA appears.
    expect(
      screen.getByRole("button", { name: "Sign in / Upgrade" }),
    ).toBeInTheDocument();
  });

  it("renders the score details derived from the diagnostic result", () => {
    render(<DiagnosticResults result={MOCK_RESULT} shareUrl={SHARE_URL} />);

    expect(screen.getByText("72")).toBeInTheDocument();
    expect(screen.getByText("Advanced")).toBeInTheDocument();
    expect(
      screen.getByText(MOCK_RESULT.recommendation),
    ).toBeInTheDocument();
    for (const insight of MOCK_RESULT.insights) {
      expect(screen.getByText(insight)).toBeInTheDocument();
    }
  });

  it("invokes the html2canvas capture when the download button is clicked", async () => {
    const user = userEvent.setup();
    render(<DiagnosticResults result={MOCK_RESULT} shareUrl={SHARE_URL} />);

    const downloadButton = screen.getByRole("button", {
      name: "Download score card",
    });

    await user.click(downloadButton);

    // The capture ran end-to-end: html2canvas was invoked on the cloned card.
    await waitFor(() => {
      expect(h.html2canvasMock).toHaveBeenCalledTimes(1);
    });

    // No capture-failure notification surfaced (the download succeeded).
    expect(screen.queryByTestId("badge-actions-error")).not.toBeInTheDocument();
  });
});
