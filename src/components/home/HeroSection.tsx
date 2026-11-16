'use client';

import Link from 'next/link';
import styles from './hero/HeroOrbit.module.css';
import { HERO_CARDS, HeroCard } from './hero/HeroCards';
import HeroPrompt from './hero/HeroPrompt';
import HeroBlob from './hero/HeroBlob';

export const WALKTHROUGH_URL = 'https://book.aivory.uk/book/aivory-call';

/** How many times each rail repeats its cards. One repeat is one loop of the
 *  animation, so four keep the row filled on screens up to about 5000px wide. */
const COPIES = [0, 1];

/** Two rails: every card once. Surfaces take turns (gradient, photo, dark UI, white)
 *  so no two of a kind or two near hues sit side by side, also across the seams. */
const RAIL_A = ['automate', 'photo-celebrating', 'ui-crm', 'streamline', 'aether', 'audit', 'ui-timeline', 'apps'];
const RAIL_B = ['decision', 'mail', 'team', 'encrypted', 'photo-profile', 'ui-report', 'sovereignty', 'proof'];
// One rail carries all sixteen cards, at the foot of the hero.
const ROWS = [[...RAIL_A, ...RAIL_B]];
const byId = (ids: string[]) => ids.map((id) => HERO_CARDS.find((c) => c.id === id)!);

/**
 * The hero is one light field: the headline, sub line, the console-style prompt
 * and buttons on top, and one rail of cards running along the foot. The layout
 * and motion are the same at every width; only the card size changes. The rail
 * is a CSS animation (transform only), so there is no script loop here.
 *
 * `hero` opts the whole block out of ScrollRevealProvider's global `h2, p`
 * GSAP pass, which would otherwise hold the subline at opacity 0 on first paint.
 */
export default function HeroSection() {
  return (
    <div className="hero relative w-full pb-16 md:pb-24">
      <div className="relative z-10 w-full animate-slide-up-1">
        <div className={styles.root}>
          <HeroBlob />
          <div className={styles.copy}>
            <h1 className={styles.h}>Your business, minus the busywork</h1>
            <p className={styles.sub}>
              Aivory takes you from first analysis to AI that works with you at any scale
            </p>
            <HeroPrompt />
            <div className={styles.cta}>
              <Link href="/free-diagnostic" className={`${styles.btn} ${styles.btnPrimary}`}>
                Start free operations analysis
              </Link>
              <a
                href={WALKTHROUGH_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.btn} ${styles.btnGhost}`}
              >
                Book a walkthrough
              </a>
            </div>
          </div>

          <div className={styles.rails} aria-label="What Aivory does for an enterprise">
            {ROWS.map((ids, r) => (
              <div key={r} className={styles.row} data-dir={r ? 'back' : 'fwd'}>
                <div className={styles.track}>
                  {COPIES.map((copy) =>
                    byId(ids).map((def) => (
                      // The upper rail's first run is the readable one; the rest is decoration.
                      <div key={`${copy}-${def.id}`} className={styles.slot} aria-hidden={r > 0 || copy > 0 || undefined}>
                        <HeroCard def={def} decorative={r > 0 || copy > 0} />
                      </div>
                    )),
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Trust strip: the programme Aivory belongs to. Sits inside the hero, on its
              background, so there is no band or divider under the ring. */}
          <ul className={styles.trust} aria-label="Programs Aivory belongs to">
            <li>
              <span>Member of</span>
              <Link href="/nvidia-inception" aria-label="NVIDIA Inception Program">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className={styles.trustBadge}
                  src="/images/nvidia-inception/nvidia-inception-program-badge-rgb-for-screen.svg"
                  alt="NVIDIA Inception Program"
                  width={450}
                  height={166}
                  loading="lazy"
                  decoding="async"
                />
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
