'use client';

import { useEffect, useRef, useState } from 'react';

export interface ScrollAnimationOptions {
  /** IntersectionObserver threshold (0–1). Default 0.15 */
  threshold?: number;
  /** IntersectionObserver rootMargin. Default '0px 0px -50px 0px' */
  rootMargin?: string;
  /** If true, unobserve after first trigger (one-way only). Default false — replays both scrolling down and back up. */
  once?: boolean;
}

/**
 * Custom hook that uses IntersectionObserver to detect when an element
 * enters the viewport and returns visibility state for animation triggers.
 *
 * Bidirectional by default: `isVisible` flips back to false when the element
 * leaves the viewport (either direction), so the caller's reveal animation
 * replays whether the user scrolls down into it or back up into it again.
 * Pass `{ once: true }` to keep the old one-shot behavior.
 *
 * Respects `prefers-reduced-motion` by immediately marking elements as visible.
 */
export function useScrollAnimation(options?: ScrollAnimationOptions) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  const { threshold = 0.05, rootMargin = '0px 0px 0px 0px', once = true } =
    options ?? {};

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Respect reduced motion preference — skip animation entirely
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) {
            observer.unobserve(element);
          }
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, once]);

  return { ref, isVisible };
}
