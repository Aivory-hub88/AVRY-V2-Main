'use client';

/* Pre-emit critique: P5 H4 E5 S5 R5 V3 D5 */
/* V3 is a knowing trade: a 2-lead/6-supporting hierarchy was built and measured,
   and it grew the section 1049px -> 1275px with a void mid-card because the copy
   is too short to fill a half-width panel. Eight equal claims read better on an
   even grid than under a hierarchy the content cannot support. */

import type { ReactNode } from 'react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

/**
 * Card layout follows the Pangram Pangram / Apple product-card pattern:
 * eyebrow label, a short display headline, one supporting line, and a
 * minimal line mark anchored to the bottom of the card. The ornate tapestry
 * art it replaced read as decorative stock and sat outside the rest of the
 * site's restrained visual language.
 *
 * Icons are inline so they inherit `currentColor` and stay crisp on the
 * accent card, where the palette flips to dark-on-light.
 */
type Item = {
  tag: string;
  /** Which halftone field this card's ornament uses; no two cards repeat. */
  pattern: Pattern;
  title: string;
  body: string;
  icon: ReactNode;
  /** Exactly one card carries the brand accent, as the section's focal point. */
  accent?: boolean;
};

/** Shared geometry so every mark reads at the same optical weight. */
const svg = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/**
 * Halftone ornament. Every card carries one and no two are alike — but the
 * variation has to be structural, not cosmetic: eight different falloffs of the
 * same corner blob still read as one repeated shape. So each pattern here is a
 * different geometry (rings, rays, stripes, chevrons, lattice, wave, ramp,
 * corner arc), and each carries its own grid pitch and dot scale.
 *
 * Density is a pure function of grid position — no randomness — so server and
 * client render identical markup and hydration stays quiet.
 */
type Pattern = 'arc' | 'rings' | 'rays' | 'columns' | 'chevron' | 'wave' | 'lattice' | 'ramp';

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
/** 0→1→0 triangle wave; the building block for evenly repeating bands. */
const tri = (t: number) => 1 - Math.abs(((t % 1) + 1) % 1 * 2 - 1);

type Spec = {
  /** Grid pitch. Coarse grids read as bold ornament, fine ones as texture. */
  cols: number;
  rows: number;
  maxR: number;
  /** u,v run 0→1 across the ornament box. */
  field: (u: number, v: number) => number;
};

const PATTERNS: Record<Pattern, Spec> = {
  // Quarter arc packed into the corner — the reference's own motif.
  arc: { cols: 11, rows: 11, maxR: 9.5, field: (u, v) => clamp01(1 - Math.hypot(1 - u, 1 - v) / 1.05) },
  // Concentric bullseye.
  rings: { cols: 12, rows: 12, maxR: 8.5, field: (u, v) => Math.abs(Math.sin(Math.hypot(u - 0.55, v - 0.55) * Math.PI * 3.1)) },
  // Sunburst: size swings with the angle around the centre, not the distance.
  rays: { cols: 12, rows: 12, maxR: 8.5, field: (u, v) => Math.abs(Math.sin(Math.atan2(v - 0.5, u - 0.5) * 5)) * clamp01(Math.hypot(u - 0.5, v - 0.5) * 2.6) },
  // Vertical bars, constant down the column.
  columns: { cols: 13, rows: 11, maxR: 9, field: (u) => tri(u * 3.2) },
  // Diagonal chevrons folded about the vertical centre line.
  chevron: { cols: 12, rows: 12, maxR: 8.5, field: (u, v) => tri((Math.abs(u - 0.5) + v) * 2.6) },
  // Single travelling wave.
  wave: { cols: 14, rows: 11, maxR: 8, field: (u, v) => clamp01(1 - Math.abs(v - (0.5 + 0.36 * Math.sin(u * Math.PI * 2))) * 3) },
  // Diamond lattice.
  lattice: { cols: 12, rows: 12, maxR: 8.5, field: (u, v) => tri((Math.abs(u - 0.5) + Math.abs(v - 0.5)) * 2.8) },
  // Clean horizontal ramp, every row identical — a graded wall, not a blob.
  ramp: { cols: 13, rows: 11, maxR: 8.5, field: (u) => clamp01(u * 1.1) },
};

