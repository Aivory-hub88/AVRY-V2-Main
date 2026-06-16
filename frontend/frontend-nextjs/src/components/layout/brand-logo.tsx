/**
 * BrandLogo Component
 *
 * Shared brand mark that renders the legacy Aivory SVG logo
 * (`/public/aivory-logo-2026.svg`, ported from `frontend/Aivory logo 2026.svg`).
 *
 * Reused by the homepage navbar and footer so the brand mark stays consistent
 * with the legacy site (design recommendation 10.1 / 10.2, Requirement 10).
 *
 * Sizing is driven by `className` (height-based, `w-auto`) to mirror the legacy
 * usage: `height: 40px` in the navbar and `h-[48px] md:h-[72px]` in the footer.
 */

import React from "react";
import Image from "next/image";

/** Public asset path for the ported legacy logo. */
// Use the canonical staging logo to match the live marketing site exactly.
export const BRAND_LOGO_SRC = "https://stag.aivory.id/Aivory%20logo%202026.svg";

/** Intrinsic dimensions from the SVG `viewBox` (382.6 x 79.4), rounded for next/image. */
const LOGO_INTRINSIC_WIDTH = 383;
const LOGO_INTRINSIC_HEIGHT = 79;

export interface BrandLogoProps {
  /** Tailwind/utility classes controlling the rendered size. Defaults to legacy navbar height. */
  className?: string;
  /** Accessible label for the logo image. */
  alt?: string;
  /** Hint Next.js to eagerly load (use for above-the-fold navbar usage). */
  priority?: boolean;
}

export function BrandLogo({
  className = "h-[34px] w-auto",
  alt = "Aivory",
  priority = false,
}: BrandLogoProps) {
  return (
    <Image
      src={BRAND_LOGO_SRC}
      alt={alt}
      width={LOGO_INTRINSIC_WIDTH}
      height={LOGO_INTRINSIC_HEIGHT}
      className={className}
      priority={priority}
      // SVGs are not run through the Next.js image optimizer (which returns 400
      // for SVG unless `images.dangerouslyAllowSVG` is enabled globally). Serving
      // the asset directly keeps the brand mark rendering without that config.
      unoptimized
    />
  );
}

export default BrandLogo;
