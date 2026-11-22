'use client';

import { useState } from 'react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

import { useLanguage } from '@/components/context/LanguageContext';
import { PlanConfirmModal } from '@/components/payment/PlanConfirmModal';
import { PRODUCT_IDS } from '@/lib/pricing';
import { CtaCursor } from '@/components/ui/CtaCursor';
import { GrainPlanCard, WORLD_DUSK, WORLD_FRESH, WORLD_PLATINUM } from '@/components/home/landing/GrainPlanCard';

/* ─── Arrow Icon (reused) ─── */
function ArrowUpRight({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 17L17 7" />
      <path d="M7 7h10v10" />
    </svg>
  );
}

function ArrowDownRight({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 7v10H7" />
      <path d="M7 7l10 10" />
    </svg>
  );
}

function StepIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="#494949" aria-hidden="true">
      <rect x="4" y="4" width="4" height="4" rx="1.3" />
      <rect x="16" y="4" width="4" height="4" rx="1.3" />
      <rect x="10" y="10" width="4" height="4" rx="1.3" />
      <rect x="4" y="16" width="4" height="4" rx="1.3" />
      <rect x="16" y="16" width="4" height="4" rx="1.3" />
    </svg>
  );
}

/* ─── Pricing Card Data ─── */
interface PricingCard {
  title: string;
  subtitle?: string;
  price: number;
  frequency: string;
  description: string;
  features: string[];
  cta: string;
  productId: string;
  savings?: string;
  mostPopular?: boolean;
}

const cards: PricingCard[] = [
  {
    title: 'Business Operations\nAssessment',
    price: 79,
    // Each purchase includes 3 runs (avry-backend feature_uses).
    frequency: '3 uses',
    description: 'Gain a clear understanding of how your organisation operates before making AI decisions.',
    features: [
      '• 3 analyses included',
      '• Operational maturity analysis',
      '• Business objective alignment',
      '• Operational bottleneck analysis',
      '• AI opportunity mapping',
      '• Process and data readiness',
    ],
    cta: 'Begin Analysis',
    productId: PRODUCT_IDS.DEEP_DIAGNOSTIC,
  },
  {
    title: 'Transformation\nBlueprint + Roadmap',
    price: 249,
    // Each purchase includes 3 runs (avry-backend feature_uses).
    frequency: '3 uses',
    description: 'Transform operational insights into a practical blueprint for business transformation and governed AI deployment.',
    features: [
      '• 3 blueprints + roadmaps included',
      '• Operational transformation blueprint',
      '• Future-state workflow architecture',
      '• AI deployment strategy',
      '• Integration recommendations',
      '• Executive implementation framework',
    ],
    cta: 'Request Blueprint',
    productId: PRODUCT_IDS.BLUEPRINT,
  },
  {
    title: 'Complete Transformation Package',
    subtitle: 'Business Operations Analysis\n+\nTransformation Blueprint\n+\nTransformation Roadmap\n+\n1 Month Business Plan',
    price: 299,
    // Each purchase includes 3 runs (avry-backend feature_uses).
    frequency: '3 uses',
    description: 'Everything required to move from operational analysis to a clear transformation strategy.',
    features: [
      '• 3 full runs: Analysis → Blueprint → Roadmap',
      '• Business Operations Analysis',
      '• Transformation Blueprint',
      '• Transformation Roadmap',
      '• AI opportunity prioritisation',
      '• Executive implementation plan',
      '• Includes 1 month of Business plan (once per purchase)',
    ],
    cta: 'Start Transformation',
    productId: PRODUCT_IDS.FULL_STACK,
    mostPopular: true,
  },
];

// The bundle's bonus line, emphasised wherever it appears on the card.
const BONUS_SUBTITLE = '1 Month Business Plan';

