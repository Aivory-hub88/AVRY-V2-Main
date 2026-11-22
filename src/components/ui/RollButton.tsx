'use client';

import type { ReactNode } from 'react';

/**
 * Pill CTA with a fill that slides up from below and a label that rolls out as the
 * second copy rolls in (the Framer "animated surface" pattern). Pure CSS, so it
 * costs no JS and respects reduced motion. Mark with `data-cta-cursor` so the
 * <CtaCursor /> badge can find it.
 *
 * Timing, measured from a reference build: in 550ms with an expo-out curve, out
 * 600ms ease-in-out. The two are deliberately not mirror images.
 */
export type RollTone = 'ink' | 'brand';

const TONES: Record<RollTone, { rest: string; fill: string; label: string; roll: string }> = {
  // Quiet default: near-black pill that floods Aivory blue.
  ink: { rest: 'bg-[#0f1115] text-white', fill: 'bg-[#1d4a9a]', label: 'text-white', roll: 'text-white' },
  // The featured plan: Aivory blue pill that floods the warm orange from the brand palette.
  brand: { rest: 'bg-[#1d4a9a] text-white', fill: 'bg-[#e46a24]', label: 'text-white', roll: 'text-white' },
};

const EASE_IN = 'ease-[cubic-bezier(0.16,1,0.3,1)]';
const EASE_OUT = 'ease-[cubic-bezier(0.65,0,0.35,1)]';
const MOVE = `transition-transform duration-[600ms] ${EASE_OUT} group-hover:duration-[550ms] group-hover:${EASE_IN} group-focus-visible:duration-[550ms] group-focus-visible:${EASE_IN} motion-reduce:transition-none`;

export function RollButton({
  children,
  onClick,
  tone = 'ink',
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: RollTone;
  className?: string;
}) {
  const t = TONES[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      data-cta-cursor
      className={`group relative isolate w-full overflow-hidden rounded-full px-6 py-3 text-center text-[14px] font-medium outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-[#1d4a9a] active:scale-[0.985] transition-transform duration-150 ${t.rest} ${className}`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-0 -z-10 translate-y-full rounded-full group-hover:translate-y-0 group-focus-visible:translate-y-0 ${t.fill} ${MOVE}`}
      />
      <span className="relative block overflow-hidden leading-[1.4]">
        <span className={`block group-hover:-translate-y-full group-focus-visible:-translate-y-full ${MOVE} ${t.label}`}>{children}</span>
        <span
          aria-hidden="true"
          className={`absolute inset-0 block translate-y-full group-hover:translate-y-0 group-focus-visible:translate-y-0 ${MOVE} ${t.roll}`}
        >
          {children}
        </span>
      </span>
    </button>
  );
}

export default RollButton;
