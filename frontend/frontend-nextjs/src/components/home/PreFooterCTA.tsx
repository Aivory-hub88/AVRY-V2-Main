'use client';

import { useState } from 'react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { TechnicalFrameButton } from '@/components/ui/TechnicalFrameButton';
import { PlanConfirmModal } from '@/components/payment/PlanConfirmModal';
import { PRODUCT_IDS } from '@/lib/pricing';
import { FAQ_ENTITIES } from '@/lib/seo';

export default function PreFooterCTA() {
  const { ref, isVisible } = useScrollAnimation();
  const [activeProductId, setActiveProductId] = useState<string | null>(null);

  return (
    <section
      id="prefooter-cta"
      ref={ref}
      data-prefooter-layout="editorial"
      className={`animate-on-scroll ${isVisible ? 'is-visible' : ''} relative isolate w-full overflow-hidden border-t border-white/10 py-20 font-sans text-white md:py-28`}
    >
      <div className="mx-auto max-w-[1400px] px-6 md:px-12 lg:px-24">
        <div
          className="mb-14 rounded-[28px] px-6 py-10 md:mb-20 md:px-14 md:py-14"
          style={{
            background:
              'linear-gradient(160deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.025) 55%, rgba(255,255,255,0.015) 100%)',
            backdropFilter: 'blur(22px)',
            WebkitBackdropFilter: 'blur(22px)',
            border: '1px solid rgba(255,255,255,0.13)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16), 0 24px 60px -12px rgba(0,0,0,0.45)',
          }}
        >
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">
                Strategic engagement / 01
              </p>
              <h2
                className="no-word-split mt-5 max-w-lg text-[26px] sm:text-[28px] md:text-[28px] lg:text-[32px] font-light leading-[1.15] tracking-[-0.03em]"
                style={{ fontFamily: "var(--font-manrope), 'Manrope', sans-serif", fontWeight: 300 }}
              >
                Start your transformation.
              </h2>
            </div>

            <div className="lg:col-span-6 lg:col-start-7 lg:self-end">
              <div className="max-w-2xl text-[15px] font-light leading-7 text-white/62 md:text-base">
                <p>
                  Every transformation begins with understanding how your organisation operates. Tell
                  us about your business, your operational challenges, and where you want to go. We&apos;ll
                  help identify where AI can create measurable business value.
                </p>
              </div>
              <div className="mt-8 flex flex-wrap gap-4">
                <TechnicalFrameButton
                  type="button"
                  size="compact"
                  onClick={() => setActiveProductId(PRODUCT_IDS.DEEP_DIAGNOSTIC)}
                >
                  Begin Assessment
                </TechnicalFrameButton>
                <TechnicalFrameButton
                  type="button"
                  size="compact"
                  className="bg-transparent text-white/70 hover:text-white"
                  onClick={() => setActiveProductId(PRODUCT_IDS.FULL_STACK)}
                >
                  Complete Package
                </TechnicalFrameButton>
              </div>
              <p
                className="mt-7 font-mono text-[11px] uppercase tracking-[0.14em] text-white/80"
                style={{ textShadow: '0 1px 12px rgba(0,0,0,0.55)' }}
              >
                <span className="font-semibold text-white">500+</span> businesses transforming with Aivory
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-12 border-b border-t border-white/10 py-16 md:py-20 lg:grid-cols-12">
          <div className="lg:col-span-4 lg:sticky lg:top-28 lg:self-start">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">
              Questions / 02
            </p>
            <h3 className="mt-5 max-w-sm text-[26px] sm:text-[28px] md:text-[28px] lg:text-[32px] font-light leading-[1.15] tracking-[-0.025em]">
              Clear answers about Aivory.
            </h3>
          </div>

          <div className="border-b border-white/10 lg:col-span-7 lg:col-start-6">
            {FAQ_ENTITIES.map((entry, index) => (
              <details key={entry.question} className="group border-t border-white/10" open={index === 0}>
                <summary className="flex min-h-[60px] cursor-pointer list-none items-center gap-4 py-4 marker:content-none">
                  <span className="font-mono text-[10px] text-white/28">{String(index + 1).padStart(2, '0')}</span>
                  <span className="flex-1 text-sm font-light leading-snug text-white/85">{entry.question}</span>
                  <span className="text-lg font-light text-white/35 transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="max-w-3xl pb-7 pl-9 text-sm font-light leading-6 text-white/52">{entry.answer}</p>
              </details>
            ))}

            <p className="pt-8 text-sm font-light text-white/55 md:text-base">
              Prefer speaking with our team?{' '}
              <a
                href="https://book.aivory.uk/book/aivory-call"
                target="_blank"
                rel="noopener noreferrer"
                className="border-b border-white/35 pb-1 text-white/78 transition-colors hover:border-white hover:text-white"
              >
                Schedule a Discovery Call.
              </a>
            </p>
          </div>
        </div>
      </div>

      {activeProductId && (
        <PlanConfirmModal
          productId={activeProductId}
          onClose={() => setActiveProductId(null)}
        />
      )}
    </section>
  );
}
