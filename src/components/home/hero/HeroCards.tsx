'use client';

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { MODE_DRAWS, resolvePreset } from 'thinking-orbs';
import styles from './HeroOrbit.module.css';

/** Draws the Aether orb at time `t` (seconds). */
type OrbDraw = (t: number) => void;


/* ------------------------------------------------------------------ Aether orb */

// The Aether orb is the "solving" orb from thinking-orbs (MIT, Jakub Antalik):
// a dotted sphere whose bands scramble in quarter turns and click back solved.
// Its 64px tuning is drawn through a scaled transform, so the dots stay crisp
// at card size, in dark ink for the light card.
const ORB_PRESET = resolvePreset('solving', 64);
const ORB_PAINT = MODE_DRAWS[ORB_PRESET.mode];
const ORB_PX = 288; // the 64px design on the 360px canvas
const ORB_K = ORB_PX / 64;
const ORB_X = (360 - ORB_PX) / 2;
const ORB_Y = 22;

// Aurora glass behind the dots: a clear sphere with slow pastel light inside
// (brand blue, violet, ember, ice), a soft rim and one specular arc. A few
// gradient fills per frame, no filters.
const TAU = Math.PI * 2;
const GLASS_R = 126;
const GLASS_X = ORB_X + ORB_PX / 2;
const GLASS_Y = ORB_Y + ORB_PX / 2;
const AURORA: { c: string; r: number; d: number; w: number; p: number }[] = [
  { c: '86,140,255', r: 0.95, d: 0.5, w: 0.23, p: 0.2 },
  { c: '156,120,255', r: 0.8, d: 0.55, w: -0.17, p: 2.3 },
  { c: '255,146,84', r: 0.72, d: 0.6, w: 0.19, p: 4.2 },
  { c: '120,222,235', r: 0.7, d: 0.5, w: -0.27, p: 5.6 },
];

function makeOrbDrawer(ctx: CanvasRenderingContext2D): OrbDraw {
  const R = GLASS_R;
  const cx = GLASS_X;
  const cy = GLASS_Y;
  const base = ctx.createRadialGradient(cx - R * 0.2, cy - R * 0.3, 0, cx, cy, R);
  base.addColorStop(0, 'rgba(255,255,255,.95)');
  base.addColorStop(1, 'rgba(228,236,255,.9)');
  const clear = ctx.createRadialGradient(cx, cy - R * 0.1, 0, cx, cy - R * 0.1, R * 0.9);
  clear.addColorStop(0, 'rgba(255,255,255,.55)');
  clear.addColorStop(1, 'rgba(255,255,255,0)');
  const rim = ctx.createRadialGradient(cx, cy, R * 0.74, cx, cy, R);
  rim.addColorStop(0, 'rgba(40,60,150,0)');
  rim.addColorStop(1, 'rgba(40,60,150,.2)');
  const edge = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
  edge.addColorStop(0, 'rgba(255,255,255,1)');
  edge.addColorStop(0.5, 'rgba(150,170,230,.35)');
  edge.addColorStop(1, 'rgba(255,255,255,.9)');
  const blob = (x: number, y: number, r: number, c: string, a: number) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${c},${a})`);
    g.addColorStop(0.5, `rgba(${c},${a * 0.45})`);
    g.addColorStop(1, `rgba(${c},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };

  return (t) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, 360, 360);

    // Light the sphere throws on the card around it.
    for (const b of AURORA) {
      const a = t * b.w + b.p;
      blob(cx + Math.cos(a) * R * 0.5, cy + Math.sin(a * 1.2 + b.p) * R * 0.5 + R * 0.12, R * 1.25, b.c, 0.13);
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.clip();
    ctx.fillStyle = base;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    for (const b of AURORA) {
      const a = t * b.w + b.p;
      blob(cx + Math.cos(a) * R * b.d, cy + Math.sin(a * 1.2 + b.p) * R * b.d, R * b.r, b.c, 0.62);
    }
    ctx.fillStyle = clear;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    ctx.fillStyle = rim;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    ctx.restore();

    ctx.strokeStyle = edge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, R - 1, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.86, Math.PI * 1.13, Math.PI * 1.4);
    ctx.stroke();

    // The solving orb, in dark ink, inside the glass.
    ctx.setTransform(ORB_K, 0, 0, ORB_K, ORB_X, ORB_Y);
    ORB_PAINT(ctx, 64, t * ORB_PRESET.speed, false, ORB_PRESET.opts);
  };
}