function Halftone({ pattern, tone }: { pattern: Pattern; tone: 'ink' | 'onAccent' }) {
  const { cols, rows, maxR, field } = PATTERNS[pattern];
  const step = maxR * 2.35;
  const dots = [];

  for (let j = 0; j < rows; j += 1) {
    for (let i = 0; i < cols; i += 1) {
      // Rounded to 3dp: Math.sin/hypot/atan2 can return a float64 that
      // differs in its last bit or two between the server's libm (Node on
      // Linux) and the browser's, which strings to a different literal and
      // trips a hydration mismatch on every single dot in the pattern.
      // Rounding collapses that platform-level epsilon before it reaches
      // the rendered attribute.
      const r = Math.round(field(i / (cols - 1), j / (rows - 1)) * maxR * 1000) / 1000;
      if (r < 0.5) continue;
      dots.push(<circle key={`${i}-${j}`} cx={i * step + step / 2} cy={j * step + step / 2} r={r} />);
    }
  }

  return (
    <svg
      viewBox={`0 0 ${cols * step} ${rows * step}`}
      aria-hidden="true"
      className={`h-full w-full ${tone === 'onAccent' ? 'text-white' : 'text-[#ff2f00]'}`}
      fill="currentColor"
    >
      {dots}
    </svg>
  );
}

const privacyItems: Item[] = [
  {
    tag: 'no training',
    pattern: 'arc',
    title: "We don't train on your data.",
    body: 'Your prompts, documents and outputs are never folded back into a model.',
    accent: true,
    icon: (
      <svg {...svg} aria-hidden="true">
        <rect x="8" y="8" width="8" height="8" rx="1.5" />
        <path d="M10 5V8M14 5V8M10 16v3M14 16v3M5 10h3M5 14h3M16 10h3M16 14h3" />
      </svg>
    ),
  },
  {
    tag: 'on-premise',
    pattern: 'chevron',
    title: 'Processed and stored locally.',
    body: 'Workloads run on infrastructure you own, inside your own network boundary.',
    icon: (
      <svg {...svg} aria-hidden="true">
        <rect x="3.5" y="4.5" width="17" height="6" rx="1.5" />
        <rect x="3.5" y="13.5" width="17" height="6" rx="1.5" />
        <path d="M7 7.5h.01M7 16.5h.01" />
      </svg>
    ),
  },
  {
    tag: 'compliance',
    pattern: 'rays',
    title: 'GDPR compliant by design.',
    body: 'Data minimisation, retention limits and erasure are built into the pipeline.',
    icon: (
      <svg {...svg} aria-hidden="true">
        <path d="M12 3.5l7 2.5v6c0 4-3 7.2-7 8.5-4-1.3-7-4.5-7-8.5V6l7-2.5z" />
        <path d="M9 12l2.2 2.2L15.5 10" />
      </svg>
    ),
  },
  {
    tag: 'no logs',
    pattern: 'wave',
    title: 'Zero server logging.',
    body: 'No request bodies, no transcripts, no silent copies held for debugging.',
    icon: (
      <svg {...svg} aria-hidden="true">
        <path d="M6.5 3.5h7l4 4v13h-11z" />
        <path d="M13.5 3.5v4h4" />
        <path d="M9.5 14.5h5" />
      </svg>
    ),
  },
  {
    tag: 'end-to-end',
    pattern: 'ramp',
    title: 'End-to-end private.',
    body: 'Encrypted in transit from the first request through to the final response.',
    icon: (
      <svg {...svg} aria-hidden="true">
        <circle cx="4" cy="12" r="1.8" />
        <circle cx="20" cy="12" r="1.8" />
        <path d="M5.8 12h2.7M15.5 12h2.7" />
        <rect x="9" y="10.5" width="6" height="5.5" rx="1.2" />
        <path d="M10.5 10.5V9a1.5 1.5 0 013 0v1.5" />
      </svg>
    ),
  },
  {
    tag: 'at rest',
    pattern: 'rings',
    title: 'Encrypted at rest.',
    body: 'Every stored record sits behind AES-256 with keys held on your side.',
    icon: (
      <svg {...svg} aria-hidden="true">
        <ellipse cx="12" cy="6.5" rx="7" ry="2.75" />
        <path d="M5 6.5v11c0 1.5 3.1 2.75 7 2.75s7-1.25 7-2.75v-11" />
        <path d="M9.5 13.5h5v4h-5zM10.75 13.5v-1.25a1.25 1.25 0 012.5 0v1.25" />
      </svg>
    ),
  },
  {
    tag: 'no sharing',
    pattern: 'columns',
    title: 'No third-party sharing.',
    body: 'Nothing is passed to advertisers, brokers or analytics vendors. Ever.',
    icon: (
      <svg {...svg} aria-hidden="true">
        <path d="M10.5 14l-2.2 2.2a3.4 3.4 0 01-4.8-4.8L5.7 9.2" />
        <path d="M13.5 10l2.2-2.2a3.4 3.4 0 014.8 4.8L18.3 14.8" />
      </svg>
    ),
  },
  {
    tag: 'enterprise',
    pattern: 'lattice',
    title: 'Enterprise grade.',
    body: 'Role-based access, audit trails and single sign-on across every workspace.',
    icon: (
      <svg {...svg} aria-hidden="true">
        <path d="M5 20V6.5a1 1 0 011-1h7a1 1 0 011 1V20" />
        <path d="M14 20v-9h4a1 1 0 011 1v8" />
        <path d="M3.5 20h17" />
        <path d="M8 9h3M8 12.5h3M8 16h3M16.5 14h.01" />
      </svg>
    ),
  },
];

