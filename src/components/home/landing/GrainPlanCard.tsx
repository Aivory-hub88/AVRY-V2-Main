'use client';

import type { ReactNode } from 'react';
import { BokehGradient, type BokehScene, type LeafFigure } from '@/components/ui/BokehGradient';
import { RollButton } from '@/components/ui/RollButton';

/* One "tri" scene per card (see BokehGradient): three colours in 60/30/10 —
   a dominant field, one large soft shape, a small glow in the far corner —
   mixed in Oklab, with a dark seam where the first two meet. On the landing
   the card stays neutral and the scene sits in a window behind title and
   price, so it reads as one colour moment and the copy below stays dark. */

export interface PlanWorld {
  scene: BokehScene;
  figure?: LeafFigure;
}

/** colours: seam, dominant (60), secondary (30), accent (10), sheen. */
const tri = (
  seam: string,
  dominant: string,
  secondary: string,
  accent: string,
  sheen: string,
  seed: number,
  figure?: LeafFigure,
): PlanWorld => ({
  scene: { colors: [seam, dominant, secondary, accent, sheen, sheen], mode: 'tri', scale: 0.55, seed, light: 0.35, shadow: 0.55 },
  figure,
});

/** Aivory's own trio: deep blue field, a periwinkle-steel shape, a warm orange glow. The shape
    is dark enough for white copy (4.8:1); the old silver survives only as the thin sheen. */
const AIVORY_BLUE = ['#0a1838', '#1d4a9a', '#5a6fb0', '#e46a24', '#9aaedc'] as const;
const INDIGO_ORCHID_PEACH = ['#160f40', '#3a3aa8', '#b05ad0', '#f2a07a', '#f0d0f0'] as const;
/** Dusty teal sky and burnt orange with an amber glow: the "for Government" dusk crossed with the
    Cervo banner's teal and coral, so Enterprise reads apart from Operational's blue. */
const TEAL_EMBER_AMBER = ['#0f1a1c', '#4f6f7a', '#c4562a', '#e8a850', '#f2ede2'] as const;

// Step 1 keeps its own colour scenes; Step 2 uses the tri scenes. Both sit in a window,
// and every card carries an edge figure, drawn huge and cropped by the right edge; no two cards in a row share one.
/** Fresh: deep emerald and jade under a clear sky blue, a cool mint glint. */
export const WORLD_FRESH: PlanWorld = {
  scene: { colors: ['#032a22', '#05624a', '#0a9468', '#1fae78', '#1a8fc0', '#8fe0c0'], mode: 'field', scale: 0.8, seed: 3.1, light: 0.15, shadow: 0.5, exposure: 0.92 },
  figure: { kind: 'fractal', focus: [0.464, 0.268], origin: [0.82, 0.45], size: 1.7, depth: 3, rot: 0.6 },
};

/** Dusk: navy sky over a slate haze, an orange horizon below. */
export const WORLD_DUSK: PlanWorld = {
  scene: { colors: ['#06132b', '#0f3a78', '#2c5ea8', '#6f7f9e', '#de621e', '#f29a45'], mode: 'horizon', scale: 0.7, seed: 7.4, light: 0.15, shadow: 0.35 },
  figure: { kind: 'vortex', origin: [1.45, 0.15], size: 2.4, rot: Math.PI * 0.7 },
};

/** Platinum: deep violet into light purple, platinum light, a touch of red-orange. */
export const WORLD_PLATINUM: PlanWorld = {
  scene: { colors: ['#221a44', '#4a3e86', '#7866b2', '#a7a3bd', '#dc5634', '#e4e3ec'], mode: 'field', scale: 0.85, seed: 1.7, light: 0.42, shadow: 0.45, exposure: 0.86 },
  figure: { kind: 'nautilus', focus: 'eye', origin: [0.9, 0.6], size: 3.4, turn: Math.PI, rot: 0.5 },
};

export const STEP_TWO_WORLDS = [
  tri(...AIVORY_BLUE, 1.3, { kind: 'nautilus', focus: 'eye', origin: [0.8, 0.42], size: 1.05, turn: Math.PI }),
  tri(...INDIGO_ORCHID_PEACH, 2.7, { kind: 'fractal', focus: [0.464, 0.268], origin: [0.78, 0.5], size: 4.2, depth: 3 }),
  tri(...TEAL_EMBER_AMBER, 4.1, { kind: 'cymatic', origin: [1.3, 1.2], size: 2.3, n: 6, waves: 6, levels: 4, opacity: 0.5 }),
];

