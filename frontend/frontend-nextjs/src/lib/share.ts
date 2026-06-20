/**
 * Per-network social sharing service.
 *
 * Builds prefilled, percent-encoded share messages from a {@link ShareContext}
 * and launches exactly one share channel per call. Each network has its own
 * configuration (message template, launch mode, clipboard behaviour, and
 * image-attach capability) defined in {@link SHARE_CONFIGS}.
 *
 * Design references:
 * - Data model: `SHARE_CONFIGS` / `NetworkShareConfig` in design.md.
 * - Dispatcher: the `share(network, ctx)` pseudocode in design.md.
 *
 * All browser-global access goes through the SSR-safe accessors in
 * `./ssr-safe`, so importing this module never throws during a server render.
 *
 * _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.10, 7.11, 13.2_
 */

import { clamp, interpolate } from "./helpers";
import { getNavigator, getWindow } from "./ssr-safe";

/** A supported social-share destination. */
export type ShareNetwork =
  | "linkedin"
  | "twitter"
  | "email"
  | "whatsapp"
  | "native";

/**
 * The context required to build and launch a share.
 */
export interface ShareContext {
  /** Readiness score (clamped to [0, 100] and rounded before interpolation). */
  score: number;
  /** Category label, e.g. "Emerging", "Advanced". */
  category: string;
  /** Canonical marketing URL, e.g. `https://aivory.uk`. */
  shareUrl: string;
  /** Optional captured PNG data URL for the native share / manual attach. */
  imageDataUrl?: string;
}

/**
 * The outcome of a {@link share} call.
 */
export interface ShareResult {
  /** Whether a share window/intent was launched. */
  opened: boolean;
  /** Whether the message was successfully written to the clipboard. */
  copiedToClipboard: boolean;
  /**
   * Whether the user must manually attach the downloaded score-card image.
   * True for web composers lacking an image parameter (LinkedIn, X, WhatsApp);
   * false for `native` and `email`.
   */
  requiresManualImageAttach: boolean;
}

/**
 * Per-network share configuration ("different settings per network").
 */
export interface NetworkShareConfig {
  /** The network this configuration applies to. */
  network: ShareNetwork;
  /** Message template; `{score}`, `{category}`, `{url}` are interpolated. */
  template: string;
  /** How the share is launched. */
  mode: "intent-url" | "mailto" | "native";
  /** Web intent base (when `mode === "intent-url"`). */
  intentUrlBase?: string;
  /** Whether the network's web composer supports an image param. */
  supportsImageParam: boolean;
  /** Whether to copy the message to the clipboard before opening. */
  copyBeforeOpen: boolean;
}

/**
 * Per-network share configurations, exactly as specified in design.md.
 */
export const SHARE_CONFIGS: NetworkShareConfig[] = [
  {
    network: "linkedin",
    template:
      "I just scored {score}/100 ({category}) on Aivory's Enterprise AI Readiness Assessment! 🚀\nCheck your company's readiness at {url}",
    mode: "intent-url",
    intentUrlBase: "https://www.linkedin.com/feed/?shareActive=true&text=",
    supportsImageParam: false, // → copy text + prompt to attach downloaded PNG
    copyBeforeOpen: true,
  },
  {
    network: "twitter",
    template:
      "I just scored {score}/100 ({category}) on Aivory's Enterprise AI Readiness Assessment! 🚀\nCheck your company's readiness here:",
    mode: "intent-url",
    intentUrlBase: "https://twitter.com/intent/tweet?text=", // &url= appended
    supportsImageParam: false,
    copyBeforeOpen: true,
  },
  {
    network: "whatsapp",
    template:
      "I scored {score}/100 ({category}) on Aivory's AI Readiness Assessment 🚀 Check yours: {url}",
    mode: "intent-url",
    intentUrlBase: "https://wa.me/?text=",
    supportsImageParam: false,
    copyBeforeOpen: false,
  },
  {
    network: "email",
    template:
      'Hi team,\n\nWe scored {score}/100 ("{category}") on Aivory\'s AI Readiness Diagnostic.\nLet\'s review next-step blueprints: {url}\n\nBest regards',
    mode: "mailto",
    supportsImageParam: false,
    copyBeforeOpen: false,
  },
  {
    network: "native",
    template:
      "I scored {score}/100 ({category}) on Aivory's AI Readiness Assessment 🚀 {url}",
    mode: "native", // navigator.share — can include the image file on mobile
    supportsImageParam: true,
    copyBeforeOpen: false,
  },
];

/** Subject line used for the `email` (`mailto:`) channel. */
const EMAIL_SUBJECT = "Our AI Readiness Score";

/** File name applied to the image attached on the native share path. */
const SHARE_IMAGE_FILE_NAME = "aivory-readiness-card.png";

/** O(1) lookup of a network's configuration. */
const SHARE_CONFIG_BY_NETWORK: Record<ShareNetwork, NetworkShareConfig> =
  SHARE_CONFIGS.reduce(
    (acc, cfg) => {
      acc[cfg.network] = cfg;
      return acc;
    },
    {} as Record<ShareNetwork, NetworkShareConfig>,
  );

/**
 * Look up the configuration for a network.
 *
 * @param network - The target share network.
 * @returns The {@link NetworkShareConfig} for that network.
 */
export function getShareConfig(network: ShareNetwork): NetworkShareConfig {
  return SHARE_CONFIG_BY_NETWORK[network];
}

/**
 * Build the interpolated, un-encoded message text for a network.
 *
 * The score is clamped to [0, 100] and rounded to the nearest whole number
 * before interpolation (Requirement 7.2).
 *
 * @param cfg - The network configuration.
 * @param ctx - The share context.
 * @returns The interpolated message text (not yet percent-encoded).
 */
