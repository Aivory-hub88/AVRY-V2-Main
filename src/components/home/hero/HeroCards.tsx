'use client';

import type { CSSProperties, ReactNode } from 'react';
import styles from './HeroOrbit.module.css';

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
const RENDER_VERSION = 'v15';

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
