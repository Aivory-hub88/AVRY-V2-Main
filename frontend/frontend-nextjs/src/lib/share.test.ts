// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { share, getShareConfig, type ShareContext } from "./share";
import { interpolate } from "./helpers";

/**
 * Unit tests for per-network share behaviour (Task 5.3).
 *
 * Covers correct channel target per network, best-effort/non-blocking clipboard
 * copy, the native → twitter fallback, the mailto target, native dismissal
 * handling, and native image-file attachment.
 *
 * Requirements: 7.6, 7.7, 7.8, 7.10, 7.11, 13.2
 */

// Subject constant mirrored from share.ts for precise mailto assertions.
const EMAIL_SUBJECT = "Our AI Readiness Score";

// A small but valid base64 PNG payload so dataUrlToFile() can decode it.
const IMAGE_DATA_URL = "data:image/png;base64,iVBORw0KGgo=";

const ctx: ShareContext = {
  score: 75,
  category: "Advanced",
  shareUrl: "https://aivory.id",
};

/** Build the un-encoded message the service would produce for a network. */
function messageFor(network: Parameters<typeof getShareConfig>[0]): string {
  const cfg = getShareConfig(network);
  return interpolate(cfg.template, {
    score: 75,
    category: ctx.category,
    url: ctx.shareUrl,
  });
}

/** Replace the global navigator with a controllable mock for the test. */
function stubNavigator(nav: Partial<Navigator> & Record<string, unknown>) {
  vi.stubGlobal("navigator", nav);
}

