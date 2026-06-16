"use client";

/**
 * ShareBar
 *
 * Per-network share buttons for the Free Diagnostic results experience.
 * Renders one button per configured {@link ShareNetwork} (LinkedIn, X/Twitter,
 * WhatsApp, Email, native) and launches exactly one share channel per click via
 * the {@link share} service.
 *
 * After a share resolves, the bar surfaces two pieces of user feedback derived
 * from the returned {@link ShareResult}:
 *
 * - **Manual image attach (Req 7.9):** when `requiresManualImageAttach` is true
 *   (web composers such as LinkedIn, X, and WhatsApp lack an image parameter),
 *   a visible message instructs the user to manually attach the downloaded
 *   score-card image.
 * - **Clipboard unavailable (Req 13.3):** for networks configured to copy the
 *   message before opening (LinkedIn, X), when the clipboard write was blocked
 *   (`copiedToClipboard === false`), a notice indicates the copy-to-clipboard
 *   step was unavailable so the user can paste/type the message manually.
 *
 * The buttons are wrapped in a `.share-section` container so the Score_Card
 * capture routine (`useCardCapture`) excludes them from the captured PNG,
 * mirroring the `EXCLUDED_CONTROL_SELECTORS` contract (Req 6.4).
 *
 * SSR safety: this is a client component; all browser-global access happens
 * inside the {@link share} service through SSR-safe accessors, and the share
 * logic only runs inside a client click handler.
 *
 * _Requirements: 7.9, 13.3_
 */

import { useState } from "react";

import {
  getShareConfig,
  share,
  type ShareContext,
  type ShareNetwork,
  type ShareResult,
} from "@/lib/share";

/** Default set + display order of share networks when none are provided. */
const DEFAULT_NETWORKS: ShareNetwork[] = [
  "linkedin",
  "twitter",
  "whatsapp",
  "email",
  "native",
];

/** Per-network button label and legacy-matching styling. */
const NETWORK_PRESENTATION: Record<
  ShareNetwork,
  { label: string; className: string }
> = {
  // `.share-btn.linkedin` → bg-[#0a66c2] text-white (design table).
  linkedin: {
    label: "Share on LinkedIn",
    className: "bg-[#0a66c2] text-white hover:bg-[#0959aa]",
  },
  // `.share-btn.twitter` → bg-black text-white (design table).
  twitter: {
    label: "Share on X",
    className: "bg-black text-white hover:bg-[#1a1a1a]",
  },
  // WhatsApp brand green (#25d366).
  whatsapp: {
    label: "Share on WhatsApp",
    className: "bg-[#25d366] text-white hover:bg-[#1ebe5b]",
  },
  // Email composer — neutral brand purple.
  email: {
    label: "Share via Email",
    className: "bg-brand-purple text-white hover:bg-[#4a30a3]",
  },
  // Native device share sheet — brand mint accent.
  native: {
    label: "Share",
    className: "bg-brand-mint text-bg-primary hover:bg-brand-mint-hover",
  },
};

/** Message shown when the user must manually attach the score-card image. */
const MANUAL_ATTACH_MESSAGE =
  "Share text ready. Attach your downloaded score card image to the post before publishing.";

/** Message shown when the clipboard copy step was unavailable. */
const CLIPBOARD_UNAVAILABLE_MESSAGE =
  "Copy to clipboard was unavailable. Paste or type the message manually in the share window.";

/**
 * Optional handler that performs the share for a network and returns its
 * {@link ShareResult}. When provided, it replaces the default
 * `share(network, ctx)` call (e.g. to capture the score-card image first); the
 * returned result still drives the manual-attach / clipboard notices.
 */
export type ShareBarHandler = (
  network: ShareNetwork,
) => Promise<ShareResult> | ShareResult;

