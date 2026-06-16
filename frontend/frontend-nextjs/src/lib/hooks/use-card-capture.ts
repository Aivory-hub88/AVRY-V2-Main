"use client";

/**
 * useCardCapture — html2canvas-based Score Card capture (SVG-safe).
 *
 * Captures the Score_Card DOM region into a PNG image, returning both a
 * data URL and a `Blob`, plus a `download()` helper that triggers a browser
 * download. The capture is SVG-safe: a serializable badge SVG is pre-rasterized
 * to a `<canvas>` before capture, because html2canvas renders inline SVG
 * unreliably.
 *
 * Behavior (mirrors the design pseudocode `captureScoreCard`):
 * - Dynamically imports `html2canvas` only when a capture is triggered, with one
 *   automatic retry (two total attempts). If both attempts fail, the capture is
 *   aborted without producing a file and a {@link CardCaptureError} is thrown
 *   so the caller can surface a capture-failure indication (Req 6.2, 6.7, 13.1).
 * - Clones the card element, pre-rasterizes a serializable `#badge svg` to a
 *   raster canvas (Req 6.3); when the badge SVG is absent or not serializable,
 *   the capture proceeds WITHOUT the raster swap (Req 6.8).
 * - Removes the `.badge-actions` and `.share-section` controls from the clone so
 *   they are excluded from the captured image (Req 6.4).
 * - Mounts the clone offscreen and ALWAYS removes it in a `finally` block, on
 *   success or failure (Req 6.5).
 * - Produces a PNG as both a `dataUrl` and a `blob` (Req 6.1).
 * - If the Score_Card region is absent (null element), the capture is not
 *   attempted and a {@link CardCaptureError} is thrown (Req 6.9).
 *
 * SSR-safe: the capture only touches browser globals after it is invoked from a
 * client click handler; it throws a {@link CardCaptureError} if invoked during a
 * server render.
 *
 * _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 13.1_
 */

import { useCallback } from "react";

import { clamp } from "@/lib/helpers";
import { isServerRender } from "@/lib/ssr-safe";

/** Default presentation width (px) of the captured card. */
export const DEFAULT_CARD_WIDTH = 810;
/** Default capture scale (2 ≈ retina). */
export const DEFAULT_CARD_SCALE = 2;
/** Default background color behind the captured card. */
export const DEFAULT_CARD_BACKGROUND_COLOR = "#070708";

/** Size (px) of the square raster canvas the badge SVG is drawn into. */
const BADGE_RASTER_SIZE = 360;

/** Selectors removed from the clone so controls never appear in the capture. */
const EXCLUDED_CONTROL_SELECTORS = [".badge-actions", ".share-section"];

/**
 * Options controlling a single Score_Card capture.
 *
 * Matches the `CardCaptureOptions` shape from the design document.
 */
export interface CardCaptureOptions {
  /** Presentation width in px. Defaults to {@link DEFAULT_CARD_WIDTH}. */
  width?: number;
  /** Capture scale. Defaults to {@link DEFAULT_CARD_SCALE}. */
  scale?: number;
  /** Background color. Defaults to {@link DEFAULT_CARD_BACKGROUND_COLOR}. */
  backgroundColor?: string;
  /** Download file name, e.g. `aivory-readiness-card-72.png`. */
  fileName: string;
}

/**
 * The result of a successful Score_Card capture.
 *
 * Matches the `CardCaptureResult` shape from the design document.
 */
export interface CardCaptureResult {
  /** `image/png` data URL. */
  dataUrl: string;
  /** PNG image blob. */
  blob: Blob;
  /** Triggers a browser download of the captured PNG. */
  download: () => void;
}

/** Signature of the capture function returned by {@link useCardCapture}. */
export type CardCaptureFn = (
  cardEl: HTMLElement | null,
  options: CardCaptureOptions,
) => Promise<CardCaptureResult>;

/**
 * Error thrown when a capture cannot be produced — the card region is absent,
 * html2canvas fails to load, or capture is attempted during SSR. Callers catch
 * this to surface a capture-failure indication and offer a re-attempt control.
 */
export class CardCaptureError extends Error {
  /** The underlying cause, when one is available. */
  public readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "CardCaptureError";
    this.cause = cause;
  }
}

/**
 * Build the canonical Score_Card download file name for a given score.
 *
 * The score is rounded to the nearest integer and clamped to the inclusive
 * range [0, 100] (reusing {@link clamp}), producing
 * `aivory-readiness-card-{score}.png` (Req 6.6).
 *
 * @param score - The raw readiness score (may be out of range or `NaN`).
 * @returns The canonical capture file name.
 */
export function buildCardFileName(score: number): string {
  const normalized = clamp(Math.round(score), 0, 100);
  return `aivory-readiness-card-${normalized}.png`;
}

/** The function type exported as `html2canvas`'s default export. */
type Html2CanvasFn = (typeof import("html2canvas"))["default"];

/**
 * Dynamically import html2canvas with one automatic retry (two total attempts).
 *
 * @returns The html2canvas capture function.
 * @throws {CardCaptureError} when both load attempts fail (Req 6.7, 13.1).
 */
async function loadHtml2Canvas(): Promise<Html2CanvasFn> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const mod = await import("html2canvas");
      const fn = (mod.default ?? mod) as unknown;
      if (typeof fn === "function") {
        return fn as Html2CanvasFn;
      }
      lastError = new Error("html2canvas module did not export a function");
    } catch (error) {
      lastError = error;
    }
  }
  throw new CardCaptureError(
    "html2canvas failed to load after two attempts",
    lastError,
  );
}

