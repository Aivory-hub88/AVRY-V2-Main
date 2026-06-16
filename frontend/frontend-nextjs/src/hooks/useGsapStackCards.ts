'use client';

import { useEffect, RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Hook that implements the stacking card parallax effect using GSAP ScrollTrigger.
 *
 * Behaviour:
 * - Cards are already sticky via CSS (.gsap-card position:sticky)
 * - When the NEXT card enters the viewport, the CURRENT card scales down
 * - Scale formula: 0.94 - (0.01 * depth) where depth = totalCards - index
 * - Only activates on desktop (min-width: 1025px) via ScrollTrigger.matchMedia
 * - Also batch-adds `.animate` class when cards enter at top 85%
 *
 * @param containerRef - Ref to the .gsap-card-container element
 */
export function useGsapStackCards(containerRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Respect reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Immediately show all cards
      container.querySelectorAll('.gsap-card').forEach((card) => {
        card.classList.add('animate');
      });
      return;
    }

    const gsapCards = gsap.utils.toArray<HTMLElement>(
      container.querySelectorAll('.gsap-card')
    );
    const totalCards = gsapCards.length;

    // Batch-add .animate class when cards enter viewport
    ScrollTrigger.batch(gsapCards, {
      start: 'top 85%',
      once: true,
      onEnter: (batch: Element[]) => {
        batch.forEach((card) => card.classList.add('animate'));
      },
    });

    // Desktop-only stacking parallax
    ScrollTrigger.matchMedia({
      '(min-width: 1025px)': () => {
        gsapCards.forEach((card, i) => {
          if (i !== totalCards - 1) {
            const nextCard = gsapCards[i + 1];
            gsap.to(card, {
              scrollTrigger: {
                trigger: nextCard,
                start: 'top 35%',
                end: 'top 25%',
                scrub: true,
              },
              scale: 0.94 - 0.01 * (totalCards - i),
              ease: 'none',
            });
          }
        });
      },
    });

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, [containerRef]);
}