export default function PricingStepOne({ currency, variant = 'default' }: { currency?: 'IDR' | 'USD'; variant?: 'default' | 'landing' }) {
  // 'landing' = the homepage band: same content and checkout, lighter card treatment.
  const landing = variant === 'landing';
  const { ref, isVisible } = useScrollAnimation();
  const { language, exchangeRate } = useLanguage(); // Fixed here to use exchangeRate
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
  };

  const isIdr = (currency || (language === 'id' ? 'IDR' : 'USD')) === 'IDR';

  // Helper to format exactly or fallback
  const getFormattedPrice = (basePrice: number) => {
    const activeCurrency = currency || (language === 'id' ? 'IDR' : 'USD');
    if (activeCurrency === 'USD') return `$${basePrice}`;
    
    // For IDR, use dynamic exchangeRate with 5% margin
    const idrValue = basePrice * (exchangeRate * 1.05);
    if (idrValue >= 1000000) {
      const juta = idrValue / 1000000;
      return `Rp ${parseFloat(juta.toFixed(2))} jt`;
    } else if (idrValue >= 1000) {
      const ribu = idrValue / 1000;
      return `Rp ${Math.round(ribu)} rb`;
    }
    return `Rp ${Math.round(idrValue)}`;
  };

  return (
    <section ref={ref} onMouseMove={handleMouseMove} className={`animate-on-scroll ${isVisible ? 'is-visible' : ''} spotlight-section w-full ${landing ? 'bg-transparent py-12 md:py-16' : 'bg-[#E4E6E8] py-24'} text-[#494949] font-sans`}>
      {landing && <CtaCursor />}
      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        {/* Header */}
        <div className="mb-20 text-center md:text-left">
          <div className="inline-block mb-6">
            <div className="flex items-center gap-2.5">
              <span className="text-[22px] md:text-[26px] font-extrabold text-[#494949]">Step 1</span>
              <StepIcon />
            </div>
            <div className="w-full h-[3px] bg-[#c4c9b8] mt-2 rounded-full" />
          </div>
          <h2 className={`text-[35px] sm:text-[37px] md:text-[37px] lg:text-[43px] ${landing ? 'font-light tracking-[-0.03em]' : 'font-normal tracking-tight'} mb-6`}>Start With Clarity.</h2>
          <p className="text-xl text-[#494949] font-light leading-relaxed">
            Every transformation begins with understanding how your organisation operates. Assess first, build your transformation strategy, then deploy AI with confidence.
          </p>
        </div>

        {/* Cards Grid */}
        <div className={`max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 items-stretch ${landing ? 'gap-5 mb-12' : 'mb-20 gap-y-12 md:gap-x-8 md:gap-y-0'}`}>
          {cards.map((card, idx) => landing ? (
            <GrainPlanCard
              key={card.title}
              world={[WORLD_FRESH, WORLD_DUSK, WORLD_PLATINUM][idx]}
              surface="floral"
              art={['/landing/pricing/plan-assessment-v6.webp', '/landing/pricing/plan-blueprint-v6.webp', '/landing/pricing/plan-complete-v6.webp'][idx]}
              badge={card.mostPopular ? 'Best value' : undefined}
              title={card.title}
              price={getFormattedPrice(card.price)}
              priceSuffix={isIdr ? card.frequency.replace('3 uses', '3x pemakaian') : card.frequency}
              priceSmall={isIdr}
              priceSuffixStrong
              description={card.description}
              features={card.features.map((f) => {
                const text = f.replace(/^• /, '');
                return { text, strong: text.startsWith('Includes 1 month') };
              })}
              cta={card.cta}
              onCta={() => setSelectedProduct(card.productId)}
            />
          ) : (
            <div 
              key={card.title} 
              className={`flex flex-col ${
                idx === 0 ? 'md:pr-10 pb-12 border-b border-[#b0b5b4] md:border-b-0 md:pb-0' : idx === 1 ? 'md:px-10 md:border-x border-[#b0b5b4] pb-12 border-b md:border-b-0 md:pb-0' : 'md:pl-10'
              }`}
            >
              {/* Title area */}
              <div className="flex-grow flex flex-col">
                <div className="min-h-[200px] pb-4">
                  <div className="h-6 mb-3">
                    {card.mostPopular && (
                      <span className="inline-flex items-center px-3 py-1 text-[9px] font-bold uppercase tracking-[0.15em] text-[#494949] border border-[#494949] rounded-full">
                        Best Value
                      </span>
                    )}
                  </div>
                  <h3 className="max-w-[410px] text-[18px] md:text-[20px] lg:text-[24px] font-normal leading-[1.1] text-[#494949] whitespace-pre-line">
                    {card.title}
                  </h3>
                  {card.subtitle && (
                    <p className="pt-9 text-[12px] md:text-[13px] font-bold leading-tight text-[#8a8f8d]">
                      {card.subtitle.endsWith(BONUS_SUBTITLE) ? (
                        <>
                          {card.subtitle.slice(0, -BONUS_SUBTITLE.length)}
                          <span className="font-extrabold text-[#494949]">{BONUS_SUBTITLE}</span>
                        </>
                      ) : card.subtitle}
                    </p>
                  )}
                </div>

              {/* Price row */}
              <div className="flex items-center justify-start gap-3 py-6 mt-2">
                <span className={`transition-all duration-300 ${(currency || language) === 'IDR' || language === 'id' && !currency ? 'text-[32px] sm:text-[38px] md:text-[44px]' : 'text-[42px] sm:text-[48px] md:text-[52px]'} font-extrabold leading-none whitespace-nowrap text-[#1a1a1a]`}>
                  {getFormattedPrice(card.price)}
                </span>
                <div className="flex flex-col pt-1">
                  <span className="text-[15px] sm:text-[16px] md:text-[18px] font-bold leading-none text-[#1a1a1a] mb-[6px]">
                    {((currency || language) === 'IDR' || language === 'id' && !currency) ? card.frequency.replace('(month)', '(bulan)').replace('3 uses', '3x pemakaian') : card.frequency}
                  </span>
                  <div className="w-full h-[5px] bg-[#c4c9b8]" />
                </div>
              </div>

              {/* Description */}
              <p className={`mt-8 max-w-[420px] text-[17px] md:text-[19px] font-medium leading-[1.4] text-[#494949]`}>
                {card.description}
              </p>

              {/* Features */}
              <ul className={`mt-14 space-y-3 text-[16px] md:text-[18px] font-medium leading-[1.45] text-[#494949]`}>
                {card.features.map((f) => {
                  const isBullet = f.startsWith('• ');
                  const text = isBullet ? f.replace('• ', '') : f;
                  return (
                    <li key={f} className={isBullet ? "flex gap-2" : ""}>
                      {isBullet && <span className="shrink-0">•</span>}
                      <span className={text.startsWith('Includes 1 month') ? 'font-bold' : undefined}>{text}</span>
                    </li>
                  );
                })}
              </ul>

              {/* Savings badge */}
              {card.savings && (
                <div className="mt-10 mb-2 inline-flex items-center justify-center bg-[#c4c9b8] px-4 py-3 text-[18px] md:text-[22px] font-bold leading-none text-[#1a1a1a] w-max">
                  {card.savings}
                </div>
              )}
              </div>

              {/* CTA */}
              <div className="pt-10 mt-auto">
                <button
                  type="button"
                  onClick={() => setSelectedProduct(card.productId)}
                  className="w-full bg-[#c4c9b8] text-[#494949] py-[18px] px-6 text-[17px] md:text-[19px] font-semibold text-center transition-colors hover:bg-[#b0b5a4]"
                >
                  {card.cta}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <PlanConfirmModal
        productId={selectedProduct}
        currency={currency}
        onClose={() => setSelectedProduct(null)}
      />
    </section>
  );
}