describe("share() per-network behaviour", () => {
  let openSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    openSpy = vi
      .spyOn(window, "open")
      .mockImplementation(() => null as unknown as Window);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Correct channel target per network (Req 7.6).
  // -------------------------------------------------------------------------
  describe("correct target per network (Req 7.6)", () => {
    it("linkedin opens the LinkedIn feed intent base", async () => {
      const clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
      stubNavigator({ clipboard });

      const cfg = getShareConfig("linkedin");
      const text = messageFor("linkedin");
      const result = await share("linkedin", ctx);

      expect(openSpy).toHaveBeenCalledTimes(1);
      expect(openSpy).toHaveBeenCalledWith(
        `${cfg.intentUrlBase}${encodeURIComponent(text)}`,
        "_blank",
      );
      expect(result.opened).toBe(true);
      // LinkedIn web composer lacks an image param.
      expect(result.requiresManualImageAttach).toBe(true);
    });

    it("twitter opens the X/Twitter intent with an appended &url=", async () => {
      const clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
      stubNavigator({ clipboard });

      const cfg = getShareConfig("twitter");
      const text = messageFor("twitter");
      const expectedUrl =
        `${cfg.intentUrlBase}${encodeURIComponent(text)}` +
        `&url=${encodeURIComponent(ctx.shareUrl)}`;

      const result = await share("twitter", ctx);

      expect(openSpy).toHaveBeenCalledTimes(1);
      expect(openSpy).toHaveBeenCalledWith(expectedUrl, "_blank");
      expect(expectedUrl).toContain("&url=");
      expect(result.opened).toBe(true);
    });

    it("whatsapp opens the wa.me intent", async () => {
      stubNavigator({ clipboard: { writeText: vi.fn() } });

      const cfg = getShareConfig("whatsapp");
      const text = messageFor("whatsapp");
      const result = await share("whatsapp", ctx);

      expect(openSpy).toHaveBeenCalledTimes(1);
      expect(openSpy).toHaveBeenCalledWith(
        `${cfg.intentUrlBase}${encodeURIComponent(text)}`,
        "_blank",
      );
      expect(cfg.intentUrlBase).toContain("wa.me");
      expect(result.opened).toBe(true);
    });

    it("native calls navigator.share", async () => {
      const shareFn = vi.fn().mockResolvedValue(undefined);
      stubNavigator({ share: shareFn });

      const result = await share("native", ctx);

      expect(shareFn).toHaveBeenCalledTimes(1);
      expect(openSpy).not.toHaveBeenCalled();
      expect(result.opened).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Mailto target (Req 7.6).
  // -------------------------------------------------------------------------
  describe("email mailto target (Req 7.6)", () => {
    it("builds a mailto with encoded subject and body", async () => {
      stubNavigator({ clipboard: { writeText: vi.fn() } });

      const text = messageFor("email");
      const expectedTarget =
        `mailto:?subject=${encodeURIComponent(EMAIL_SUBJECT)}` +
        `&body=${encodeURIComponent(text)}`;

      const result = await share("email", ctx);

      expect(openSpy).toHaveBeenCalledTimes(1);
      expect(openSpy).toHaveBeenCalledWith(expectedTarget);

      const target = openSpy.mock.calls[0][0] as string;
      expect(target.startsWith("mailto:?subject=")).toBe(true);
      // Body decodes back to the interpolated message (score/category/url).
      const body = decodeURIComponent(target.split("&body=")[1]);
      expect(body).toContain("75");
      expect(body).toContain("Advanced");
      expect(body).toContain(ctx.shareUrl);
      expect(result.opened).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Clipboard best-effort + non-blocking failure (Req 7.6, 7.10, 13.2).
  // -------------------------------------------------------------------------
  describe("clipboard best-effort + non-blocking failure (Req 7.6, 7.10, 13.2)", () => {
    it.each(["linkedin", "twitter"] as const)(
      "%s (copyBeforeOpen=true) attempts a clipboard write and reports success",
      async (network) => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        stubNavigator({ clipboard: { writeText } });

        const result = await share(network, ctx);

        expect(writeText).toHaveBeenCalledTimes(1);
        expect(result.copiedToClipboard).toBe(true);
        expect(openSpy).toHaveBeenCalledTimes(1);
      },
    );

    it.each(["linkedin", "twitter"] as const)(
      "%s still opens the channel when the clipboard write REJECTS, with copiedToClipboard=false",
      async (network) => {
        const writeText = vi
          .fn()
          .mockRejectedValue(new Error("clipboard blocked"));
        stubNavigator({ clipboard: { writeText } });

        const result = await share(network, ctx);

        // Clipboard was attempted but failed...
        expect(writeText).toHaveBeenCalledTimes(1);
        expect(result.copiedToClipboard).toBe(false);
        // ...and the share channel still launched (non-blocking).
        expect(openSpy).toHaveBeenCalledTimes(1);
        expect(result.opened).toBe(true);
      },
    );

    it.each(["whatsapp", "email"] as const)(
      "%s (copyBeforeOpen=false) does NOT attempt a clipboard write",
      async (network) => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        stubNavigator({ clipboard: { writeText } });

        const result = await share(network, ctx);

        expect(writeText).not.toHaveBeenCalled();
        expect(result.copiedToClipboard).toBe(false);
        expect(openSpy).toHaveBeenCalledTimes(1);
      },
    );

    it("native (copyBeforeOpen=false) does NOT attempt a clipboard write", async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      const shareFn = vi.fn().mockResolvedValue(undefined);
      stubNavigator({ share: shareFn, clipboard: { writeText } });

      const result = await share("native", ctx);

      expect(writeText).not.toHaveBeenCalled();
      expect(shareFn).toHaveBeenCalledTimes(1);
      expect(result.copiedToClipboard).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Native fallback to twitter when navigator.share is unsupported (Req 7.8).
  // -------------------------------------------------------------------------
  describe("native fallback (Req 7.8)", () => {
    it("falls back to the twitter web channel when navigator.share is undefined", async () => {
      // navigator present but without a `share` function.
      stubNavigator({ clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });

      const cfg = getShareConfig("twitter");
      const text = messageFor("twitter");
      const expectedUrl =
        `${cfg.intentUrlBase}${encodeURIComponent(text)}` +
        `&url=${encodeURIComponent(ctx.shareUrl)}`;

      const result = await share("native", ctx);

      expect(openSpy).toHaveBeenCalledTimes(1);
      expect(openSpy).toHaveBeenCalledWith(expectedUrl, "_blank");
      expect(result.opened).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Native dismissal handling (Req 7.11).
  // -------------------------------------------------------------------------
  describe("native dismissal handling (Req 7.11)", () => {
    it("returns { opened: false } and does NOT re-launch any channel when navigator.share rejects", async () => {
      const shareFn = vi
        .fn()
        .mockRejectedValue(new DOMException("Share canceled", "AbortError"));
      stubNavigator({ share: shareFn });

      const result = await share("native", ctx);

      expect(shareFn).toHaveBeenCalledTimes(1);
      expect(result.opened).toBe(false);
      // No web channel re-launched after dismissal.
      expect(openSpy).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Native success attaches the image file when allowed (Req 7.7).
  // -------------------------------------------------------------------------
  describe("native image attachment (Req 7.7)", () => {
    it("attaches the captured image file when imageDataUrl is provided and canShare allows it", async () => {
      const shareFn = vi.fn().mockResolvedValue(undefined);
      const canShare = vi.fn().mockReturnValue(true);
      stubNavigator({ share: shareFn, canShare });

      const result = await share("native", { ...ctx, imageDataUrl: IMAGE_DATA_URL });

      expect(shareFn).toHaveBeenCalledTimes(1);
      const data = shareFn.mock.calls[0][0] as ShareData & { files?: File[] };
      expect(canShare).toHaveBeenCalled();
      expect(Array.isArray(data.files)).toBe(true);
      expect(data.files).toHaveLength(1);
      expect(data.files![0]).toBeInstanceOf(File);
      expect(data.files![0].name).toBe("aivory-readiness-card.png");
      expect(data.files![0].type).toBe("image/png");
      expect(data.url).toBe(ctx.shareUrl);
      expect(result.opened).toBe(true);
    });

    it("does NOT attach files when canShare disallows them", async () => {
      const shareFn = vi.fn().mockResolvedValue(undefined);
      const canShare = vi.fn().mockReturnValue(false);
      stubNavigator({ share: shareFn, canShare });

      await share("native", { ...ctx, imageDataUrl: IMAGE_DATA_URL });

      const data = shareFn.mock.calls[0][0] as ShareData & { files?: File[] };
      expect(data.files).toBeUndefined();
      expect(data.text).toBeDefined();
      expect(data.url).toBe(ctx.shareUrl);
    });

    it("shares text and URL only when no imageDataUrl is provided", async () => {
      const shareFn = vi.fn().mockResolvedValue(undefined);
      const canShare = vi.fn().mockReturnValue(true);
      stubNavigator({ share: shareFn, canShare });

      await share("native", ctx);

      const data = shareFn.mock.calls[0][0] as ShareData & { files?: File[] };
      expect(data.files).toBeUndefined();
      expect(data.url).toBe(ctx.shareUrl);
    });
  });
});