function AetherOrb() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const draw = makeOrbDrawer(ctx);
    draw(9);
    // Each orb runs its own loop at half rate, only while it is on screen,
    // and not at all under reduced motion.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    let frame = 0;
    const loop = (now: number) => {
      if ((frame++ & 1) === 0) draw(now / 1000);
      raf = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(([e]) => {
      cancelAnimationFrame(raf);
      raf = e.isIntersecting ? requestAnimationFrame(loop) : 0;
    });
    io.observe(canvas);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, []);
  return <canvas ref={ref} width={360} height={360} className={styles.orbCanvas} aria-hidden="true" />;
}

/* ------------------------------------------------------------------ product UI crops */

/*
 * Three cards show the product itself rather than an illustration. They are
 * rebuilt in markup from the dashboard's own components (the CRM Deals board, the
 * diagnostic report's ScoreRing + ROIMetricTile, the workspace Gantt view:
 * same colours, radii, type scale), with sample data, so they stay sharp at every ring size and carry
 * no account data.
 */

/** CRM pipeline close-up: one stage column of the Deals board, the next stage running off the card. */
const CRM_COLS: { stage: string; tone: 'qualified' | 'proposal'; count: number; total: string; deals: [string, string][] }[] = [
  {
    stage: 'Qualified',
    tone: 'qualified',
    count: 3,
    total: '84,000',
    deals: [
      ['Northwind renewal', 'Northwind · $48,000'],
      ['Acme onboarding', 'Acme Corp · $36,000'],
    ],
  },
  {
    stage: 'Proposal',
    tone: 'proposal',
    count: 2,
    total: '61,500',
    deals: [
      ['Halden rollout', 'Halden · $40,000'],
      ['Kite pilot', 'Kite Labs · $21,500'],
    ],
  },
];
const UiCrm = () => (
  <div className={styles.uiCrm} aria-hidden="true">
    {CRM_COLS.map((col) => (
      <section key={col.stage} className={styles.uiCrmCol}>
        <header>
          <i data-tone={col.tone} />
          <b>{col.stage}</b>
          <span>{col.count}</span>
          <em>{col.total}</em>
        </header>
        {col.deals.map(([title, meta]) => (
          <p key={title}>
            <b>{title}</b>
            {meta}
          </p>
        ))}
      </section>
    ))}
  </div>
);

/** Diagnostic report close-up: readiness ring plus two Financial Case cells. */
const RING_R = 24;
const RING_C = 2 * Math.PI * RING_R;
const UiReport = () => (
  <div className={styles.uiReport} aria-hidden="true">
    <div className={styles.uiScore}>
      <svg viewBox="0 0 64 64" width="54" height="54">
        <circle cx="32" cy="32" r={RING_R} className={styles.uiRingTrack} />
        <circle
          cx="32"
          cy="32"
          r={RING_R}
          className={styles.uiRingArc}
          strokeDasharray={`${(RING_C * 0.72).toFixed(1)} ${RING_C.toFixed(1)}`}
          transform="rotate(-90 32 32)"
        />
        <text x="32" y="33.5" className={styles.uiRingNum}>
          72
        </text>
      </svg>
      <span>
        <b>Sample report</b>
        <em>AI readiness</em>
      </span>
    </div>
    <dl className={styles.uiMetrics}>
      <div>
        <dt>Hours saved</dt>
        <dd>2,340</dd>
      </div>
      <div>
        <dt>Payback</dt>
        <dd>4.2 mo</dd>
      </div>
    </dl>
  </div>
);

