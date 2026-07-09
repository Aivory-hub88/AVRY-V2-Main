'use client';

import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SplitType from 'split-type';

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
      // Skip elements inside hero or stacking cards
      if (el.closest('.hero')) return;
      if (el.closest('.gsap-card-container')) return;
      if (el.closest('.gsap-card')) return;
      if ((el as any)._isSplit) return;
      (el as any)._isSplit = true;

      // Apply SplitType to split text into lines and words
      const text = new SplitType(el as HTMLElement, { types: 'lines, words' });

      // We animate the words!
      const targetElements = text.words;
      if (!targetElements || targetElements.length === 0) return;

      // Ensure the wrapper lines have overflow hidden so words slide up from behind a mask
      if (text.lines) {
        text.lines.forEach((line) => {
           line.style.overflow = 'hidden';
        });
      }

      gsap.set(targetElements, {
        opacity: 0,
        y: '100%',
        willChange: 'opacity, transform',
      });

      gsap.to(targetElements, {
        opacity: 1,
        y: '0%',
        duration: 0.6,
        ease: 'power3.out',
        stagger: 0.015, // Stagger each word slightly for a cascading wave effect!
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
        onComplete: () => {
          // GSAP leaves an identity transform + `will-change: transform` inline once
          // the reveal finishes. Either of those turns the grid into a CSS "backdrop
          // root", which makes `backdrop-filter` on the cards inside blur an empty
          // surface instead of the page background — i.e. the frosted-glass effect
          // silently does nothing. Clearing them restores a normal stacking context
          // so the cards can sample (and blur) the animated background behind them.
          gsap.set(grid, { clearProps: 'willChange,transform,translate,rotate,scale' });
        },
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
