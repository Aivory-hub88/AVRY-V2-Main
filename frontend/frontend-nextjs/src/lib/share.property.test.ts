/**
 * Property-based tests for the per-network share dispatcher.
 *
 * Property 4: Share dispatch is single-channel and encoded
 * Validates: Requirements 7.1, 7.3, 7.4, 7.5
 *
 * These tests drive the real `share(network, ctx)` dispatcher against a jsdom
 * environment with `window.open`, `navigator.share`, and
 * `navigator.clipboard.writeText` mocked so that every channel launch can be
 * counted. The `ShareContext` arbitraries deliberately cover the full hostile
 * input space:
 *
 * - `score`: arbitrary doubles/integers including `NaN`, `±Infinity`, and
 *   out-of-range values (the dispatcher clamps to `[0,100]` and rounds).
 * - `category` / `shareUrl`: arbitrary strings including ASCII reserved
 *   characters (`& ? = # / %`), whitespace/newlines, `{token}`-looking text,
 *   quotes, and arbitrary unicode (graphemes, emoji).
 *
 * Asserted properties:
 * - SINGLE CHANNEL (Req 7.1): each `share(network, ctx)` call launches EXACTLY
 *   ONE channel. The total count of `window.open` + `navigator.share`
 *   invocations across every branch equals 1.
 * - ENCODING (Req 7.3): for the `window.open` channels the opened target is
 *   percent-encoded — it contains no raw whitespace and embeds the
 *   `encodeURIComponent`-encoded message text.
 * - requiresManualImageAttach (Req 7.4, 7.5): true exactly for the web
 *   composers lacking an image param (linkedin/twitter/whatsapp) and false for
 *   `native` and `email`.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fc from "fast-check";
import { share, getShareConfig, type ShareNetwork, type ShareContext } from "./share";
import { clamp, interpolate } from "./helpers";

/** Email subject mirrored from the implementation (used for encoding checks). */
const ALL_NETWORKS: ShareNetwork[] = [
  "linkedin",
  "twitter",
  "email",
  "whatsapp",
  "native",
];

/** The networks whose single launched channel is a `window.open` target. */
const OPEN_NETWORKS: ShareNetwork[] = ["linkedin", "twitter", "email", "whatsapp"];

/** Web composers that lack an image parameter → requiresManualImageAttach. */
const MANUAL_ATTACH_NETWORKS: ShareNetwork[] = ["linkedin", "twitter", "whatsapp"];

// ---- Mocks for the channel launchers -------------------------------------

let openSpy: ReturnType<typeof vi.fn>;
let shareFn: ReturnType<typeof vi.fn>;
let clipboardWriteFn: ReturnType<typeof vi.fn>;

/** Enable or disable Web Share API support by (un)defining `navigator.share`. */
function setNativeSupported(supported: boolean): void {
  if (supported) {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      writable: true,
      value: shareFn,
    });
  } else if ("share" in navigator) {
    // Remove the own property so `typeof navigator.share` becomes "undefined".
    delete (navigator as unknown as { share?: unknown }).share;
  }
}

beforeEach(() => {
  openSpy = vi.fn(() => ({}) as Window);
  shareFn = vi.fn(() => Promise.resolve());
  clipboardWriteFn = vi.fn(() => Promise.resolve());

  vi.spyOn(window, "open").mockImplementation(openSpy as unknown as typeof window.open);

  // Best-effort clipboard mock; the dispatcher tolerates its absence anyway.
  try {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      writable: true,
      value: { writeText: clipboardWriteFn },
    });
  } catch {
    /* clipboard is non-configurable in this environment; ignore */
  }
});

afterEach(() => {
  vi.restoreAllMocks();
  if ("share" in navigator) {
    delete (navigator as unknown as { share?: unknown }).share;
  }
});

/** Total channel launches observed for the most recent `share` call. */
function totalLaunches(): number {
  return openSpy.mock.calls.length + shareFn.mock.calls.length;
}

/** Recompute the (un-encoded) interpolated message exactly as the dispatcher. */
function expectedMessage(network: ShareNetwork, ctx: ShareContext): string {
  const cfg = getShareConfig(network);
  const roundedScore = Math.round(clamp(ctx.score, 0, 100));
  return interpolate(cfg.template, {
    score: roundedScore,
    category: ctx.category,
    url: ctx.shareUrl,
  });
}

// ---- Arbitraries ----------------------------------------------------------

/** Scores incl. NaN, ±Infinity, and out-of-range values. */
const scoreArb: fc.Arbitrary<number> = fc.oneof(
  fc.double(),
  fc.integer({ min: -1000, max: 1000 }),
  fc.constantFrom(NaN, Infinity, -Infinity, -50, -1, 0, 1, 50, 99, 100, 101, 150, 1e9),
);

