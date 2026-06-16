'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/components/context/LanguageContext';
import PricingStepOne from '@/components/home/PricingStepOne';
import PricingStepTwo from '@/components/home/PricingStepTwo';

export default function PricingClientWrapper() {
  const { language } = useLanguage();
  const [currency, setCurrency] = useState<'IDR' | 'USD' | null>(null);

  // Default to LanguageContext on mount
  useEffect(() => {
    if (!currency) {
      setCurrency(language === 'id' ? 'IDR' : 'USD');
    }
  }, [language, currency]);

  // If still detecting, default to something to avoid hydration mismatch
  const activeCurrency = currency || 'USD';

  return (
    <div id="pricing-section" className="w-full bg-[#dfe4e5] pt-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h1 className="text-[36px] md:text-[56px] font-normal tracking-tight text-[#1a1a1a]" style={{ fontFamily: "'Manrope', sans-serif" }}>
            Priced for Progress.
          </h1>
          <p className="text-[#494949] text-xl max-w-2xl mx-auto font-light leading-relaxed mt-4">
            From your first assessment to full deployment, pick the stage that fits where you are today.
          </p>
        </div>

        {/* Currency Switcher */}
        <div className="flex justify-center mb-6 sticky top-24 z-50">
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
      </div>

      <div style={{ zoom: 0.85 }} className="transition-opacity duration-300">
        <PricingStepOne currency={activeCurrency} />
        <PricingStepTwo currency={activeCurrency} />
      </div>
    </div>
  );
}
