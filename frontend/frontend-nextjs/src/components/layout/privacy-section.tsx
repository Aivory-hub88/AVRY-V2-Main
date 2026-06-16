/**
 * Privacy & Security Section + "Need Expert Guidance?" Pre-Footer CTA
 *
 * Carbon copy of live site (stag.aivory.id) — index.html lines ~7230–7420.
 */

import React from 'react';

const ArrowIcon = ({ className = 'w-6 h-6', style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={`${className} shrink-0`} viewBox="0 0 24 24" fill="none" stroke={style?.color ?? 'currentColor'} strokeWidth="2">
    <path d="M17 7v10H7" />
    <path d="M7 7l10 10" />
  </svg>
);

const badges = [
  'GDPR ready',
  'No Data Training',
  'Local Processing Only',
  'Zero Server Logging',
  'End to End Private',
];

const serviceCards = [
  {
    title: 'AI Strategy Consultation',
    desc: 'Clarify priorities, validate opportunities, and sharpen your roadmap.',
  },
  {
    title: 'Custom AI Development',
    desc: 'Custom agents, workflows, integrations, and AI systems built around your business.',
  },
  {
    title: 'Corporate Training',
    desc: 'Practical workshops and executive programs for teams adopting AI.',
  },
  {
    title: 'Enterprise Advisory',
    desc: 'Long-term support for AI transformation, governance, and implementation.',
  },
];

export function PrivacySection() {
  return (
    <>
      {/* ── Privacy & Security ── */}
      <div
        id="privacy-section"
        className="!w-full !text-white !pt-24 !pb-12 !border-t !border-gray-900"
        style={{ background: '#050505' }}
      >
        <div className="!max-w-7xl !mx-auto !px-6 md:!px-12">
          <div className="!mb-4">
            <div className="!text-sm !font-medium !mb-6">Privacy &amp; Security</div>
            <h2 className="!text-5xl md:!text-6xl !font-medium !tracking-tight !mb-10">
              Your data stays<br />where it belongs.
            </h2>

            <div className="!border-t !border-white/20 !pt-8 !mt-12">
              <p className="!text-lg md:!text-xl !font-light !mb-12">
                No training. No logging. No exceptions. Everything runs in your browser.
              </p>

              <div className="!grid !grid-cols-1 md:!grid-cols-3 !gap-8 !mb-16 !max-w-4xl">
                {[
                  "We don't train\non your data.",
                  'Processed locally.\nStored locally.',
                  'GDPR compliant\nby design.',
                ].map((text) => (
                  <div key={text} className="!flex !items-start !gap-4">
                    <ArrowIcon className="w-6 h-6 mt-0.5 shrink-0" />
                    <p className="!text-xl !font-medium !leading-snug" style={{ whiteSpace: 'pre-line' }}>
                      {text}
                    </p>
                  </div>
                ))}
              </div>

              <div className="!flex !flex-wrap !gap-4">
                {badges.map((badge) => (
                  <div
                    key={badge}
                    className="!flex !items-center !gap-2 !border !border-white/20 !px-4 !py-2.5 !text-xs md:!text-sm !font-medium"
                  >
                    <ArrowIcon className="w-4 h-4" style={{ color: '#05e5ba' }} />
                    {badge}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Need Expert Guidance? ── */}
      <div
        id="expert-guidance"
        className="!w-full !text-white !pt-12 !pb-24"
        style={{ background: '#050505' }}
      >
        <div className="!max-w-7xl !mx-auto !px-6 md:!px-12">
          <h2 className="!text-5xl md:!text-6xl !font-medium !tracking-tight !mb-6">
            Need Expert Guidance?
          </h2>
          <p className="!text-white !text-xl md:!text-2xl !font-semibold !mb-4">
            Some AI decisions are too important to leave to guesswork.
          </p>
          <p className="!text-lg md:!text-xl !font-light !mb-10 !max-w-4xl" style={{ color: '#b2b2b2' }}>
            Work directly with Aivory experts to validate your strategy, design custom AI systems, train your teams, and accelerate implementation.
          </p>

          <div className="!border-t !border-white/20 !mb-12" />

          {/* 2×2 service cards */}
          <div className="!grid !grid-cols-1 md:!grid-cols-2 !gap-8 !mb-14">
            {serviceCards.map((card) => (
              <div
                key={card.title}
                className="!border !border-white/10 !p-8 hover:!border-white/25 !transition-colors"
              >
                <h3 className="!text-xl !font-semibold !text-white !mb-3">{card.title}</h3>
                <p className="!font-light !leading-relaxed" style={{ color: '#b2b2b2' }}>{card.desc}</p>
              </div>
            ))}
          </div>

          {/* CTA buttons */}
          <div className="!flex !flex-wrap !gap-6">
            <button
              type="button"
              className="!px-8 !py-4 !bg-white !text-black !font-semibold hover:!bg-gray-200 !transition-colors !text-lg"
            >
              Book a Strategy Session
            </button>
            <button
              type="button"
              className="!px-8 !py-4 !border !border-white/30 !text-white !font-semibold hover:!border-white/60 !transition-colors !text-lg"
            >
              Talk to Our Team
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default PrivacySection;