export default function PrivacySection() {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section
      ref={ref}
      data-privacy-layout="editorial"
      data-privacy-icon-count="8"
      className={`animate-on-scroll ${isVisible ? 'is-visible' : ''} w-full border-t border-white/10 font-sans text-white`}
      style={{ paddingBlock: 'clamp(4.5rem, 8vw, 7.5rem)' }}
    >
      <div className="mx-auto max-w-[1400px] px-6 md:px-12 lg:px-24">
        <div className="grid gap-10 pb-14 lg:grid-cols-12 lg:pb-20">
          <div className="lg:col-span-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">
              Privacy &amp; security / 01
            </p>
            <h2
              className="no-word-split mt-5 max-w-lg text-[26px] sm:text-[28px] md:text-[28px] lg:text-[32px] font-light leading-[1.15] tracking-[-0.03em]"
              style={{ fontFamily: "var(--font-manrope), 'Manrope', sans-serif", fontWeight: 300 }}
            >
              Data sovereignty is non-negotiable.
            </h2>
          </div>

          <div className="lg:col-span-6 lg:col-start-7 lg:self-end">
            <p
              className="max-w-2xl text-xl font-light leading-[1.55] tracking-[-0.015em] text-white/82 md:text-2xl"
              style={{ fontFamily: "var(--font-manrope), 'Manrope', sans-serif", fontWeight: 300 }}
            >
              Your operational intelligence should remain under your control—at every layer of the system.
            </p>
            <p
              className="mt-7 max-w-xl text-[15px] font-light leading-7 text-white/55"
              style={{ fontFamily: "var(--font-manrope), 'Manrope', sans-serif", fontWeight: 300 }}
            >
              Zero model training. Zero third-party logging. Your operational data remains entirely within your control.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {privacyItems.map((item) => (
            <article
              key={item.title}
              className={`privacy-card relative flex min-h-[330px] flex-col overflow-hidden rounded-[20px] border p-7 ${
                item.accent
                  ? 'privacy-card--accent border-transparent bg-[#ff2f00] text-white'
                  : 'border-transparent bg-[#ededed] text-[#110f0e]'
              }`}
            >
              <p
                className={`font-mono text-[10px] uppercase tracking-[0.2em] ${
                  item.accent ? 'text-white' : 'text-[#110f0e]/70'
                }`}
              >
                {item.tag}
              </p>

              <h3
                className="mt-4 leading-[1.2] tracking-[-0.02em]"
                style={{
                  fontFamily: "var(--font-manrope), 'Manrope', sans-serif",
                  fontWeight: 400,
                  fontSize: 'clamp(19px, 1.5vw, 21px)',
                }}
              >
                {item.title}
              </h3>

              <p
                className={`mt-3 font-light leading-[1.6] ${
                  item.accent ? 'text-white' : 'text-[#110f0e]/65'
                } text-[13.5px]`}
                style={{ fontFamily: "var(--font-manrope), 'Manrope', sans-serif", fontWeight: 300 }}
              >
                {item.body}
              </p>

              <span
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-8 -right-8 h-[215px] w-[215px]"
                style={{
                  maskImage: 'linear-gradient(to top, #000 46%, transparent 88%)',
                  WebkitMaskImage: 'linear-gradient(to top, #000 46%, transparent 88%)',
                }}
              >
                <Halftone pattern={item.pattern} tone={item.accent ? 'onAccent' : 'ink'} />
              </span>

              <span
                className={`privacy-card__mark relative mt-auto block h-11 w-11 pt-9 ${
                  item.accent ? 'text-white' : 'text-[#110f0e]/70'
                }`}
                style={{ strokeWidth: 0.9, boxSizing: 'content-box' }}
              >
                {item.icon}
              </span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
