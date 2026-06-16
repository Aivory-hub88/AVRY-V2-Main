/**
 * Subscription Section Component
 *
 * "Where intent becomes operation" - subscription tiers.
 * Matches the legacy index.html subscription section.
 */

'use client';

import React from 'react';
import { openPaymentModal, PAYMENT_CONFIG } from '@/lib/payment';
import { formatUsd, getProductPrice } from '@/lib/pricing';
import { useTranslation } from '@/contexts/TranslationContext';

const ArrowIcon = () => (
  <svg
    className="w-5 h-5 group-hover:translate-x-1 group-hover:translate-y-1 transition-transform"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M17 7v10H7" />
    <path d="M7 7l10 10" />
  </svg>
);

const BulletIcon = () => (
  <svg
    className="w-5 h-5 shrink-0 mt-1"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M7 7h10v10" />
    <path d="M7 17L17 7" />
  </svg>
);

interface Tier {
  id: string;
  name: string;
  subtitle: string;
  features: string[];
  cta: string;
}

const tiers: Tier[] = [
  {
    id: 'foundation',
    name: 'Foundation',
    subtitle: 'For individuals and solo professionals starting their AI journey.',
    features: [
      '50 IC/month',
      'Aivory Agentic on-demand consultation',
      '3 active workflows',
      '5 JSON exports/month',
      'Deploy to n8n (optional)',
      '1 active agent',
      'Telegram or Slack',
    ],
    cta: 'Start With Foundation',
  },
  {
    id: 'pro',
    name: 'Pro',
    subtitle: 'For SMEs and founders running AI operations daily.',
    features: [
      '300 IC/month',
      'Aivory Agentic response',
      '10 active workflows',
      'Unlimited JSON exports',
      'Conditional logic & branching',
      '3 active agents',
      'Telegram & Slack',
      'Multi-step agent flows',
    ],
    cta: 'Start With Pro',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    // NOTE (parity): The legacy ground truth (frontend/index.html AND the live
    // stag.aivory.id) renders this subtitle identically to Pro's. Kept verbatim
    // for legacy parity per product decision; flagged as a likely copy bug for
    // product to supply distinct Enterprise copy if desired.
    subtitle: 'For SMEs and founders running AI operations daily.',
    features: [
      '2,000 IC/month',
      'Dedicated account manager',
      'Unlimited workflows',
      'Unlimited exports',
      'Advanced orchestration',
      'Unlimited agents',
      'Custom integrations',
      'SLA guarantee',
      'Multi-team workspace',
    ],
    cta: 'Contact Sales',
  },
];

export function SubscriptionSection() {
  const { formatPrice, language } = useTranslation();

  const handleSelectPlan = async (planId: string) => {
    try {
      await openPaymentModal(planId);
    } catch (error) {
      console.error('Payment error:', error);
    }
  };

  return (
    <div id="subscription-section" className="!w-full !bg-white !text-black !py-24 !font-sans subscription-section">
      <div className="!max-w-7xl !mx-auto !px-6 md:!px-12">
        <div className="!mb-20 !text-center md:!text-left">
          <h2 className="!text-5xl md:!text-6xl !font-medium !tracking-tight !mb-6">
            Run Your AI Systems.
          </h2>
          <p className="!text-xl !text-gray-700 !font-light !leading-relaxed">
            Everything you need to deploy, manage, build workflow from natural language, launch agents and scale AI operations from one platform.
          </p>
        </div>

        <div className="!grid !grid-cols-1 md:!grid-cols-3 !gap-x-12 !gap-y-16 !mb-24">
          {tiers.map((tier) => (
            <div key={tier.id} className="!flex !flex-col">
              <div className="!flex !items-start !gap-4 !mb-4 !border-b-2 !border-black !pb-4">
                <BulletIcon />
                <div>
                  <h3 className="!text-xl !font-bold">{tier.name}</h3>
                  <p className="!text-xs !text-gray-600 !mt-1 !leading-relaxed">
                    {tier.subtitle}
                  </p>
                </div>
              </div>
              <div className="!text-center !py-8 !border-b !border-gray-300">
                <div className="!text-4xl !font-bold !mb-1">
                  {formatPrice(getProductPrice(tier.id) ?? 0)}
                </div>
                <div className="!text-sm !text-gray-500">
                  /{language === 'id' ? 'bulan' : 'month'}
                </div>
              </div>
              <ul className="!py-8 !space-y-3 !text-sm !text-gray-800 !font-medium !flex-grow">
                {tier.features.map((feature) => (
                  <li key={feature} className="!flex !items-start !gap-2">
                    <span className="!shrink-0 !mt-1.5 !w-1 !h-1 !bg-black !rounded-full"></span>
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleSelectPlan(tier.id)}
                className="group !flex !items-center !justify-center !gap-3 !text-black !font-bold !text-xl hover:!text-gray-600 !transition-colors !mt-4 !w-full !border-t-2 !border-black !pt-6"
              >
                <ArrowIcon />
                {tier.cta}
              </button>
            </div>
          ))}
        </div>

        {/* IC explanation */}
        <div className="!max-w-4xl !mx-auto !text-center !mb-16 !px-4">
          <p className="!text-sm !font-medium !text-gray-900 !leading-relaxed">
            Intelligence Credits (IC) fuel Aivory reasoning every consultation, workflow generation, and agent
            <br className="hidden md:block" />
            configuration runs on IC. Think of it as the fuel tank for your AI system. Need more? Top up anytime.
          </p>
        </div>

        {/* Black full width banner */}
        <div className="!w-full !bg-black !text-white !text-center !py-6 !px-4 !max-w-5xl !mx-auto">
          <p className="!text-sm !font-medium !tracking-wide">
            No hidden fees. No locked contracts. Cancel anytime. Your AI system, your pace.
          </p>
        </div>
      </div>
    </div>
  );
}

export default SubscriptionSection;
