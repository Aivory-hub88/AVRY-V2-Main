'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Both pricing steps mount this; only one badge should ever exist.
let owner: object | null = null;

/**
 * A small ↗ badge that appears when the pointer is over a `[data-cta-cursor]`
 * element and settles on that element's top-right corner (34px black disc,
 * 1px light ring, arrow rotated -45°). Fine pointers only; the native cursor is
 * left alone everywhere. Mount once per page section that has CTAs.
 */
export function CtaCursor() {
  const ref = useRef<HTMLDivElement>(null);
  const token = useRef({});
  // Portalled to <body>: the animate-on-scroll sections carry a transform, which would
  // turn `position: fixed` into position-relative-to-the-section.
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (owner || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    owner = token.current;
    setHost(document.body);
    return () => {
      if (owner === token.current) owner = null;
    };
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !host) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let target: HTMLElement | null = null;
    let px = 0;
    let py = 0;

    const place = () => {
      if (!target) return;
      const r = target.getBoundingClientRect();
      // Pivot on the disc centre: 5px in from the right edge, level with the top edge.
      el.style.transform = `translate(${r.right - 5}px, ${r.top}px) translate(-50%, -50%) scale(1)`;
    };
    const hide = () => {
      target = null;
      el.style.opacity = '0';
      el.style.transform = `translate(${px}px, ${py}px) translate(-50%, -50%) scale(0.4)`;
    };
    const onMove = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;
      const hit = (e.target as Element | null)?.closest<HTMLElement>('[data-cta-cursor]') ?? null;
      if (hit === target) return;
      if (!hit) return hide();
      const first = !target;
      target = hit;
      if (first) {
        // Start the badge at the pointer, then let the transition carry it to the corner.
        el.style.transition = 'none';
        el.style.transform = `translate(${px}px, ${py}px) translate(-50%, -50%) scale(0.4)`;
        void el.offsetWidth;
        el.style.transition = '';
      }
      el.style.opacity = '1';
      place();
    };
    const onLeaveDoc = () => hide();

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('scroll', place, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeaveDoc);
    if (reduce) el.style.transition = 'opacity 120ms linear';
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('scroll', place);
      document.documentElement.removeEventListener('pointerleave', onLeaveDoc);
    };
  }, [host]);

  if (!host) return null;
  return createPortal(
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[60] grid h-[34px] w-[34px] place-items-center rounded-full border border-[#eef0f2] bg-black text-white opacity-0 shadow-[0_6px_16px_rgba(0,0,0,0.25)] [transition:transform_350ms_cubic-bezier(0.16,1,0.3,1),opacity_200ms_ease-out]"
      style={{ transform: 'translate(-50%, -50%) scale(0.4)' }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 17 17 7M8 7h9v9" />
      </svg>
    </div>,
    host,
  );
}

export default CtaCursor;
