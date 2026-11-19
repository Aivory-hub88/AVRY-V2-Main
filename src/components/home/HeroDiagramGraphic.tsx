'use client';

import { useEffect, useRef, useState } from 'react';

// Assets pulled from the "Hero Aivory New" Figma file
// (figma.com/design/mHnodNSQbgAnLeRrZV1M4i, node 1:2) and re-hosted locally
// so the hero doesn't depend on Figma's short-lived asset URLs. Coordinates
// below are canvas-relative (0,0 = the card's own top-left, matching the
// 1440x917 "Rectangle 33" background in the source file) — every layer's
// Figma `left`/`top` plus its parent frame's own offset.
const imgTexture = '/images/hero-new/texture.png';
const imgComputer = '/images/hero-new/computer.png';
const imgSmartphone = '/images/hero-new/smartphone.png';
const imgFolder = '/images/hero-new/folder.png';
const imgSmartwatchBot = '/images/hero-new/smartwatch-bot.png';
const imgSoftStar = '/images/hero-new/soft-star.svg';
const imgLines = '/images/hero-new/lines-bg.svg';
// Trust-card illustrations (nodes 28:799 / 28:858) and the canonical NVIDIA
// lockup (reused rather than Figma's own re-traced export of it).
const imgKeynote = '/images/hero-new/trust-keynote.png';
const imgHand = '/images/hero-new/trust-hand.png';
const imgNvidiaBadge = '/images/nvidia-inception/nvidia-inception-program-badge-rgb-for-screen.svg';

const LITERATA = "var(--font-literata), Literata, serif";

// The whole graphic is authored once at this fixed size (matching the
// source card exactly) and scaled down as a single unit — see
// useCanvasScale — rather than reflowed with breakpoints. It reads as one
// illustration, so proportions matter more than the ability to rewrap any
// single label.
// How hard the ambient colour reads. The source blobs are pale washes; this
// deepens them without shifting hue — one knob, tuned by eye against the
// card's #ededed ground.

const CANVAS_WIDTH = 1440;
// The lockup (labels, pill, pins, arrows) and its tagline are drawn at the
// source's size, then taken down 15% as one group — which is also what buys
// the composition its height back, since the top pin can only sit so close
// to the fixed 64px nav row.
const LOCKUP_SCALE = 0.85;
// The fixed navbar sits inside this card's top strip. TOP_PAD is the only
// clearance between the two, and it is negative because the artwork's own
// box starts above its topmost element: the orange pin (design y=92) is the
// real ceiling, and at this value it clears the 64px nav row by ~13px.
const TOP_PAD = 30;
// Tall enough for the lowest trust card (26:783, local y=547.97 + its own
// 176.18px = 724.15) once it's rendered — which is *after* LOCKUP_SCALE, not
// before: that scale's origin is the lockup group's own top edge, so it
// compresses everything toward TOP_PAD without changing the outer box this
// constant sizes. Using the raw 724 here (as an earlier pass did) left the
// outer box tall enough for unscaled content, i.e. ~150px of dead space
// under the actually-rendered (0.85x) cards. TOP_PAD + 724 * LOCKUP_SCALE
// (-10 + 615.4) plus a small margin.
const CANVAS_HEIGHT = 820;

// Booking destination is shared with /contact and PreFooterCTA — a real Cal
// instance, not Calendly's homepage (the bug that got the free-diagnostic
// "Schedule a debrief" card pulled).
export const WALKTHROUGH_URL = 'https://book.aivory.uk/book/aivory-call';

const CARD_SHADOW =
  '0px 49px 37px rgba(0,0,0,0.02), 0px 32px 21.5px rgba(0,0,0,0.02), 0px 19px 12px rgba(0,0,0,0.02), 0px 10px 6px rgba(0,0,0,0.01), 0px 4px 3px rgba(0,0,0,0.01), 0px 1px 1.5px rgba(0,0,0,0.01)';