/** Workspace timeline close-up: a week of the Gantt view, today and a deadline marked. */
const GANTT_DAYS = [11, 12, 13, 14, 15, 16, 17];
const GANTT_TODAY = 13;
const GANTT_BARS: { label: string; tone: 'done' | 'doing' | 'todo'; left: number; width: number }[] = [
  { label: 'Vendor setup', tone: 'done', left: 4, width: 82 },
  { label: 'Q4 close', tone: 'doing', left: 46, width: 104 },
  { label: 'Board deck', tone: 'todo', left: 102, width: 110 },
];
const UiTimeline = () => (
  <div className={styles.uiGantt} aria-hidden="true">
    <i className={styles.uiGanttGrid} />
    <div className={styles.uiGanttDays}>
      {GANTT_DAYS.map((d) => (
        <span key={d} data-today={d === GANTT_TODAY || undefined}>
          <b>{d}</b>
        </span>
      ))}
    </div>
    <i className={styles.uiGanttToday} />
    <i className={styles.uiGanttDeadline} />
    {GANTT_BARS.map((b, i) => (
      <span key={b.label} className={styles.uiGanttBar} data-tone={b.tone} style={{ left: b.left, width: b.width, top: 34 + i * 24 }}>
        {b.label}
      </span>
    ))}
  </div>
);

/** Aivory Mail: the app mark glowing over a field of ciphertext, which melts away
 *  around it. The hex is generated from a fixed seed so server and client match. */
const CIPHER = (() => {
  let x = 0x5eed1e55;
  let out = '';
  for (let i = 0; i < 440; i++) {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    out += '0123456789abcdef'[x >>> 28] + (i % 4 === 3 ? ' ' : '');
  }
  return out;
})();

const UiMail = () => (
  <div className={styles.mail} aria-hidden="true">
    <p>{CIPHER}</p>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src="/integrations/icons/aivory-mail.svg" alt="" width={92} height={92} loading="lazy" decoding="async" />
  </div>
);

/* ------------------------------------------------------------------ card bodies */

/** Bump (and rename the files) whenever the renders change: Cloudflare caches
 *  /landing/* for a year, so a new image needs a new URL. */
const RENDER_VERSION = 'v14';

/** The whole card art, baked to one WebP: a gradient sampled from the brand references, one clear-glass
    object in extreme close-up refracting it, and the film grain (scripts/hero-renders/glass). */
const Render = ({ name }: { name: string }) => (
  <img
    className={styles.render}
    src={`/landing/hero/render-${name}-${RENDER_VERSION}.webp`}
    alt=""
    aria-hidden="true"
    loading="lazy"
    decoding="async"
    draggable={false}
  />
)

const IMG = '/landing/hero';
const ICONS = '/integrations/icons';

/** Two tidy rows of four, each mark in the same 30px box. */
const APP_ICONS: string[] = [
  `${IMG}/app-gmail.svg`,
  `${ICONS}/slack.svg`,
  `${ICONS}/notion.svg`,
  `${IMG}/app-hubspot.svg`,
  `${ICONS}/google-calendar.svg`,
  `${ICONS}/shopify.svg`,
  `${ICONS}/jira.svg`,
  `${ICONS}/odoo.svg`,
];

type Head = { name: string; w: number; x: number; y: number; r: number; far?: boolean };
const HEADS: Head[] = [
  { name: 'ofira', w: 44, x: 6, y: 74, r: 9, far: true },
  { name: 'finn', w: 54, x: 128, y: 12, r: 10 },
  { name: 'teo', w: 66, x: 20, y: 14, r: -8 },
  { name: 'geno', w: 48, x: 138, y: 72, r: -7, far: true },
  { name: 'lex', w: 46, x: 84, y: 2, r: 5 },
  { name: 'aira', w: 80, x: 60, y: 40, r: 3 },
];

export type CardDef = {
  id: string;
  /** Extra class names from the module (surface + palette). */
  classes: string[];
  body: (o: { decorative: boolean }) => ReactNode;
};

const cap = (text: string) => <span className={styles.cap}>{text}</span>;
/** Dark UI cards: live caption on a folder-shaped liquid-glass pane, the shape baked into the gradient cards. */
const uiCap = (text: string) => <span className={`${styles.cap} ${styles.fold}`}>{text}</span>;
/** Caption for the baked cards. The folder-shaped liquid-glass pane behind it is part of the WebP
    (sized to this caption at 196px), so the moving rails need no live blur. */