function buildMessage(cfg: NetworkShareConfig, ctx: ShareContext): string {
  const roundedScore = Math.round(clamp(ctx.score, 0, 100));
  return interpolate(cfg.template, {
    score: roundedScore,
    category: ctx.category,
    url: ctx.shareUrl,
  });
}

/**
 * Best-effort, non-blocking clipboard write.
 *
 * Resolves to `true` only when the text was written successfully. Any failure
 * (clipboard unavailable, permission denied, SSR) resolves to `false` without
 * throwing, so the caller can still launch the share channel (Req 7.10, 13.2).
 *
 * @param text - The text to copy.
 * @returns `true` on success, otherwise `false`.
 */
async function tryClipboardWrite(text: string): Promise<boolean> {
  const nav = getNavigator();
  if (!nav || !nav.clipboard || typeof nav.clipboard.writeText !== "function") {
    return false;
  }
  try {
    await nav.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert a data URL into a {@link File} for the native share path.
 *
 * @param dataUrl - An `image/*` data URL.
 * @param fileName - The file name to assign.
 * @returns A {@link File}, or `null` if the data URL could not be parsed.
 */
function dataUrlToFile(dataUrl: string, fileName: string): File | null {
  try {
    const commaIndex = dataUrl.indexOf(",");
    if (commaIndex === -1) {
      return null;
    }
    const header = dataUrl.slice(0, commaIndex);
    const base64 = dataUrl.slice(commaIndex + 1);
    const mimeMatch = /data:([^;]+)/.exec(header);
    const mime = mimeMatch ? mimeMatch[1] : "image/png";

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new File([bytes], fileName, { type: mime });
  } catch {
    return null;
  }
}

/**
 * Whether the current environment supports the Web Share API.
 */
function isNativeShareSupported(nav: Navigator | null): nav is Navigator {
  return !!nav && typeof nav.share === "function";
}

/**
 * Launch the native share dialog (Requirement 7.7, 7.11).
 *
 * Returns a {@link ShareResult} on success. If the native invocation is
 * dismissed or rejected after launch, returns to the result view WITHOUT
 * re-launching any share channel (no fallback) — signalled by `opened: false`.
 */
async function shareNative(
  nav: Navigator,
  ctx: ShareContext,
  text: string,
  copied: boolean,
): Promise<ShareResult> {
  const data: ShareData = { text, url: ctx.shareUrl };

  if (ctx.imageDataUrl) {
    const file = dataUrlToFile(ctx.imageDataUrl, SHARE_IMAGE_FILE_NAME);
    if (file) {
      const files = [file];
      // Only attach files when the platform can share them; otherwise share
      // text + URL alone so the invocation is not rejected on file-incapable
      // devices.
      if (typeof nav.canShare !== "function" || nav.canShare({ files })) {
        (data as ShareData & { files: File[] }).files = files;
      }
    }
  }

  try {
    await nav.share(data);
    return {
      opened: true,
      copiedToClipboard: copied,
      requiresManualImageAttach: false,
    };
  } catch {
    // Dismissed or rejected after launch: return to the result view without
    // re-launching any share channel (Requirement 7.11).
    return {
      opened: false,
      copiedToClipboard: copied,
      requiresManualImageAttach: false,
    };
  }
}

/**
 * Share the diagnostic result to a single network.
 *
 * Launches exactly one share channel (Req 7.1), interpolating the network's
 * template with the rounded score, category, and canonical URL (Req 7.2) and
 * percent-encoding all text/URLs before they reach the channel target
 * (Req 7.3). Clipboard write is attempted only when configured, best-effort and
 * non-blocking (Req 7.6, 7.10, 13.2). For `native`, falls back to the `twitter`
 * web channel when `navigator.share` is unsupported (Req 7.8); when supported
 * but dismissed, no channel is re-launched (Req 7.11).
 *
 * @param network - The target share network.
 * @param ctx - The share context (score, category, canonical URL, optional image).
 * @returns A {@link ShareResult} describing what happened.
 */
export async function share(
  network: ShareNetwork,
  ctx: ShareContext,
): Promise<ShareResult> {
  const cfg = getShareConfig(network);
  const text = buildMessage(cfg, ctx);

  let copied = false;
  if (cfg.copyBeforeOpen) {
    copied = await tryClipboardWrite(`${text} ${ctx.shareUrl}`);
  }

  const win = getWindow();

  switch (cfg.mode) {
    case "native": {
      const nav = getNavigator();
      if (isNativeShareSupported(nav)) {
        return shareNative(nav, ctx, text, copied);
      }
      // Web/desktop fallback: no Web Share API → use the twitter web channel.
      return share("twitter", ctx);
    }

    case "mailto": {
      const target = `mailto:?subject=${encodeURIComponent(
        EMAIL_SUBJECT,
      )}&body=${encodeURIComponent(text)}`;
      win?.open(target);
      return {
        opened: !!win,
        copiedToClipboard: copied,
        requiresManualImageAttach: false,
      };
    }

    case "intent-url":
    default: {
      let url = `${cfg.intentUrlBase ?? ""}${encodeURIComponent(text)}`;
      if (network === "twitter") {
        url += `&url=${encodeURIComponent(ctx.shareUrl)}`;
      }
      win?.open(url, "_blank");
      return {
        opened: !!win,
        copiedToClipboard: copied,
        requiresManualImageAttach: !cfg.supportsImageParam,
      };
    }
  }
}
