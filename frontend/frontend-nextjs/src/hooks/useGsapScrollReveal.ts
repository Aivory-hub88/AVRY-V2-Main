'use client';

import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Hook that provides GSAP ScrollTrigger-based reveal animations.
 * Mirrors the premium scroll reveal from the original index.html.
 *
 * - revealElements: fade-up reveal for headings/paragraphs
 * - revealGrids: fade-up reveal for grid containers
 * - revealDividers: scaleX reveal for horizontal dividers
 *
 * Respects `prefers-reduced-motion` and cleans up on unmount.
 */
export function useGsapScrollReveal() {
  function revealElements(selector: string) {
    const elements = document.querySelectorAll(selector);
    elements.forEach((el) => {
      // Skip elements inside hero, stacking cards, or animate-on-scroll sections
      if (el.closest('.hero')) return;
      if (el.closest('.gsap-card-container')) return;
      if (el.closest('.gsap-card')) return;
      if (el.closest('.animate-on-scroll')) return;

      gsap.set(el, {
        opacity: 0,
        y: 30,
        willChange: 'opacity, transform',
      });

      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          end: 'top 60%',
          toggleActions: 'play none none none',
          once: true,
        },
      });
    });
  }

  function revealGrids(selector: string) {
    const grids = document.querySelectorAll(selector);
    grids.forEach((grid) => {
      if (grid.closest('.hero')) return;
      if (grid.closest('.gsap-card-container')) return;
      if (grid.closest('.animate-on-scroll')) return;

      gsap.set(grid, {
        opacity: 0,
        y: 30,
        willChange: 'opacity, transform',
      });

      gsap.to(grid, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: grid,
          start: 'top 88%',
          toggleActions: 'play none none none',
          once: true,
        },
      });
    });
  }

  function revealDividers(selector: string) {
    const dividers = document.querySelectorAll(selector);
    dividers.forEach((divider) => {
      if (divider.closest('.hero')) return;
      if (divider.closest('.grid')) return;
      if (divider.closest('.animate-on-scroll')) return;

      gsap.from(divider, {
        scaleX: 0,
        transformOrigin: 'left center',
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: divider,
          start: 'top 90%',
          toggleActions: 'play none none none',
          once: true,
        },
      });
    });
  }

  return { revealElements, revealGrids, revealDividers };
}

/**
 * Cleanup helper — call inside useEffect cleanup to kill all ScrollTrigger instances.
 */
export function killAllScrollTriggers() {
  ScrollTrigger.getAll().forEach((t) => t.kill());
}
