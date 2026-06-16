"use client";

/**
 * ScoreCardSnapshot — the downloadable Score_Card capture region.
 *
 * This is the forwarded-ref DOM region that holds the readiness badge and the
 * score details. It is the capture target consumed by {@link useCardCapture}:
 * the hook clones `cardRef.current` (the root `<div>` this component forwards
 * its ref to) and looks for a `#badge svg` node inside it to pre-rasterize. The
 * badge (`#badge`, rendered by {@link ReadinessBadge}) is supplied as `children`
 * by the composer (DiagnosticResults, task 7.1), so it lives inside this region
 * and is captured as part of the PNG (Requirement 6.1).
 *
 * The root element carries the legacy `score-card` class so the composer and
 * the capture hook can target the region consistently. The legacy two-column
 * `.score-columns` layout (badge in column one, details in column two) is added
 * separately in task 7.3; this component only provides the capture container
 * (Requirement 11.3).
 *
 * Styling is intentionally minimal here — it forwards the ref and renders its
 * `children`, leaving the column/grid presentation to the shared CSS. Controls
 * such as `.badge-actions` and `.share-section` are rendered by the composer
 * OUTSIDE this region so they are never captured (the capture hook also strips
 * them defensively).
 *
 * @example
 * ```tsx
 * const cardRef = useRef<HTMLDivElement>(null);
 *
 * <ScoreCardSnapshot ref={cardRef}>
 *   <ReadinessBadge svg={result.badge_svg} score={result.score} category={result.category} />
 *   <ScoreDetails ... />
 * </ScoreCardSnapshot>
 * ```
 *
 * _Requirements: 6.1, 11.3_
 */

import { forwardRef, type ReactNode } from "react";

export interface ScoreCardSnapshotProps {
  /**
   * The capture content — typically the {@link ReadinessBadge} (`#badge`) plus
   * the score details, supplied by the composer.
   */
  children?: ReactNode;
  /** Optional extra class names applied to the `.score-card` root container. */
  className?: string;
}

/**
 * The Score_Card capture region.
 *
 * Forwards its `ref` to the root `<div className="score-card">` so a parent can
 * point at this DOM region for html2canvas capture, and renders its `children`
 * (the badge + score details) inside it.
 */
export const ScoreCardSnapshot = forwardRef<HTMLDivElement, ScoreCardSnapshotProps>(
  function ScoreCardSnapshot({ children, className = "" }, ref) {
    return (
      <div
        ref={ref}
        data-testid="score-card-snapshot"
        className={`score-card ${className}`.trim()}
      >
        {children}
      </div>
    );
  },
);

export default ScoreCardSnapshot;