export interface ShareBarProps {
  /** Readiness score (clamped/rounded by the share service before use). */
  score: number;
  /** Category label, e.g. "Emerging", "Advanced". */
  category: string;
  /** Canonical marketing URL, e.g. `https://aivory.id`. */
  shareUrl: string;
  /**
   * Optional pre-captured PNG data URL for the native share / manual attach.
   * Takes precedence over {@link ShareBarProps.getImageDataUrl}.
   */
  imageDataUrl?: string;
  /**
   * Optional lazy resolver for the captured score-card image, awaited just
   * before sharing so the native path can attach the captured image without
   * capturing up-front on every render.
   */
  getImageDataUrl?: () => Promise<string | undefined> | string | undefined;
  /** Networks to render, in order. Defaults to all five. */
  networks?: ShareNetwork[];
  /**
   * Optional override for the share action. When provided it is used instead of
   * the built-in `share(network, ctx)` dispatch; its {@link ShareResult} still
   * drives the manual-attach and clipboard notices.
   */
  onShare?: ShareBarHandler;
  /** Optional extra class names applied to the root `.share-section`. */
  className?: string;
}

/** Feedback notices derived from the most recent {@link ShareResult}. */
interface ShareNotices {
  manualAttach: boolean;
  clipboardUnavailable: boolean;
}

const NO_NOTICES: ShareNotices = {
  manualAttach: false,
  clipboardUnavailable: false,
};

/**
 * Resolve the optional captured image data URL, preferring the static
 * `imageDataUrl` prop and falling back to the lazy `getImageDataUrl` resolver.
 */
async function resolveImageDataUrl(
  imageDataUrl: string | undefined,
  getImageDataUrl: ShareBarProps["getImageDataUrl"],
): Promise<string | undefined> {
  if (imageDataUrl) {
    return imageDataUrl;
  }
  if (!getImageDataUrl) {
    return undefined;
  }
  try {
    return await getImageDataUrl();
  } catch {
    // Capture failure must not block the share — proceed without the image.
    return undefined;
  }
}

/**
 * Per-network share buttons with manual-attach and clipboard notices.
 *
 * @param props - The {@link ShareBarProps}.
 */
export function ShareBar({
  score,
  category,
  shareUrl,
  imageDataUrl,
  getImageDataUrl,
  networks = DEFAULT_NETWORKS,
  onShare,
  className = "",
}: ShareBarProps) {
  const [pendingNetwork, setPendingNetwork] = useState<ShareNetwork | null>(
    null,
  );
  const [notices, setNotices] = useState<ShareNotices>(NO_NOTICES);

  const handleShare = async (network: ShareNetwork): Promise<void> => {
    // Reset notices for the new share action.
    setNotices(NO_NOTICES);
    setPendingNetwork(network);

    try {
      let result: ShareResult;
      if (onShare) {
        result = await onShare(network);
      } else {
        const resolvedImage = await resolveImageDataUrl(
          imageDataUrl,
          getImageDataUrl,
        );
        const ctx: ShareContext = {
          score,
          category,
          shareUrl,
          imageDataUrl: resolvedImage,
        };
        result = await share(network, ctx);
      }

      // Req 13.3: a network configured to copy-before-open whose clipboard
      // write was blocked surfaces a clipboard-unavailable notice.
      const copyWasAttempted = getShareConfig(network).copyBeforeOpen;
      const clipboardUnavailable =
        copyWasAttempted && !result.copiedToClipboard;

      setNotices({
        // Req 7.9: instruct the user to manually attach the downloaded image.
        manualAttach: result.requiresManualImageAttach,
        clipboardUnavailable,
      });
    } finally {
      setPendingNetwork(null);
    }
  };

  return (
    <div
      className={`share-section flex flex-col gap-3 ${className}`.trim()}
      data-testid="share-bar"
    >
      <div className="share-buttons flex flex-wrap gap-2">
        {networks.map((network) => {
          const presentation = NETWORK_PRESENTATION[network];
          const isPending = pendingNetwork === network;
          return (
            <button
              key={network}
              type="button"
              onClick={() => handleShare(network)}
              disabled={pendingNetwork !== null}
              aria-busy={isPending}
              aria-label={presentation.label}
              data-network={network}
              className={`inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${presentation.className}`}
            >
              {presentation.label}
            </button>
          );
        })}
      </div>

      {notices.manualAttach && (
        <p
          role="status"
          className="text-sm text-info"
          data-testid="share-manual-attach-notice"
        >
          {MANUAL_ATTACH_MESSAGE}
        </p>
      )}

      {notices.clipboardUnavailable && (
        <p
          role="alert"
          className="text-sm text-warning"
          data-testid="share-clipboard-notice"
        >
          {CLIPBOARD_UNAVAILABLE_MESSAGE}
        </p>
      )}
    </div>
  );
}

export default ShareBar;
