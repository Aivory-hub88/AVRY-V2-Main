"use client";

/**
 * ReadinessBadge — the Free Diagnostic readiness score badge.
 *
 * Renders the server-provided `badge_svg` markup when it is a non-empty,
 * well-formed (parseable) SVG string (Req 5.1). Otherwise it renders a
 * CSS-based fallback badge that displays the score, without ever raising a
 * rendering error (Req 5.2).
 *
 * The rendered SVG is always placed inside an element with `id="badge"` so the
 * Score_Card capture hook's `#badge svg` selector (see
 * `lib/hooks/use-card-capture.ts`) can find and pre-rasterize it.
 *
 * Score display (Req 5.3, 5.4): the score is rounded to the nearest integer and
 * clamped to the inclusive range [0, 100] via the shared {@link clamp} helper.
 * `NaN` rounds to `NaN`, which `clamp` maps to the lower bound `0`.
 *
 * SSR safety: the component may render on the server, where `DOMParser` is not
 * available. To avoid both crashing and a hydration mismatch, the initial
 * (server + first client) render decides whether to render the SVG using a
 * deterministic, environment-independent structural heuristic. After hydration,
 * a `useEffect` performs the strict `DOMParser` parse-error check and downgrades
 * to the CSS fallback if the markup is not actually well-formed.
 *
 * The `badge_svg` is treated as trusted, server-rendered markup, so it is
 * injected via `dangerouslySetInnerHTML`.
 *
 * _Requirements: 5.1, 5.2, 5.3, 5.4_
 */

import { useEffect, useState } from "react";

import { clamp } from "@/lib/helpers";

export interface ReadinessBadgeProps {
  /** Server-rendered SVG markup for the badge, when available. */
  svg?: string;
  /** The raw readiness score (may be out of range or `NaN`). */
  score: number;
  /** Category label, e.g. "Emerging", "Advanced". */
  category?: string;
  /** Optional extra class names applied to the `#badge` container. */
  className?: string;
}

/**
 * Compute the display score: rounded to the nearest integer and clamped to the
 * inclusive range [0, 100]. `NaN` is mapped to the lower bound `0` because
 * `Math.round(NaN)` is `NaN` and {@link clamp} returns its lower bound for
 * `NaN` (Req 5.3, 5.4).
 */
function getDisplayScore(score: number): number {
  return clamp(Math.round(score), 0, 100);
}

/**
 * SSR-safe, deterministic structural heuristic for "looks like an SVG".
 *
 * This runs identically on the server and the client, so it is used for the
 * initial render decision to avoid a hydration mismatch. It is intentionally
 * lenient — the strict `DOMParser` check runs after hydration.
 *
 * @returns `true` when the trimmed string opens an `<svg ...>` tag and either
 *   closes it (`</svg>`) or is self-closing (`<svg ... />`).
 */
function looksLikeSvg(svg: string): boolean {
  const trimmed = svg.trim();
  if (trimmed.length === 0) {
    return false;
  }
  if (!/<svg[\s>]/i.test(trimmed)) {
    return false;
  }
  return /<\/svg\s*>/i.test(trimmed) || /<svg[^>]*\/>/i.test(trimmed);
}

/**
 * Strictly validate that a string is a well-formed, parseable SVG document.
 *
 * In the browser this uses `DOMParser` with the `image/svg+xml` MIME type and
 * detects malformed markup via the inserted `<parsererror>` element, also
 * confirming the document root is an `<svg>` element (Req 5.1/5.2). When
 * `DOMParser` is unavailable (server render), it falls back to the
 * {@link looksLikeSvg} heuristic so it never throws.
 */
function isParseableSvg(svg: string): boolean {
  const trimmed = svg.trim();
  if (trimmed.length === 0) {
    return false;
  }

  if (typeof window === "undefined" || typeof window.DOMParser === "undefined") {
    return looksLikeSvg(trimmed);
  }

  try {
    const doc = new window.DOMParser().parseFromString(trimmed, "image/svg+xml");
    // Browsers insert a <parsererror> element for malformed XML/SVG.
    if (doc.querySelector("parsererror")) {
      return false;
    }
    const root = doc.documentElement;
    return !!root && root.nodeName.toLowerCase() === "svg";
  } catch {
    // Any parser failure → treat as not well-formed (Req 5.2). Never throws.
    return false;
  }
}

/**
 * The readiness score badge.
 *
 * @param svg - Server-rendered SVG markup; rendered when well-formed.
 * @param score - The raw readiness score (rounded + clamped for display).
 * @param category - Optional category label shown on the fallback badge.
 * @param className - Optional extra class names for the `#badge` container.
 */
export function ReadinessBadge({
  svg,
  score,
  category,
  className = "",
}: ReadinessBadgeProps) {
  const displayScore = getDisplayScore(score);

  // Initial (SSR-safe) decision uses the deterministic heuristic so the server
  // and the first client render agree, preventing a hydration mismatch.
  const initialUseSvg = typeof svg === "string" && looksLikeSvg(svg);
  const [useSvg, setUseSvg] = useState<boolean>(initialUseSvg);

  // After hydration, strictly validate with DOMParser and downgrade to the CSS
  // fallback when the markup is not actually well-formed (Req 5.2).
  useEffect(() => {
    if (typeof svg !== "string") {
      setUseSvg(false);
      return;
    }
    setUseSvg(isParseableSvg(svg));
  }, [svg]);

  const ariaLabel = category
    ? `AI readiness score: ${displayScore} out of 100, ${category}`
    : `AI readiness score: ${displayScore} out of 100`;

  // Req 5.1: render the provided, well-formed SVG markup inside `#badge`.
  if (useSvg && typeof svg === "string") {
    return (
      <div
        id="badge"
        role="img"
        aria-label={ariaLabel}
        data-testid="readiness-badge-svg"
        className={`readiness-badge mx-auto h-auto max-w-full ${className}`.trim()}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  }

  // Req 5.2: CSS-based fallback badge displaying the score (no SVG, no throw).
  return (
    <div
      id="badge"
      role="img"
      aria-label={ariaLabel}
      data-testid="readiness-badge-fallback"
      className={`readiness-badge mx-auto ${className}`.trim()}
    >
      <div className="mx-auto flex h-[180px] w-[180px] flex-col items-center justify-center rounded-full border-4 border-brand-mint bg-bg-secondary text-center shadow-glow">
        <span className="text-[3.5rem] font-light leading-none text-brand-mint">
          {displayScore}
        </span>
        <span className="mt-1 text-xs uppercase tracking-widest text-text-secondary">
          / 100
        </span>
        {category ? (
          <span className="mt-1 px-2 text-sm font-medium text-text-primary">
            {category}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export default ReadinessBadge;