const glassCap = (text: string) => <span className={`${styles.cap} ${styles.folder}`}>{text}</span>;
const photo = (src: string, alt: string, decorative: boolean) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src} alt={decorative ? '' : alt} width={480} height={480} loading="lazy" decoding="async" />
);


export const HERO_CARDS: CardDef[] = [
  {
    id: 'audit',
    classes: ['shot'],
    body: () => (
      <>
        <Render name="audit" />
        {glassCap('Governed, with a full audit trail')}
      </>
    ),
  },
  {
    id: 'streamline',
    classes: ['shot'],
    body: () => (
      <>
        <Render name="growth" />
        {glassCap('Streamline your business operations')}
      </>
    ),
  },
  {
    id: 'ui-crm',
    classes: ['ui', 'uiLight'],
    body: () => (
      <>
        <UiCrm />
        {uiCap('Move every deal forward')}
      </>
    ),
  },
  {
    id: 'aether',
    classes: ['glass'],
    body: ({ decorative }) => (
      <>
        <AetherOrb />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={styles.orbLogo}
          src="/landing/aether/aivory-aether-black.svg"
          alt={decorative ? '' : 'Aivory Aether'}
          width={150}
          height={14}
          loading="lazy"
          decoding="async"
        />
      </>
    ),
  },
  {
    id: 'automate',
    classes: ['shot'],
    body: () => (
      <>
        <Render name="automation" />
        {glassCap('Build any automation')}
      </>
    ),
  },
  {
    id: 'apps',
    classes: ['glass'],
    body: () => (
      <>
        <div className={styles.icons} aria-hidden="true">
          {APP_ICONS.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt="" loading="lazy" decoding="async" />
          ))}
        </div>
        {cap('Works with 100+ apps')}
      </>
    ),
  },
  {
    id: 'encrypted',
    classes: ['shot'],
    body: () => (
      <>
        <Render name="lock" />
        {glassCap('Encrypted')}
      </>
    ),
  },
  {
    id: 'mail',
    classes: ['ui'],
    body: () => (
      <>
        <UiMail />
        {uiCap('Private, fully encrypted email')}
      </>
    ),
  },
  {
    id: 'ui-report',
    classes: ['ui', 'uiLight'],
    body: () => (
      <>
        <UiReport />
        {uiCap('Know where AI pays off')}
      </>
    ),
  },
  {
    id: 'team',
    classes: ['glass'],
    body: () => (
      <>
        <div className={styles.heads} aria-hidden="true">
          {HEADS.map((h, i) => (
            <i
              key={h.name}
              className={h.far ? styles.far : undefined}
              style={
                {
                  width: h.w,
                  left: h.x,
                  top: h.y,
                  '--r': `${h.r}deg`,
                  animationDuration: `${(5.5 + i * 0.8).toFixed(1)}s`,
                  animationDelay: `-${(i * 1.1).toFixed(1)}s`,
                } as CSSProperties
              }
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${IMG}/head-${h.name}.webp`} alt="" loading="lazy" decoding="async" />
            </i>
          ))}
        </div>
        {cap('Team of agentic workforce')}
      </>
    ),
  },
  {
    id: 'decision',
    classes: ['shot'],
    body: () => (
      <>
        <Render name="decision" />
        {glassCap('Faster decision making')}
      </>
    ),
  },
  {
    id: 'ui-timeline',
    classes: ['ui', 'uiLight'],
    body: () => (
      <>
        <UiTimeline />
        {uiCap('Keep every project on track')}
      </>
    ),
  },
  {
    id: 'sovereignty',
    classes: ['shot'],
    body: () => (
      <>
        <Render name="vault" />
        {glassCap('Data sovereignty')}
      </>
    ),
  },
  {
    id: 'proof',
    classes: ['glass', 'num'],
    body: () => (
      <>
        <b>500+</b>
        {cap('Business running on Aivory')}
      </>
    ),
  },
];

/** One card: the surface classes plus its body. */
export function HeroCard({ def, decorative = false }: { def: CardDef; decorative?: boolean }) {
  const cls = [styles.card, ...def.classes.map((c) => styles[c])].join(' ');
  return (
    <div className={cls} data-card={def.id}>
      {def.body({ decorative })}
      <i className={styles.frame} aria-hidden="true" />
    </div>
  );
}
