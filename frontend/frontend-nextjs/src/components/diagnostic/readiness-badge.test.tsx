/**
 * Unit tests for {@link ReadinessBadge}.
 *
 * Covers Requirements 5.1–5.4:
 *  - 5.1 Render a non-empty, well-formed SVG inside `#badge`.
 *  - 5.2 Render the CSS fallback (without throwing) when the SVG is absent,
 *        empty, or malformed — including the post-hydration downgrade path
 *        where a string that passes the lenient initial heuristic is rejected
 *        by the strict `DOMParser` check.
 *  - 5.3 Display the score rounded to the nearest integer and clamped to
 *        [0, 100].
 *  - 5.4 Display `0` when the score is `NaN`.
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom/vitest";

import { ReadinessBadge } from "./readiness-badge";

const VALID_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">' +
  '<circle cx="90" cy="90" r="80" fill="#0ae8af" /></svg>';

describe("ReadinessBadge", () => {
  describe("SVG rendering (Req 5.1)", () => {
    it("renders a valid, well-formed SVG inside #badge", async () => {
      render(<ReadinessBadge svg={VALID_SVG} score={72} category="Advanced" />);

      // The strict DOMParser check runs in an effect after hydration, so wait
      // for the SVG branch to settle.
      const badge = await screen.findByTestId("readiness-badge-svg");

      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute("id", "badge");
      // The provided markup is injected, so a real <svg> element exists.
      expect(badge.querySelector("svg")).not.toBeNull();
      expect(document.querySelector("#badge svg")).not.toBeNull();
      // The fallback must not be present when the SVG renders.
      expect(
        screen.queryByTestId("readiness-badge-fallback")
      ).not.toBeInTheDocument();
    });
  });

  describe("Malformed / absent SVG fallback (Req 5.2)", () => {
    it.each([
      { label: "absent svg", svg: undefined },
      { label: "empty string", svg: "" },
      { label: "whitespace only", svg: "   " },
      { label: "unterminated markup", svg: "<svg><circle" },
      { label: "non-svg markup", svg: "<not-svg>" },
    ])(
      "renders the CSS fallback for $label without throwing",
      async ({ svg }) => {
        expect(() =>
          render(<ReadinessBadge svg={svg} score={50} />)
        ).not.toThrow();

        const fallback = await screen.findByTestId("readiness-badge-fallback");
        expect(fallback).toBeInTheDocument();
        expect(fallback).toHaveAttribute("id", "badge");
        expect(
          screen.queryByTestId("readiness-badge-svg")
        ).not.toBeInTheDocument();
      }
    );

    it("downgrades to the fallback after hydration when the SVG is not well-formed", async () => {
      // This markup passes the lenient initial heuristic (opens <svg> and has a
      // </svg> close) but is rejected by the strict DOMParser check because the
      // <circle> element is never closed — it should downgrade to the fallback.
      render(<ReadinessBadge svg="<svg><circle></svg>" score={88} />);

      await waitFor(() => {
        expect(
          screen.getByTestId("readiness-badge-fallback")
        ).toBeInTheDocument();
      });
      expect(
        screen.queryByTestId("readiness-badge-svg")
      ).not.toBeInTheDocument();
    });
  });

  describe("Integer rounding and clamping (Req 5.3)", () => {
    it.each([
      { score: 72.4, expected: "72" },
      { score: 72.6, expected: "73" },
      { score: 49.5, expected: "50" },
      { score: 150, expected: "100" },
      { score: -5, expected: "0" },
    ])("displays score $score as $expected", async ({ score, expected }) => {
      render(<ReadinessBadge score={score} />);

      const fallback = await screen.findByTestId("readiness-badge-fallback");
      expect(within(fallback).getByText(expected)).toBeInTheDocument();
    });
  });

  describe("NaN handling (Req 5.4)", () => {
    it("displays 0 when the score is NaN", async () => {
      render(<ReadinessBadge score={NaN} />);

      const fallback = await screen.findByTestId("readiness-badge-fallback");
      expect(within(fallback).getByText("0")).toBeInTheDocument();
    });
  });
});
