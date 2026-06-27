'use client';

import { useEffect } from 'react';
import { useGsapScrollReveal, killAllScrollTriggers } from '@/hooks/useGsapScrollReveal';

/**
 * Client component that applies GSAP ScrollTrigger reveal animations globally.
 * Targets section-level headings, paragraphs, grids, and dividers — same selectors
 * as the original index.html premium scroll reveal.
 *
 * IMPORTANT: Skips any element that already has .animate-on-scroll class
 * (those are handled by useScrollAnimation hook instead).
 *
 * Mount this once in page.tsx.
 */
export default function ScrollRevealProvider() {
  const { revealElements, revealGrids, revealDividers } = useGsapScrollReveal();

  useEffect(() => {
    // Respect reduced motion — skip all animations
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    // Target section-level headings and paragraphs
    // useGsapScrollReveal hook already filters out .hero, .gsap-card, and .animate-on-scroll
    const headingSelectors = 'h2, p';

    revealElements(headingSelectors);

    // Grid containers
    revealGrids('main .grid');

    // Border dividers — only standalone decorative dividers, not section borders
    revealDividers('.border-t:not(section)');

    return () => {
      killAllScrollTriggers();
    };
  }, [revealElements, revealGrids, revealDividers]);

  return null;
}