/**
 * A trust "sticky note" (nodes 25:778 / 26:783 / 29:882): a rotated white
 * card plus, for two of the three, an illustration that is a *separate*
 * sibling node in the source overlapping up and over the card's own top
 * edge — not a child clipped to its bounds. `left`/`top` are the card's own
 * canvas position; the illustration's are relative to that same origin.
 * Rotation wasn't in Figma's metadata for these nodes (only reachable per
 * isolated node, which normalizes away the parent-applied tilt), so it was
 * measured directly off each node's rendered screenshot — the angle of its
 * straight left edge from vertical.
 */
function Note({
  left,
  top,
  size,
  rotate,
  scale = 1,
  delay = 0,
  illustration,
  children,
}: {
  left: number;
  top: number;
  size: number;
  rotate: number;
  scale?: number;
  /** Offset into the idle sway so the three notes don't move in lockstep. */
  delay?: number;
  illustration?: { src: string; width: number; height: number; left: number; top: number };
  children: React.ReactNode;
}) {
  return (
    <div
      className="absolute"
      style={{ left, top, width: size, height: size, transform: scale !== 1 ? `scale(${scale})` : undefined, transformOrigin: '0 0' }}
    >
      <div className="hero-sway absolute inset-0" style={{ animationDelay: `${delay}s` }}>
        <div className="hero-note-poke pointer-events-auto absolute inset-0">
          <div
            className="absolute inset-0 rounded-[28px] bg-white"
            style={{ boxShadow: CARD_SHADOW, transform: `rotate(${rotate}deg)` }}
          >
            {children}
          </div>
          {illustration && (
            <img
              src={illustration.src}
              alt=""
              className="pointer-events-none absolute select-none"
              style={{ left: illustration.left, top: illustration.top, width: illustration.width, height: illustration.height }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * A hero call to action drawn as a card, in the same family as the trust
 * notes: rounded, soft shadow, slight tilt. The outer div carries position and
 * tilt, the inner link carries the hover lift (an inline `transform` on the
 * link would beat the hover class). Deliberately not inside a `hero-pop`
 * wrapper — those loop out of view, and a link must always be there.
 */
function CtaCard({
  href,
  left,
  top,
  width,
  rotate,
  tone,
  title,
  caption,
  external,
}: {
  href: string;
  left: number;
  top: number;
  width: number;
  rotate: number;
  tone: 'dark' | 'light';
  title: string;
  caption?: string;
  external?: boolean;
}) {
  const dark = tone === 'dark';
  return (
    <div className="absolute" style={{ left, top, width, transform: `rotate(${rotate}deg)` }}>
      <a
        href={href}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        className={`group flex items-center justify-between gap-5 rounded-[22px] px-5 py-4 transition-transform duration-300 ease-out hover:-translate-y-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3434ff] focus-visible:ring-offset-4 focus-visible:ring-offset-[#ededed] ${
          dark ? 'bg-[#11110f] text-white' : 'bg-white text-black'
        }`}
        style={{ boxShadow: CARD_SHADOW }}
      >
        <span className="block min-w-0">
          <span className="block" style={{ fontFamily: LITERATA, fontSize: 18, lineHeight: '24px' }}>
            {title}
          </span>
          {caption && (
            <span
              className="mt-0.5 block"
              style={{
                fontFamily: "var(--font-manrope), 'Manrope', sans-serif",
                fontSize: 12,
                lineHeight: '16px',
                color: dark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)',
              }}
            >
              {caption}
            </span>
          )}
        </span>
        <span
          aria-hidden="true"
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform duration-300 group-hover:translate-x-1 ${
            dark ? 'bg-white text-[#11110f]' : 'bg-[#11110f] text-white'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
            <path d="M3 9h11m0 0L9.5 4.5M14 9l-4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </a>
    </div>
  );
}

function useCanvasScale(designWidth: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    // A width of 0 on the first layout pass would otherwise leave the whole
    // graphic hidden until something resized the window, so retry on the next
    // frame until the container has a real width.
    const update = () => {
      const w = el.getBoundingClientRect().width || el.offsetWidth;
      if (w > 0) {
        setScale(w / designWidth);
      } else {
        raf = requestAnimationFrame(update);
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [designWidth]);

  return { ref, scale };
}

function Label({ left, top, children }: { left: number; top: number; children: string }) {
  return (
    <h3
      className="absolute m-0 whitespace-nowrap font-normal text-black"
      style={{ left, top, transform: 'translateY(-50%)', fontFamily: LITERATA, fontSize: 80, lineHeight: '50px' }}
    >
      {children}
    </h3>
  );
}

/**
 * A pin from the source file. Every number here is the node's own geometry as
 * Figma reports it — disc, pastel inset, stem offset and the 90px stem length
 * — not eyeballed. Getting the stem length wrong (it is 90, overlapping the
 * disc, for a 141.125 total) is what made an earlier pass read as too long.
 */
function Pin({
  left,
  top,
  height,
  ring,
  fill,
  discX = 0,
  discY = 0,
  stemX,
  delay = 0,
  children,
}: {
  left: number;
  top: number;
  height: number;
  ring: string;
  fill: string;
  discX?: number;
  discY?: number;
  stemX: number;
  /** Offset into the idle bob/wiggle so the four pins don't move in lockstep. */
  delay?: number;
  children: React.ReactNode;
}) {
  const discCentre = `${discX + 32}px ${discY + 32}px`;
  return (
    <div className="hero-bob absolute" style={{ left, top, width: 76, height, animationDelay: `${delay}s` }}>
      <div className="hero-poke pointer-events-auto absolute inset-0" style={{ transformOrigin: discCentre }}>
        <span
          className="absolute rounded-[6px]"
          style={{ left: stemX, top: height - 90, width: 6, height: 90, background: ring }}
        />
        <div className="absolute rounded-full" style={{ left: discX, top: discY, width: 64, height: 64, background: ring }} />
        <div
          className="absolute rounded-full"
          style={{ left: discX + 3.82, top: discY + 4, width: 56, height: 56, background: fill }}
        />
        <div className="hero-wiggle absolute inset-0" style={{ transformOrigin: discCentre, animationDelay: `${delay * 1.7}s` }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * The connectors, redrawn as SVG paths (they were flat PNG exports) so they
 * can be animated: each one draws itself out of the One System pill — or, for
 * BizOps, out of Workflows — with its arrowhead riding the tip, and only once
 * the arrow arrives does its label pop in. After that the dashes keep
 * marching outward, so the diagram reads as the pill feeding everything.
 *
 * Geometry is traced off the old PNG exports (same bounding boxes, same
 * corner radii), in the lockup's 1440-wide design space. `line` stops a few
 * px short of the arrow tip so the 3px stroke doesn't poke past the head;
 * `head` runs on to the tip and is what the arrowhead travels along.
 * The draw-in is a mask (a solid stroke whose dashoffset sweeps 1 → 0 over
 * a normalised pathLength), because the visible path's own dasharray is
 * already spoken for by the dashes.
 */
const FLOWS = [
  {
    key: 'workflows',
    line: 'M 1042 375.5 H 1058 A 34 34 0 0 0 1092 341.5 V 316.5 A 34 34 0 0 0 1058 282.5 H 1046',
    head: 'M 1042 375.5 H 1058 A 34 34 0 0 0 1092 341.5 V 316.5 A 34 34 0 0 0 1058 282.5 H 1041',
  },
  {
    key: 'bizops',
    line: 'M 920.5 263 V 228.5 A 25 25 0 0 0 895.5 203.5 H 744',
    head: 'M 920.5 263 V 228.5 A 25 25 0 0 0 895.5 203.5 H 739',
  },
  {
    key: 'data',
    line: 'M 598 392 H 564',
    head: 'M 598 392 H 559',
  },
  {
    key: 'aiagent',
    line: 'M 708.5 439 V 465.5 A 31 31 0 0 0 739.5 496.5 H 771',
    head: 'M 708.5 439 V 465.5 A 31 31 0 0 0 739.5 496.5 H 776',
  },
] as const;

function FlowLines() {
  return (
    <svg
      aria-hidden="true"
      className="hero-flow pointer-events-none absolute left-0 top-0 overflow-visible"
      width={CANVAS_WIDTH}
      height={800}
    >
      {FLOWS.map((f) => (
        <g key={f.key}>
          <mask id={`hero-flow-mask-${f.key}`} maskUnits="userSpaceOnUse" x={0} y={0} width={CANVAS_WIDTH} height={800}>
            <path
              d={f.line}
              className={`hero-draw hero-draw-${f.key}`}
              fill="none"
              stroke="#fff"
              strokeWidth={10}
              pathLength={1}
              strokeDasharray="1 1"
            />
          </mask>
          <path
            d={f.line}
            mask={`url(#hero-flow-mask-${f.key})`}
            className="hero-march"
            fill="none"
            stroke="#000"
            strokeWidth={3}
            strokeDasharray="8 5"
          />
          {/* Tip at (0,0) pointing along +x, so offset-rotate: auto aims it
              down the path and its point lands exactly on the path end. */}
          <path
            d="M -11 -7 L 0 0 L -11 7 Z"
            className={`hero-head hero-head-${f.key}`}
            fill="#000"
            style={{ offsetPath: `path('${f.head}')` }}
          />
        </g>
      ))}
    </svg>
  );
}

/**
 * The card's ground: the Figma blobs and grain, painted across the *whole*
 * card rather than only the diagram's box. Keeping this separate is what
 * stops a hard seam where the diagram canvas ends and the CTA block begins —
 * the gradient and texture have to run the full height of the card.
 *
 * The blobs are positioned in the same 1440-wide design space as the diagram
 * and scaled with it; the grain is a repeating tile, so it just covers.
 */
export function HeroCardBackdrop() {
  const { ref, scale } = useCanvasScale(CANVAS_WIDTH);

  return (
    <div ref={ref} aria-hidden="true" className="absolute inset-0 overflow-hidden" style={{ background: '#ededed' }}>
      {/* Concentric arcs (node 14:745) — a 1628px circle set rotated inside
          its own 2223.889px box. Dropped from an earlier pass by mistake. */}
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          transform: scale ? `scale(${scale})` : undefined,
          visibility: scale ? 'visible' : 'hidden',
        }}
      >
        <div
          className="absolute flex items-center justify-center"
          style={{ left: -398, top: -722 + TOP_PAD, width: 2223.889, height: 2223.889 }}
        >
          <img
            src={imgLines}
            alt=""
            className="max-w-none"
            style={{ width: 1628, height: 1628, transform: 'rotate(-60deg)' }}
          />
        </div>
      </div>

      {/* grain, tiled across the entire card */}
      <div
        className="absolute inset-0 mix-blend-overlay"
        style={{
          backgroundImage: `url(${imgTexture})`,
          backgroundSize: '134px 134px',
          backgroundRepeat: 'repeat',
          opacity: 0.35,
        }}
      />
    </div>
  );
}

export default function HeroDiagramGraphic() {
  const { ref, scale } = useCanvasScale(CANVAS_WIDTH);

  return (
    <div
      ref={ref}
      className="relative w-full overflow-hidden"
      style={{ aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}` }}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          transform: scale ? `scale(${scale})` : undefined,
          visibility: scale ? 'visible' : 'hidden',
        }}
      >
        <div
          className="absolute inset-x-0 bottom-0"
          style={{ top: TOP_PAD, transform: `scale(${LOCKUP_SCALE})`, transformOrigin: '50% 0' }}
        >
          {/* Build-up sequence (timings in globals.css): the pill first,
              then each arrow draws itself out of it (FlowLines) and its
              label + pin pop in only when the arrowhead lands — Workflows,
              BizOps (chained off Workflows), Data, AI Agent — then the
              tagline and the trust cards. transformOrigin is each group's own bounding-box centre so the
              pop reads as that piece arriving in place, not the whole 1440px
              canvas scaling from its centre. */}
          <div className="hero-pop hero-pop-1 pointer-events-none absolute inset-0" style={{ transformOrigin: '820px 387px' }}>
            <div
              className="hero-pill-poke pointer-events-auto absolute"
              style={{ left: 598.32, top: 335, width: 443.32, height: 103.4 }}
            >
              <div
                className="hero-jelly absolute inset-0 flex items-center justify-center rounded-[30px]"
                style={{ background: '#3434ff' }}
              >
                {/* line-height: 1 (not the 50px used elsewhere in the diagram)
                    — this text is centred by the pill's flexbox, and a line box
                    shorter than the 70px font size let Literata's descender
                    push the glyphs down instead of centring them. */}
                <span className="font-normal text-white" style={{ fontFamily: LITERATA, fontSize: 70, lineHeight: 1 }}>
                  One System
                </span>
              </div>
            </div>
          </div>

          <FlowLines />

          <div className="hero-pop hero-pop-2 pointer-events-none absolute inset-0" style={{ transformOrigin: '683px 178px' }}>
            <img src={imgSoftStar} alt="" className="hero-twinkle absolute" style={{ animationDelay: '0.4s', left: 908, top: 136, width: 70, height: 75 }} />
            <Label left={444} top={194.5}>BizOps</Label>
            <Pin left={692} top={92} height={141.125} ring="#ffb366" fill="#ffeddb" stemX={28.82} delay={0}>
              {/* Only the computer is clipped by its disc in the source; the
                  rest sit over theirs, which is why they read larger. */}
              <div className="absolute overflow-hidden rounded-full" style={{ left: 3.82, top: 4, width: 56, height: 56 }}>
                <img src={imgComputer} alt="" className="absolute max-w-none" style={{ left: -4, top: -5.88, width: 64, height: 64 }} />
              </div>
            </Pin>
          </div>

          <div className="hero-pop hero-pop-3 pointer-events-none absolute inset-0" style={{ transformOrigin: '846px 257px' }}>
            <Label left={598} top={279.5}>Workflows</Label>
            <Pin left={997} top={173} height={141.125} ring="#9a139a" fill="#f5d2f5" stemX={28.82} delay={0.8}>
              <img src={imgSmartphone} alt="" className="absolute max-w-none" style={{ left: 0, top: 0, width: 64, height: 64 }} />
            </Pin>
          </div>

          <div className="hero-pop hero-pop-4 pointer-events-none absolute inset-0" style={{ transformOrigin: '493px 391px' }}>
            <Label left={365} top={381.5}>Data</Label>
            <Pin left={523} top={280} height={144.125} ring="#138e9a" fill="#d2ecf5" discX={1} discY={3} stemX={29.82} delay={1.6}>
              <div className="absolute flex items-center justify-center" style={{ left: 0, top: 0, width: 65.61, height: 65.61 }}>
                <img
                  src={imgFolder}
                  alt=""
                  className="max-w-none"
                  style={{ width: 55.374, height: 55.374, transform: 'rotate(-11.91deg)' }}
                />
              </div>
            </Pin>
            <img src={imgSoftStar} alt="" className="hero-twinkle absolute" style={{ animationDelay: '2.2s', left: 551, top: 428, width: 70, height: 75 }} />
          </div>

          <div className="hero-pop hero-pop-5 pointer-events-none absolute inset-0" style={{ transformOrigin: '934px 446px' }}>
            <Label left={773} top={479.5}>AI Agent</Label>
            <Pin left={1085} top={375} height={141.125} ring="#6495d4" fill="#d2ecf5" discX={6} discY={0} stemX={34.82} delay={2.4}>
              <div className="absolute overflow-hidden" style={{ left: 0, top: 5, width: 76, height: 52 }}>
                <img
                  src={imgSmartwatchBot}
                  alt=""
                  className="absolute max-w-none"
                  style={{ left: '-15.68%', top: '-21.89%', width: '124.52%', height: '121.74%' }}
                />
              </div>
            </Pin>
          </div>

          <div className="hero-pop hero-pop-6 pointer-events-none absolute inset-0" style={{ transformOrigin: '720px 619px' }}>
            {/* Tagline lane: x 300-1140 at its widest line. The 500+ and NVIDIA
                cards are parked outside it (left < 210, left > 1215) so the
                copy can run at a readable size without sliding under them.
                Plain <p>s on purpose: a global `span` rule swaps spans to
                Manrope. */}
            <div className="absolute text-center" style={{ left: 0, top: 553, width: CANVAS_WIDTH }}>
              <p
                className="m-0 font-normal text-black"
                style={{ fontFamily: LITERATA, fontSize: 42, lineHeight: '52px' }}
              >
                Your business, minus the busywork
              </p>
              <p
                className="m-0 font-normal"
                style={{ marginTop: 10, fontFamily: LITERATA, fontSize: 28, lineHeight: '40px', color: 'rgba(0,0,0,0.55)' }}
              >
                Aivory takes you from first analysis to AI that works with you
                <br />
                No handoffs, no patchwork
              </p>
            </div>
          </div>

          {/* Step 7 of the pop-in sequence — after the tagline (step 6), see
              globals.css. transformOrigin is the bounding-box centre of all
              three cards + their illustrations, so the group pops in place. */}
          <div className="hero-pop hero-pop-7 pointer-events-none absolute inset-0" style={{ transformOrigin: '796px 423px' }}>
            <Note left={78} top={515} size={176.36} rotate={13} scale={0.72} delay={0} illustration={{ src: imgKeynote, width: 146, height: 147, left: 32, top: -95 }}>
              <p
                className="absolute m-0 whitespace-nowrap font-normal text-black"
                style={{ left: 21, top: 46, transform: 'translateY(-50%)', fontFamily: LITERATA, fontSize: 51, lineHeight: '50px' }}
              >
                500+
              </p>
              <p
                className="absolute m-0 font-normal text-black"
                style={{ left: 27, top: 101, width: 123, transform: 'translateY(-50%)', fontFamily: LITERATA, fontSize: 17, lineHeight: '17px' }}
              >
                Business running
                <br />
                on Aivory
              </p>
            </Note>

            {/* Shifted 90px right from the Figma position: at the source's
                own placement (left: 1129.11) the card's left edge started
                inside the AI Agent pin (977-1151) and its label (773-1105).
                Our diagram doesn't share Figma's exact proportions here, so
                the same raw coordinate collides where it didn't in the
                source. */}
            <Note left={1219} top={366.57} size={196.906} rotate={-3} scale={0.72} delay={1.4} illustration={{ src: imgHand, width: 109.81, height: 109.81, left: 30.83, top: -4.55 }}>
              <p
                className="absolute m-0 font-normal text-black"
                style={{ left: 22, top: 131, width: 135, transform: 'translateY(-50%)', fontFamily: LITERATA, fontSize: 17, lineHeight: '17px' }}
              >
                Zero training
                <br />
                on your data
              </p>
            </Note>

            <Note left={1236} top={595} size={124.82} rotate={-4} delay={2.6}>
              <img
                src={imgNvidiaBadge}
                alt="NVIDIA Inception Program — Aivory AI is a member (2026 cohort)"
                className="absolute"
                style={{ left: 13, top: 15, width: 86, height: 32 }}
              />
              <p
                className="absolute m-0 font-normal text-black"
                style={{ left: 17, top: 75, width: 92, transform: 'translateY(-50%)', fontFamily: LITERATA, fontSize: 14, lineHeight: '14px' }}
              >
                NVIDIA
                <br />
                Inception member
              </p>
            </Note>
          </div>

          {/* Desktop only: below lg the scaled canvas would shrink these to
              unreadable, hard-to-tap sizes, so HeroSection renders its own
              full-size buttons there. Staggered rather than side by side. */}
          <div className="hidden lg:block">
            <CtaCard
              href="/free-diagnostic"
              left={320}
              top={768}
              width={380}
              rotate={-1.5}
              tone="dark"
              title="Start free analysis"
              caption="Self-guided · One sitting · No sales pitch"
            />
            <CtaCard
              href={WALKTHROUGH_URL}
              left={760}
              top={804}
              width={290}
              rotate={1.5}
              tone="light"
              title="Book Demo"
              external
            />
          </div>
        </div>
      </div>
    </div>
  );
}
