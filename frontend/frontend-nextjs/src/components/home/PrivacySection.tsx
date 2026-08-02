'use client';

import type { StaticImageData } from 'next/image';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

/**
 * Imported rather than referenced by public path so the emitted URL carries a
 * content hash. Swapping the art then changes the URL, which is the only thing
 * that reliably evicts an already-cached image from browsers and the CDN edge.
 */
import noTraining from '../../../public/images/privacy/01-no-training.webp';
import onPremise from '../../../public/images/privacy/02-on-premise.webp';
import compliance from '../../../public/images/privacy/03-compliance.webp';
import noLogs from '../../../public/images/privacy/04-no-logs.webp';
import endToEnd from '../../../public/images/privacy/05-end-to-end.webp';
import atRest from '../../../public/images/privacy/06-at-rest.webp';
import noSharing from '../../../public/images/privacy/07-no-sharing.webp';
import enterprise from '../../../public/images/privacy/08-enterprise.webp';

/**
 * Each card is a woven tapestry panel — hand-generated art living in
 * public/images/privacy. Masters are kept out of the bundle in art-masters/privacy.
 * Prompts and the regeneration brief: docs/privacy-card-art-prompts.json
 */
type Item = {
  text: string;
  tag: string;
  image: StaticImageData;
  /** Describes the tapestry itself, for anyone who can't see it. */
  alt: string;
  /** Warm base behind the panel while the image decodes. */
  tint: string;
};

const privacyItems: Item[] = [
  {
    text: "We don't train on your data.",
    tag: 'no training',
    image: noTraining,
    alt: 'An embroidered coat of arms: a padlock and globe on a shield held by a lion and a griffin, over a banner reading Privacy.',
    tint: '#2E2A1C',
  },
  {
    text: 'Processed & Stored Locally',
    tag: 'on-premise',
    image: onPremise,
    alt: 'An embroidered shield bearing a fortified castle with a golden padlock and key, flanked by stitched dragons.',
    tint: '#1D2A33',
  },
  {
    text: 'GDPR compliant by design.',
    tag: 'compliance',
    image: compliance,
    alt: 'An embroidered shield lettered GDPR ringed by twelve stars, encircled by stitched figures holding hands.',
    tint: '#3A2418',
  },
  {
    text: 'Zero server logging',
    tag: 'no logs',
    image: noLogs,
    alt: 'Embroidered server racks bound by a knotted cord reading Zero Logs, closed with a padlock marked Private.',
    tint: '#33291B',
  },
  {
    text: 'End to end private',
    tag: 'end-to-end',
    image: endToEnd,
    alt: 'Two stitched Renaissance figures holding a woven banner that reads End To End Private, cherubs in each corner.',
    tint: '#3A2A1E',
  },
  {
    text: 'Encrypted at rest',
    tag: 'at rest',
    image: atRest,
    alt: 'Two embroidered figures holding sealed scrolls, a padlock and key stitched between them inside a braided cord.',
    tint: '#2B3140',
  },
  {
    text: 'No third-party sharing',
    tag: 'no sharing',
    image: noSharing,
    alt: 'An embroidered guard with a padlock shield standing over a data chest, turning two cloaked figures away.',
    tint: '#3A1F18',
  },
  {
    text: 'Enterprise grade',
    tag: 'enterprise',
    image: enterprise,
    alt: 'A quartered embroidered coat of arms with a lion, a building, a tree and a wheat sheaf, held by two cherubs.',
    tint: '#22293A',
  },
];

export default function PrivacySection() {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section
      ref={ref}
      data-privacy-layout="editorial"
      data-privacy-icon-count="8"
      className={`animate-on-scroll ${isVisible ? 'is-visible' : ''} w-full border-t border-white/10 py-20 font-sans text-white md:py-28`}
    >
      <div className="mx-auto max-w-[1400px] px-6 md:px-12 lg:px-24">
        <div className="grid gap-10 pb-14 lg:grid-cols-12 lg:pb-20">
          <div className="lg:col-span-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">
              Privacy &amp; security / 01
            </p>
            <h2
              className="no-word-split mt-5 max-w-lg text-3xl font-light leading-[1.12] tracking-[-0.03em] md:text-[44px]"
              style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}
            >
              Data sovereignty is non-negotiable.
            </h2>
          </div>

          <div className="lg:col-span-6 lg:col-start-7 lg:self-end">
            <p
              className="max-w-2xl text-xl font-light leading-[1.55] tracking-[-0.015em] text-white/82 md:text-2xl"
              style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}
            >
              Your operational intelligence should remain under your control—at every layer of the system.
            </p>
            <p
              className="mt-7 max-w-xl text-[15px] font-light leading-7 text-white/55"
              style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}
            >
              Zero model training. Zero third-party logging. Your operational data remains entirely within your control.
            </p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {privacyItems.map((item, index) => (
            <article
              key={item.text}
              className="group rounded-[26px] border border-white/[0.09] bg-[#0C0C0F] p-2.5 shadow-[0_28px_64px_-34px_rgba(0,0,0,0.95)] transition duration-500 hover:-translate-y-1 hover:border-white/20"
            >
              <div
                className="relative aspect-[4/3] overflow-hidden rounded-[18px] ring-1 ring-inset ring-white/[0.07]"
                style={{ backgroundColor: item.tint }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image.src}
                  alt={item.alt}
                  width={item.image.width}
                  height={item.image.height}
                  loading={index < 4 ? 'eager' : 'lazy'}
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                />
                <span className="absolute right-3 top-3 rounded-full bg-black/45 px-2 py-0.5 font-mono text-[9px] tracking-[0.16em] text-white/85 backdrop-blur-sm">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>

              <div className="px-3 pb-3 pt-5">
                <p
                  className="text-[17px] leading-snug tracking-[-0.012em] text-white/88 md:text-lg"
                  style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}
                >
                  {item.text}
                </p>
                <div className="mt-5 flex items-center justify-between border-t border-white/[0.07] pt-3 font-mono text-[9px] uppercase tracking-[0.2em] text-white/32">
                  <span>{item.tag}</span>
                  <span className="transition-colors group-hover:text-white/55">✦</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
