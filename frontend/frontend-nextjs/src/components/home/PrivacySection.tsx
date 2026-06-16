'use client';

import { useScrollAnimation } from '@/hooks/useScrollAnimation';

/* ─── Arrow Icon ─── */
function ArrowIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 7v10H7" />
      <path d="M7 7l10 10" />
    </svg>
  );
}

const privacyPoints = [
  { text: 'We don\'t train\non your data.' },
  { text: 'Processed locally.\nStored locally.' },
  { text: 'GDPR compliant\nby design.' },
];

const badges = [
  'GDPR ready',
  'No Data Training',
  'Local Processing Only',
  'Zero Server Logging',
  'End to End Private',
];

export default function PrivacySection() {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section ref={ref} className={`animate-on-scroll ${isVisible ? 'is-visible' : ''} w-full bg-[#050505] text-white pt-24 pb-12 font-sans`}>
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="mb-4">
          <div className="text-sm font-medium mb-6">Privacy &amp; Security</div>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-normal tracking-tight mb-10">
            Your data stays<br />where it belongs.
          </h2>

          <div className="border-t border-white/20 pt-8 mt-12">
            <p className="text-lg md:text-xl font-light mb-12">
              No training. No logging. No exceptions. Everything runs in your browser.
            </p>

            {/* Privacy Points */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 max-w-4xl">
              {privacyPoints.map((point) => (
                <div key={point.text} className="flex items-start gap-4">
                  <ArrowIcon className="w-6 h-6 shrink-0 mt-0.5" />
                  <p className="text-xl font-medium leading-snug whitespace-pre-line">{point.text}</p>
                </div>
              ))}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-4">
              {badges.map((badge) => (
                <div
                  key={badge}
                  className="flex items-center gap-2 border border-white/20 px-4 py-2.5 text-xs md:text-sm font-medium"
                >
                  <ArrowIcon className="w-4 h-4 text-[#05e5ba]" />
                  {badge}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
