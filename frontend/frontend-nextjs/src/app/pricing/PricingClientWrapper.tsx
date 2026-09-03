'use client';

import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/components/context/LanguageContext';
import PricingStepOne from '@/components/home/PricingStepOne';
import PricingStepTwo from '@/components/home/PricingStepTwo';
import PaymentMethods from '@/components/home/PaymentMethods';

export default function PricingClientWrapper({ withBackground = false }: { withBackground?: boolean }) {
  const { language } = useLanguage();
  const [currency, setCurrency] = useState<'IDR' | 'USD' | null>(null);

  useEffect(() => {
    setCurrency(language === 'id' ? 'IDR' : 'USD');
  }, [language]);

  const activeCurrency = currency || 'USD';

  return (
    <div id="pricing-section" className={`w-full pt-16 ${withBackground ? 'bg-[#efeee8]' : ''}`}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-[26px] sm:text-[28px] md:text-[28px] lg:text-[32px] font-normal tracking-tight text-[#1a1a1a]" style={{ fontFamily: "var(--font-manrope), 'Manrope', sans-serif" }}>
            Priced for Progress.
          </h2>
          <p className="text-[#494949] text-xl max-w-2xl mx-auto font-light leading-relaxed mt-4">
            Every transformation begins with understanding how your organisation operates. Assess first, build your transformation strategy, then deploy AI with confidence.
          </p>
        </div>
        <div className="flex justify-center sticky top-24 z-50">
          <div className="bg-white/60 p-1.5 rounded-full inline-flex border border-[#494949]/10 shadow-sm backdrop-blur-md">
            <button
              onClick={() => setCurrency('IDR')}
              className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${
                activeCurrency === 'IDR' ? 'bg-[#c4c9b8] text-[#1a1a1a] shadow-sm' : 'text-[#494949]/60 hover:text-[#494949]'
              }`}
            >
              IDR
            </button>
            <button
              onClick={() => setCurrency('USD')}
              className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${
                activeCurrency === 'USD' ? 'bg-[#c4c9b8] text-[#1a1a1a] shadow-sm' : 'text-[#494949]/60 hover:text-[#494949]'
              }`}
            >
              USD
            </button>
          </div>
        </div>
        <div className="mt-7 mb-2">
          <PaymentMethods />
        </div>
      </div>
      <div style={{ zoom: 0.75 }} className="transition-opacity duration-300">
        <PricingStepOne currency={activeCurrency} />
        <PricingStepTwo currency={activeCurrency} />
      </div>
    </div>
  );
}
