"use client";

/**
 * BadgeActions
 *
 * The score card download control shown beneath the {@link ScoreCardSnapshot}
 * capture region on the Free Diagnostic results view. Clicking "Download score
 * card" captures the snapshot region to a PNG (via {@link useCardCapture}) and
 * triggers a browser download named for the score (Requirement 6.1).
 *
 * The control supports two composition styles:
 * - Self-contained: pass a `cardRef` pointing at the capture region plus the
 *   `score`. BadgeActions calls {@link useCardCapture} itself, builds the file
 *   name with {@link buildCardFileName}, and downloads the result.
 * - Delegated: pass an `onDownload` callback (as in the design example
 *   `<BadgeActions onDownload={onDownload} />`). BadgeActions awaits the
 *   callback and applies the same error handling around it.
 *
 * Error handling (Requirement 13.1): when the capture cannot be produced — a
 * thrown {@link CardCaptureError} from the hook (html2canvas failed to load,
 * the capture region was absent, etc.) or any error from a delegated
 * `onDownload` — the component surfaces a capture-failure error notification
 * and presents a re-attempt control so the user can retry the download.
 *
 * The controls are wrapped in a `.badge-actions` container so the capture hook
 * removes them from the captured image (Requirement 6.4).
 *
 * SSR safety: capture only runs inside a client click handler, so browser
 * globals are never touched during a server render.
 *
 * _Requirements: 6.1, 13.1_
 */

import { useState, type RefObject } from "react";

import {
  buildCardFileName,
  CardCaptureError,
  useCardCapture,
} from "@/lib/hooks/use-card-capture";

/**
 * A read-only ref shape pointing at the Score_Card capture region.
 *
 * Accepting a covariant read-only `current` (rather than `RefObject<HTMLElement>`)
 * lets a composer pass a ref to any concrete element type — e.g. a
 * `RefObject<HTMLDivElement | null>` from `useRef<HTMLDivElement>(null)` — without
 * a type mismatch, while BadgeActions only ever reads `current`.
 */
export interface CaptureRegionRef {
  /** The current capture region element, or `null` when not yet mounted. */
  readonly current: HTMLElement | null;
}

export interface BadgeActionsProps {
  /**
   * Ref to the {@link ScoreCardSnapshot} capture region. Required for the
   * self-contained download path (when `onDownload` is not supplied).
   * Also satisfied by a standard `RefObject<HTMLElement | null>`.
   */
  cardRef?: CaptureRegionRef | RefObject<HTMLElement | null>;
  /**
   * The readiness score, used to build the download file name via
   * {@link buildCardFileName}. Required for the self-contained download path.
   */
  score?: number;
  /**
   * Optional delegated download handler. When provided, it is awaited instead
   * of the component running its own capture, while keeping the same
   * error-notification + retry behavior.
   */
  onDownload?: () => void | Promise<void>;
  /** Optional extra class names applied to the `.badge-actions` container. */
  className?: string;
}

/** User-facing capture-failure message (Requirement 13.1). */
const CAPTURE_ERROR_MESSAGE =
  "We couldn't generate your score card image. Please try again.";

/**
 * The score card download control.
 *
 * @param cardRef - Ref to the capture region (self-contained path).
 * @param score - The readiness score used for the download file name.
 * @param onDownload - Optional delegated download handler.
 * @param className - Optional extra class names for the container.
 */
export function BadgeActions({
  cardRef,
  score,
  onDownload,
  className = "",
}: BadgeActionsProps) {
  const capture = useCardCapture();
  const [isCapturing, setIsCapturing] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleDownload = async (): Promise<void> => {
    setHasError(false);
    setIsCapturing(true);

    try {
      if (onDownload) {
        // Delegated path: run the composer-provided handler.
        await onDownload();
      } else {
        // Self-contained path: capture the snapshot region and download it.
        const cardEl = cardRef?.current ?? null;
        const result = await capture(cardEl, {
          fileName: buildCardFileName(score ?? 0),
        });
        result.download();
      }
    } catch (error) {
      // Req 13.1: surface a capture-failure notification and offer a retry.
      // A thrown CardCaptureError covers the hook's failure paths (html2canvas
      // failed to load, capture region absent, SSR); any other error from a
      // delegated handler is treated the same way for the user.
      const isCaptureFailure = error instanceof CardCaptureError;
      void isCaptureFailure; // both failure kinds map to the same UI surface
      setHasError(true);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className={`badge-actions text-center ${className}`.trim()}>
      <button
        type="button"
        onClick={handleDownload}
        disabled={isCapturing}
        aria-busy={isCapturing}
        className="inline-flex items-center justify-center rounded-full border border-brand-mint/60 bg-transparent px-6 py-2.5 font-semibold text-brand-mint transition-all duration-200 hover:bg-brand-mint hover:text-bg-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isCapturing ? "Preparing…" : "Download score card"}
      </button>

      {hasError && (
        <div
          role="alert"
          className="mt-3 flex flex-col items-center gap-2"
          data-testid="badge-actions-error"
        >
          <p className="text-sm text-error">{CAPTURE_ERROR_MESSAGE}</p>
          <button
            type="button"
            onClick={handleDownload}
            disabled={isCapturing}
            className="text-sm font-semibold text-brand-purple underline-offset-2 transition-colors duration-200 hover:text-brand-mint hover:underline disabled:cursor-not-allowed disabled:opacity-60"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

export default BadgeActions;