/**
 * Encode an SVG string as a base64 `image/svg+xml` data URL (unicode-safe).
 */
function svgToDataUrl(svgString: string): string {
  const bytes = new TextEncoder().encode(svgString);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return `data:image/svg+xml;base64,${window.btoa(binary)}`;
}

/**
 * Load an image element from a source URL.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("badge image failed to load"));
    img.src = src;
  });
}

/**
 * Pre-rasterize a serializable `#badge svg` inside the clone to a `<canvas>`,
 * swapping the SVG node for the raster canvas (Req 6.3).
 *
 * This is best-effort: if the badge SVG is absent or not serializable, or if
 * rasterization otherwise fails, the clone is left unchanged so the capture can
 * proceed WITHOUT the raster swap (Req 6.8).
 */
async function rasterizeBadge(clone: HTMLElement): Promise<void> {
  const svg = clone.querySelector("#badge svg");
  if (!svg) {
    return; // No badge SVG → proceed without raster swap (Req 6.8).
  }

  let svgString: string;
  try {
    svgString = new XMLSerializer().serializeToString(svg);
  } catch {
    return; // Not serializable → proceed without raster swap (Req 6.8).
  }
  if (!svgString) {
    return;
  }

  try {
    const img = await loadImage(svgToDataUrl(svgString));
    const canvas = document.createElement("canvas");
    canvas.width = BADGE_RASTER_SIZE;
    canvas.height = BADGE_RASTER_SIZE;
    canvas.style.maxWidth = "100%";
    canvas.style.height = "auto";
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return; // No 2D context → proceed without raster swap.
    }
    ctx.drawImage(img, 0, 0, BADGE_RASTER_SIZE, BADGE_RASTER_SIZE);
    svg.parentNode?.replaceChild(canvas, svg); // Swap SVG → raster canvas.
  } catch {
    // Load/draw failure → proceed without raster swap (Req 6.8).
  }
}

/**
 * Remove every node in the clone matching any of the given selectors.
 */
function removeNodes(root: HTMLElement, selectors: string[]): void {
  for (const selector of selectors) {
    root.querySelectorAll(selector).forEach((node) => node.remove());
  }
}

/**
 * Mount the clone offscreen with a fixed presentation width and background so
 * html2canvas can lay it out without it being visible to the user.
 */
function mountOffscreen(
  clone: HTMLElement,
  width: number,
  backgroundColor: string,
): void {
  clone.style.position = "fixed";
  clone.style.top = "0";
  clone.style.left = "-99999px";
  clone.style.width = `${width}px`;
  clone.style.backgroundColor = backgroundColor;
  clone.style.pointerEvents = "none";
  document.body.appendChild(clone);
}

/**
 * Convert a canvas to a PNG `Blob`.
 */
function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("canvas.toBlob produced no blob"));
      }
    }, "image/png");
  });
}

/**
 * Trigger a browser download of a data URL under a given file name.
 */
function triggerDownload(dataUrl: string, fileName: string): void {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/**
 * React hook returning a stable Score_Card capture function.
 *
 * @returns A {@link CardCaptureFn} that captures a card element to a PNG.
 *
 * @example
 * ```tsx
 * const capture = useCardCapture();
 * const res = await capture(cardRef.current, {
 *   fileName: buildCardFileName(result.score),
 * });
 * res.download();
 * ```
 */
export function useCardCapture(): CardCaptureFn {
  return useCallback<CardCaptureFn>(async (cardEl, options) => {
    if (isServerRender()) {
      throw new CardCaptureError("capture is only available in the browser");
    }

    // Req 6.9: absent Score_Card region → do not attempt capture.
    if (!cardEl) {
      throw new CardCaptureError("score card region is absent");
    }

    // Req 6.2 / 6.7 / 13.1: dynamically import html2canvas (with one retry).
    const html2canvas = await loadHtml2Canvas();

    const {
      width = DEFAULT_CARD_WIDTH,
      scale = DEFAULT_CARD_SCALE,
      backgroundColor = DEFAULT_CARD_BACKGROUND_COLOR,
      fileName,
    } = options;

    const clone = cardEl.cloneNode(true) as HTMLElement;

    // Req 6.3 / 6.8: pre-rasterize a serializable badge SVG (best-effort).
    await rasterizeBadge(clone);

    // Req 6.4: exclude the controls from the captured image.
    removeNodes(clone, EXCLUDED_CONTROL_SELECTORS);

    mountOffscreen(clone, width, backgroundColor);

    try {
      const canvasOut = await html2canvas(clone, {
        scale,
        useCORS: true,
        backgroundColor,
      });

      // Req 6.1: produce a PNG as both a data URL and a blob.
      let dataUrl: string;
      let blob: Blob;
      try {
        dataUrl = canvasOut.toDataURL("image/png");
        blob = await canvasToBlob(canvasOut);
      } catch {
        blob = await canvasToBlob(canvasOut);
        dataUrl = URL.createObjectURL(blob);
      }

      return {
        dataUrl,
        blob,
        download: () => triggerDownload(dataUrl, fileName),
      };
    } finally {
      // Req 6.5: always remove the offscreen clone, on success or failure.
      clone.remove();
    }
  }, []);
}
