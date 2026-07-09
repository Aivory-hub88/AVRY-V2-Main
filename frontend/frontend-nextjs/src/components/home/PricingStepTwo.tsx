'use client';

import { useScrollAnimation } from '@/hooks/useScrollAnimation';

import { useLanguage } from '@/components/context/LanguageContext';

/* ─── Icons ─── */
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

/* ─── Plan Data ─── */
interface Plan {
  name: string;
  description: string;
  price: number;
  frequency: string;
  features: string[];
  cta: string;
  overageUSD?: number;
  mostPopular?: boolean;
}

const plans: Plan[] = [
  {
    name: 'Foundation',
    description: 'For individuals and solo professionals deploying their first AI agent.',
    price: 20,
    frequency: '(month)',
    features: [
      '1,500 conversations/month',
      '1 active agent',
      '3 workflow build',
      'Telegram or Slack (choose one)',
      'Multilingual by default',
    ],
    cta: 'Start With Foundation',
    overageUSD: 0.015
  },
  {
    name: 'Pro',
    description: 'For growing teams running AI operations daily.',
    price: 44,
    frequency: '(month)',
    features: [
      '5,000 conversations/month',
      '3 active agents',
      '7 workflow build',
      'Telegram + Slack + Email',
      'Multilingual by default',
      'Conditional logic & branching',
      'Multi-step agent flows'
    ],
    cta: 'Start With Pro',
    overageUSD: 0.012,
    mostPopular: true
  },
  {
    name: 'Enterprise',
    description: 'For organizations scaling AI across operations.',
    price: 499,
    frequency: '(month)',
    features: [
      'Unlimited conversations',
      'Unlimited agents',
      'Unlimited workflow build',
      'All channels + WhatsApp Business',
      'Custom integrations',
      'Advanced orchestration',
      'Multi-team workspace',
      'Dedicated support + SLA guarantee'
    ],
    cta: 'Contact Sales',
  },
];

export default function PricingStepTwo({ currency }: { currency?: 'IDR' | 'USD' }) {
  const { ref, isVisible } = useScrollAnimation();
  const { language, exchangeRate } = useLanguage();

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

  const getFormattedOverage = (overageUSD?: number) => {
    if (!overageUSD) return null;
    const activeCurrency = currency || (language === 'id' ? 'IDR' : 'USD');
    if (activeCurrency === 'USD') return `${overageUSD}/conversation`;
    
    // IDR with 5% margin
    const idrValue = overageUSD * (exchangeRate * 1.05);
    // Round to nearest 10 for cleaner look in IDR (e.g. 243 -> 240)
    const roundedIdr = Math.round(idrValue / 10) * 10;
    return `Rp ${roundedIdr}/conversation`;
  };

  return (
    <section ref={ref} onMouseMove={handleMouseMove} className={`animate-on-scroll ${isVisible ? 'is-visible' : ''} spotlight-section w-full bg-[#dfe4e5] text-[#494949] py-24 font-sans`}>
      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        {/* Header */}
        <div className="mb-20 text-center md:text-left">
          <div className="inline-block mb-6">
            <div className="flex items-center gap-2.5">
              <span className="text-[22px] md:text-[26px] font-extrabold text-[#494949]">Step 2</span>
              <StepIcon />
            </div>
            <div className="w-full h-[3px] bg-[#c4c9b8] mt-2 rounded-full" />
          </div>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-normal tracking-tight mb-6">Pick Your Plan. Deploy Today.</h2>
          <p className="text-xl text-[#494949] font-light leading-relaxed">
            Launch agents, build workflows from natural language, and scale your AI operations from one platform.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 mb-20 items-stretch gap-y-12 md:gap-y-0">
          {plans.map((plan, idx) => {
            const activeCurrency = currency || (language === 'id' ? 'IDR' : 'USD');
            const overageText = getFormattedOverage(plan.overageUSD);

            return (
            <div 
              key={plan.name} 
              className={`flex flex-col ${
                idx === 0 ? 'md:pr-10 pb-12 border-b border-[#b0b5b4] md:border-b-0 md:pb-0' : idx === 1 ? 'md:px-10 md:border-x border-[#b0b5b4] pb-12 border-b md:border-b-0 md:pb-0' : 'md:pl-10'
              }`}
            >
              {/* Title */}
              <div className="flex-grow flex flex-col">
                <div className="min-h-[96px] pb-6">
                  <div className="h-7 mb-4">
                    {plan.mostPopular && (
                      <span className="inline-flex items-center px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#494949] border border-[#494949] rounded-full">
                        Most Popular
                      </span>
                    )}
                  </div>
                  <h3 className="max-w-[380px] text-[22px] md:text-[24px] lg:text-[26px] font-normal leading-[1.05] text-[#494949]">
                    {plan.name}
                  </h3>
                  <p className="mt-3 max-w-[340px] text-[14px] md:text-[15px] font-medium leading-[1.25] text-[#494949]">
                    {plan.description}
                  </p>
                </div>

              {/* Price */}
              <div className="flex items-center justify-start gap-3 py-6 mt-2">
                <span className={`transition-all duration-300 ${activeCurrency === 'IDR' ? 'text-[28px] sm:text-[32px] md:text-[38px]' : 'text-[42px] sm:text-[48px] md:text-[52px]'} font-extrabold leading-none whitespace-nowrap text-[#1a1a1a]`}>
                  {getFormattedPrice(plan.price)}
                </span>
                <div className="flex flex-col pt-1">
                  <span className="text-[14px] sm:text-[15px] md:text-[16px] font-normal leading-none text-[#494949] mb-[6px]">
                    {activeCurrency === 'IDR' ? plan.frequency.replace('(month)', '(bulan)') : plan.frequency}
                  </span>
                  <div className="w-full h-[5px] bg-[#c4c9b8]" />
                </div>
              </div>

              {/* Overage */}
              {overageText ? (
                <div className="mt-4 text-[13px] font-semibold text-[#8a8f8d] transition-opacity duration-300">
                  Overage: {overageText}
                </div>
              ) : (
                <div className="mt-4 text-[13px] text-transparent select-none" aria-hidden="true">
                  Spacer
                </div>
              )}

              {/* Features */}

              {/* Features */}
              <ul className="mt-14 space-y-2 text-[15px] md:text-[16px] font-medium leading-[1.35] text-[#494949]">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="shrink-0">•</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              </div>

              {/* CTA */}
              <div className="pt-10 mt-auto">
                <button
                  type="button"
                  className="w-full bg-[#c4c9b8] text-[#494949] py-[14px] px-4 text-[15px] md:text-[16px] font-medium text-center transition-colors hover:bg-[#b0b5a4]"
                >
                  {plan.cta}
                </button>
              </div>
            </div>
            );
          })}
        </div>

        {/* IC Explanation */}
        <div className="mx-auto mt-24 max-w-5xl border-t-2 border-[#6f7473] pt-8">
          <p className="text-[16px] md:text-[17px] font-bold leading-[1.65] text-[#494949]">
            Intelligence Credits (IC) fuel Aivory™ reasoning — every consultation, workflow generation, and agent
            configuration runs on IC. Think of it as the fuel tank for your AI system. Need more? Top up anytime.
          </p>
        </div>

        {/* Bottom note */}
        <div className="mt-16 text-center">
          <p className="text-[15px] md:text-[17px] font-medium leading-tight text-[#494949]">
            No hidden fees. No locked contracts. Cancel anytime. Your AI system, your pace.
          </p>
        </div>
      </div>
    </section>
  );
}
