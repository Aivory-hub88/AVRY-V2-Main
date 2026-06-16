'use client';

import { useScrollAnimation } from '@/hooks/useScrollAnimation';

import { useLanguage } from '@/components/context/LanguageContext';

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
  savings?: string;
}

const cards: PricingCard[] = [
  {
    title: 'AI Readiness\nDeep Diagnostic',
    price: 29,
    frequency: 'One time',
    description: 'Know exactly where your business stands on AI before you build anything.',
    features: [
      'AI readiness score ·',
      'Business objective mapping ·',
      'Gap & constraint analysis ·',
      'AI opportunity identification ·',
      'Data & process readiness',
    ],
    cta: 'Start Deep Diagnostic',
  },
  {
    title: 'AI System\nBlueprint + Roadmap',
    price: 85,
    frequency: 'One time',
    description: 'Your full AI architecture and execution plan, built around your business, not a template.',
    features: [
      '• Full AI system blueprint',
      '• Workflow architecture',
      '• Agent structure design',
      '• Deployment-ready plan',
      '• Phased implementation roadmap',
      '• KPI targets per phase',
    ],
    cta: 'Generate Blueprint',
  },
  {
    title: 'Full Stack Bundle',
    subtitle: 'Deep Diagnostic + Blueprint + Roadmap',
    price: 99,
    frequency: 'One time',
    description: 'Everything in one. Know, plan, execute in order.',
    features: ['• Deep Diagnostic', '• Blueprint', '• Roadmap'],
    cta: 'View Deployment Plans',
    savings: 'Save 13%',
  },
];

export default function PricingStepOne({ currency }: { currency?: 'IDR' | 'USD' }) {
  const { ref, isVisible } = useScrollAnimation();
  const { language, exchangeRate } = useLanguage(); // Fixed here to use exchangeRate

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
  };

  // Helper to format exactly or fallback
  const getFormattedPrice = (basePrice: number) => {
    const activeCurrency = currency || (language === 'id' ? 'IDR' : 'USD');
    if (activeCurrency === 'USD') return `$${basePrice}`;
    
    // For IDR, use dynamic exchangeRate
    const idrValue = basePrice * exchangeRate;
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
    <section ref={ref} onMouseMove={handleMouseMove} className={`animate-on-scroll ${isVisible ? 'is-visible' : ''} spotlight-section w-full bg-[#dfe4e5] text-[#494949] py-24 font-sans`}>
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
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-normal tracking-tight mb-6">Start With Clarity.</h2>
          <p className="text-xl text-[#494949] font-light leading-relaxed">
            A structured assessment that tells you exactly what to build, why it matters, and where to begin.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 mb-20 items-stretch gap-y-12 md:gap-y-0">
          {cards.map((card, idx) => (
            <div 
              key={card.title} 
              className={`flex flex-col ${
                idx === 0 ? 'md:pr-10 pb-12 border-b border-[#b0b5b4] md:border-b-0 md:pb-0' : idx === 1 ? 'md:px-10 md:border-x border-[#b0b5b4] pb-12 border-b md:border-b-0 md:pb-0' : 'md:pl-10'
              }`}
            >
              {/* Title area */}
              <div className="flex-grow flex flex-col">
                <div className="min-h-[96px] pb-6">
                  <h3 className="max-w-[410px] text-[22px] md:text-[24px] lg:text-[26px] font-normal leading-[1.05] text-[#494949] whitespace-pre-line">
                    {card.title}
                  </h3>
                  {card.subtitle && (
                    <p className="mt-3 text-[14px] md:text-[15px] font-bold leading-tight text-[#8a8f8e]">
                      {card.subtitle}
                    </p>
                  )}
                </div>

              {/* Price row */}
              <div className="flex items-center justify-start gap-3 py-6 mt-2">
                <span className={`transition-all duration-300 ${(currency || language) === 'IDR' || language === 'id' && !currency ? 'text-[28px] sm:text-[32px] md:text-[38px]' : 'text-[42px] sm:text-[48px] md:text-[52px]'} font-extrabold leading-none whitespace-nowrap text-[#1a1a1a]`}>
                  {getFormattedPrice(card.price)}
                </span>
                <div className="flex flex-col pt-1">
                  <span className="text-[14px] sm:text-[15px] md:text-[16px] font-normal leading-none text-[#494949] mb-[6px]">
                    {((currency || language) === 'IDR' || language === 'id' && !currency) ? card.frequency.replace('(month)', '(bulan)') : card.frequency}
                  </span>
                  <div className="w-full h-[5px] bg-[#c4c9b8]" />
                </div>
              </div>

              {/* Description */}
              <p className="mt-8 max-w-[420px] text-[16px] md:text-[17px] font-medium leading-[1.35] text-[#494949]">
                {card.description}
              </p>

              {/* Features */}
              <ul className="mt-14 space-y-2 text-[15px] md:text-[16px] font-medium leading-[1.4] text-[#494949]">
                {card.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
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
                  className="w-full bg-[#c4c9b8] text-[#494949] py-[14px] px-4 text-[15px] md:text-[16px] font-medium text-center transition-colors hover:bg-[#b0b5a4]"
                >
                  {card.cta}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