/**
 * Strings covering reserved characters, whitespace/newlines, `{token}`-looking
 * text, quotes, arbitrary unicode (graphemes/emoji), and real URLs.
 */
const trickyStringArb: fc.Arbitrary<string> = fc.oneof(
  fc.string(),
  fc.string({ unit: "grapheme" }),
  fc.webUrl(),
  fc.constantFrom(
    "",
    " ",
    "a b c",
    "line1\nline2",
    "tab\there",
    "& = ? # / %",
    "{url}",
    "{score}",
    "{category}",
    "100%",
    "C++ & Co.",
    "Emerging 🚀",
    "Advanced",
    "你好 世界",
    "reserved:;,/?:@&=+$#",
    '"quoted"',
    "a+b",
    "50% off",
  ),
);

const ctxArb: fc.Arbitrary<ShareContext> = fc.record({
  score: scoreArb,
  category: trickyStringArb,
  shareUrl: trickyStringArb,
});

const networkArb: fc.Arbitrary<ShareNetwork> = fc.constantFrom(...ALL_NETWORKS);

describe("Property 4: Share dispatch is single-channel and encoded", () => {
  describe("single channel (Req 7.1)", () => {
    it("launches exactly one channel for every network and native-support state", async () => {
      await fc.assert(
        fc.asyncProperty(
          networkArb,
          ctxArb,
          fc.boolean(),
          async (network, ctx, nativeSupported) => {
            setNativeSupported(nativeSupported);
            openSpy.mockClear();
            shareFn.mockClear();

            await share(network, ctx);

            // window.open + navigator.share invocations sum to exactly one,
            // covering: intent-url (linkedin/twitter/whatsapp), mailto (email),
            // native (navigator.share when supported), and the twitter web
            // fallback when navigator.share is undefined.
            expect(totalLaunches()).toBe(1);
          },
        ),
        { numRuns: 250 },
      );
    });

    it("uses the twitter web fallback (one window.open, no navigator.share) when native is unsupported", async () => {
      await fc.assert(
        fc.asyncProperty(ctxArb, async (ctx) => {
          setNativeSupported(false);
          openSpy.mockClear();
          shareFn.mockClear();

          await share("native", ctx);

          expect(openSpy).toHaveBeenCalledTimes(1);
          expect(shareFn).toHaveBeenCalledTimes(0);
        }),
        { numRuns: 150 },
      );
    });
  });

  describe("encoding (Req 7.3)", () => {
    it("percent-encodes the opened target with no raw whitespace and embeds the encoded message", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...OPEN_NETWORKS),
          ctxArb,
          async (network, ctx) => {
            setNativeSupported(false);
            openSpy.mockClear();

            await share(network, ctx);

            expect(openSpy).toHaveBeenCalledTimes(1);
            const target = String(openSpy.mock.calls[0][0]);

            // No raw whitespace anywhere in the launched URL: spaces and
            // newlines from the category/url/message must be escaped.
            expect(target).not.toMatch(/\s/);

            // The interpolated message appears in its encodeURIComponent form.
            const encodedMessage = encodeURIComponent(expectedMessage(network, ctx));
            expect(target).toContain(encodedMessage);
          },
        ),
        { numRuns: 250 },
      );
    });

    it("percent-encodes the twitter fallback target when native is unsupported", async () => {
      await fc.assert(
        fc.asyncProperty(ctxArb, async (ctx) => {
          setNativeSupported(false);
          openSpy.mockClear();

          await share("native", ctx);

          expect(openSpy).toHaveBeenCalledTimes(1);
          const target = String(openSpy.mock.calls[0][0]);

          expect(target).not.toMatch(/\s/);
          // The fallback launches the twitter web channel, so the encoded
          // twitter message (and the encoded canonical URL) must be present.
          expect(target).toContain(encodeURIComponent(expectedMessage("twitter", ctx)));
          expect(target).toContain(encodeURIComponent(ctx.shareUrl));
        }),
        { numRuns: 150 },
      );
    });
  });

  describe("requiresManualImageAttach (Req 7.4, 7.5)", () => {
    it("is true exactly for the web composers lacking an image param, false for native and email", async () => {
      await fc.assert(
        fc.asyncProperty(networkArb, ctxArb, async (network, ctx) => {
          // Force native support so the `native` branch reports its own
          // result rather than falling back to the twitter web composer.
          setNativeSupported(true);
          openSpy.mockClear();
          shareFn.mockClear();

          const result = await share(network, ctx);

          const expected = MANUAL_ATTACH_NETWORKS.includes(network);
          expect(result.requiresManualImageAttach).toBe(expected);
        }),
        { numRuns: 250 },
      );
    });
  });
});