function CheckCircle() {
  return (
    <svg className="mt-[3px] h-[18px] w-[18px] shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <circle cx="10" cy="10" r="8.3" />
      <path d="M6.6 10.2l2.3 2.3 4.6-4.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Inline, not the `grid` class: the landing's GSAP reveal hides every
// `main .grid` until it scrolls in, which would fade each card part separately.
const SUBGRID = { display: 'grid' } as const;

function Tick() {
  return (
    <svg className="mt-[5px] h-[10px] w-[12px] shrink-0 text-[#17181c]" viewBox="0 0 12 10" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M1.5 5.2l3 3 6-6.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The header art melts into the white body; the shade keeps white type readable on the lightest blooms. */
const ART_FADE = 'linear-gradient(180deg,#000 52%,transparent 100%)';
const SHADE =
  'linear-gradient(180deg,rgba(8,10,24,0) 20%,rgba(8,10,24,.34) 62%,rgba(8,10,24,0) 100%)';

export interface GrainPlanFeature {
  text: string;
  strong?: boolean;
}

export function GrainPlanCard({
  world,
  badge,
  title,
  subtitle,
  description,
  price,
  priceSuffix,
  priceSmall = false,
  priceSuffixStrong = false,
  note,
  features,
  cta,
  onCta,
  surface = 'full',
  art,
}: {
  world: PlanWorld;
  badge?: string;
  title: string;
  subtitle?: ReactNode;
  description?: string;
  price: string;
  priceSuffix: string;
  /** Long prices (IDR) step the size down so they stay on one line. */
  priceSmall?: boolean;
  /** Bold suffix, for a count that matters to the buyer ("3 uses"). */
  priceSuffixStrong?: boolean;
  note?: string;
  features: GrainPlanFeature[];
  cta: string;
  onCta: () => void;
  /** 'full' paints the whole card; 'window' keeps the card neutral and puts the gradient in a tile behind title and price, the way ElevenLabs frames its one colour moment. */
  surface?: 'full' | 'window' | 'floral';
  /** 'floral': the baked header art (a WebP). Only the badge and the plan name sit on it; everything else stays on white. */
  art?: string;
}) {
  const win = surface === 'window';
  const head = (
    <>
      {/* The badge sits in the corner so every title starts on the same line. */}
      <div className="relative">
        {badge && (
          <span className="absolute right-0 top-0.5 inline-flex items-center whitespace-nowrap rounded-full border border-white/80 px-3 py-[3px] text-[12px] font-medium">
            {badge}
          </span>
        )}
        <h3 className={`whitespace-pre-line text-[28px] font-normal leading-[1.08] tracking-[-0.02em] md:text-[30px] ${badge ? 'pr-[6.5rem]' : ''}`}>
          {title}
        </h3>
      </div>

      <div>{subtitle && <div className="mt-3 max-w-[300px] text-[14px] leading-[1.4] text-white/75">{subtitle}</div>}</div>

      <div className="pt-9">
        <div className="flex items-baseline gap-2 whitespace-nowrap">
          <span className={`${priceSmall ? 'text-[34px] md:text-[38px]' : 'text-[46px] md:text-[52px]'} font-normal leading-none tracking-[-0.02em]`}>
            {price}
          </span>
          <span className={`text-[17px] ${priceSuffixStrong ? 'font-bold text-white' : 'text-white/75'}`}>{priceSuffix}</span>
        </div>
        {note && <p className="mt-2 text-[13px] font-bold text-white/85">{note}</p>}
      </div>
    </>
  );
  const ink = win
    ? { body: 'text-[#4e4e4e]', item: 'text-[#292524]', strong: 'font-semibold text-[#0c0a09]', tick: 'text-[#777169]', rule: 'border-[#e2dfdb]', btn: 'bg-[#0c0a09] text-white hover:bg-[#292524]' }
    : { body: 'text-white/80', item: 'text-white/85', strong: 'font-semibold text-white', tick: 'text-white/70', rule: 'border-white/20', btn: 'bg-white text-[#0f1b3d] hover:bg-white/90' };
  const body = (
    <>
      <div>{description && <p className={`pt-4 text-[15px] leading-[1.5] ${ink.body}`}>{description}</p>}</div>

      <ul className={`mt-7 space-y-3 border-t pt-6 text-[15px] leading-[1.4] ${ink.rule}`}>
        {features.map((f) => (
          <li key={f.text} className={`flex gap-3 ${f.strong ? ink.strong : ink.item}`}>
            <span className={ink.tick}>
              <CheckCircle />
            </span>
            <span>{f.text}</span>
          </li>
        ))}
      </ul>

      <div className="flex items-end pt-10">
        <button
          type="button"
          onClick={onCta}
          className={`w-full rounded-2xl px-6 py-4 text-center text-[16px] font-medium transition-[background-color,transform] duration-150 active:scale-[0.98] ${ink.btn}`}
        >
          {cta}
        </button>
      </div>
    </>
  );

  // Six rows on a subgrid of the cards' grid, so title, sub-headline, price,
  // description, features and CTA line up across every card in the row. The
  // parent grid must leave rows to auto-placement; each card spans six.
  // Floral surface: a calm, blurred floral header (badge + plan name only) fading into a white body, so
  // price, features and CTA always sit on a plain surface. Six rows on the cards' subgrid, as the others.
  if (surface === 'floral' && art) {
    const hi = Boolean(badge);
    return (
      <div
        className={`row-span-6 grid-cols-[minmax(0,1fr)] grid-rows-subgrid gap-y-0 overflow-hidden rounded-[24px] bg-white ring-1 ring-black/5 ${
          hi ? 'shadow-[0_30px_50px_-26px_rgba(140,40,160,0.45)]' : 'shadow-[0_24px_40px_-28px_rgba(20,30,60,0.35)]'
        }`}
        style={SUBGRID}
      >
        <div className="relative h-[176px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={art}
            alt=""
            aria-hidden="true"
            width={720}
            height={360}
            loading="lazy"
            decoding="async"
            draggable={false}
            className="absolute inset-0 h-full w-full select-none object-cover"
            style={{ WebkitMaskImage: ART_FADE, maskImage: ART_FADE }}
          />
          <div className="absolute inset-0" style={{ background: SHADE, WebkitMaskImage: 'linear-gradient(180deg,#000 60%,transparent)', maskImage: 'linear-gradient(180deg,#000 60%,transparent)' }} />
          {badge && (
            <span className="absolute left-6 top-5 inline-flex items-center whitespace-nowrap rounded-full bg-white/20 px-3 py-[5px] text-[11.5px] font-medium tracking-[0.02em] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.45)] backdrop-blur-[14px] backdrop-saturate-[1.4]">
              {badge}
            </span>
          )}
          <h3
            className={`absolute left-6 right-6 whitespace-pre-line font-light tracking-[-0.03em] text-white [text-shadow:0_1px_14px_rgba(0,0,0,0.35)] ${
              title.length > 14 ? 'bottom-[44px] text-[28px] leading-[1.08]' : 'bottom-[52px] text-[34px] leading-none'
            }`}
          >
            {title}
          </h3>
        </div>

        <div className="px-6 pt-1">
          {(subtitle || description) && <div className="max-w-[300px] text-[13.5px] leading-[1.5] text-[#5c6070]">{subtitle ?? description}</div>}
        </div>

        <div className="px-6 pt-5">
          <div className="flex items-baseline gap-2 whitespace-nowrap">
            <span className={`${priceSmall ? 'text-[34px]' : 'text-[46px]'} font-light leading-none tracking-[-0.04em] text-[#17181c]`}>{price}</span>
            <span className={`text-[13px] ${priceSuffixStrong ? 'font-semibold text-[#3a3d48]' : 'font-medium text-[#5c6070]'}`}>{priceSuffix}</span>
          </div>
          {note && <p className="mt-[6px] text-[12px] text-[#8a8e9c]">{note}</p>}
        </div>

        <div />

        <div className="px-6 pt-[18px]">
          <RollButton onClick={onCta} tone={hi ? 'brand' : 'ink'}>
            {cta}
          </RollButton>
        </div>

        <ul className="mx-6 mt-5 space-y-[9px] border-t border-black/[0.08] pb-7 pt-[18px] text-[13.5px] leading-[1.4] text-[#2a2c34]">
          {features.map((f) => (
            <li key={f.text} className={`flex gap-[10px] ${f.strong ? 'font-semibold text-[#17181c]' : ''}`}>
              <Tick />
              <span>{f.text}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (win) {
    return (
      <div className="row-span-6 grid-cols-[minmax(0,1fr)] grid-rows-subgrid gap-y-0 rounded-[28px] bg-[#f0efed] p-2 pb-8" style={SUBGRID}>
        <BokehGradient
          scene={world.scene}
          figure={world.figure}
          className="row-span-3 grid-rows-subgrid gap-y-0 rounded-[22px] p-6 pb-7 text-white md:p-7"
          style={SUBGRID}
        >
          {head}
        </BokehGradient>
        <div className="row-span-3 grid-rows-subgrid gap-y-0 px-5 md:px-6" style={SUBGRID}>{body}</div>
      </div>
    );
  }

  return (
    <BokehGradient
      scene={world.scene}
      figure={world.figure}
      className="row-span-6 grid-cols-[minmax(0,1fr)] grid-rows-subgrid gap-y-0 rounded-[28px] p-7 text-white shadow-[0_18px_44px_rgba(20,24,60,0.18)] md:p-8"
      style={SUBGRID}
    >
      {head}
      {body}
    </BokehGradient>
  );
}

export default GrainPlanCard;