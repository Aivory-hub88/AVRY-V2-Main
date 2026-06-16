/**
 * Pricing Section Component
 *
 * "Start With Clarity" - 3 step lifecycle pricing.
 * Matches the live site index.html pricing section exactly.
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { openPaymentModal } from '@/lib/payment';
import { formatUsd, getProductPrice, PRODUCT_IDS } from '@/lib/pricing';
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

export function PricingSection() {
  const router = useRouter();
  const { formatPrice, language } = useTranslation();

  const deepDiagnosticPrice = formatPrice(getProductPrice(PRODUCT_IDS.DEEP_DIAGNOSTIC) ?? 0);
  const blueprintPrice = formatPrice(getProductPrice(PRODUCT_IDS.BLUEPRINT) ?? 0);
  const fullStackPrice = formatPrice(getProductPrice(PRODUCT_IDS.FULL_STACK) ?? 0);

  const handleDeepDiagnostic = () => {
    router.push('/diagnostic?type=free');
  };

  const handleBlueprint = async () => {
    try {
      await openPaymentModal(PRODUCT_IDS.BLUEPRINT);
    } catch (error) {
      console.error('Payment error:', error);
    }
  };

  return (
    <div className="w-full !bg-white !text-black !py-24 !font-sans" id="pricing-section">
      <div className="!max-w-7xl !mx-auto !px-6 md:!px-12">
        <div className="!mb-20 !text-center md:!text-left">
          <h2 className="!text-5xl md:!text-6xl !font-medium !tracking-tight !mb-6">
            Start With Clarity.
          </h2>
          <p className="!text-xl !text-gray-700 !font-light !leading-relaxed">
            Know what to build, why it matters, and how to make it work.
          </p>
        </div>

        <div className="!grid !grid-cols-1 md:!grid-cols-3 !gap-x-8 !gap-y-16 !mb-20">
          {/* Step 1 */}
          <div className="!flex !flex-col">
            <div className="!flex !items-start !gap-4 !mb-4 !border-b-2 !border-black !pb-4">
              <BulletIcon />
              <h3 className="!text-lg !font-bold !leading-snug">
                AI Readiness Deep<br />Diagnostic
              </h3>
            </div>
            <div className="!text-center !py-6 !border-b !border-gray-300">
              <div className="!text-4xl !font-bold !mb-1">
                {deepDiagnosticPrice}
                <span className="!text-sm !font-normal !text-gray-500 !tracking-wide">
                  {' '}One time
                </span>
              </div>
            </div>
            <p className="!text-gray-900 !font-medium !py-8 !border-b !border-gray-300 !leading-relaxed !text-sm">
              Know exactly where your business stands on AI before you build anything.
            </p>
            <ul className="!py-8 !space-y-3 !text-sm !text-gray-800 !flex-grow">
              {[
                'AI readiness score',
                'Business objective mapping',
                'Gap & constraint analysis',
                'AI opportunity identification',
                'Data & process readiness',
              ].map((item) => (
                <li key={item} className="!flex !items-center !gap-2">
                  <span className="!w-1 !h-1 !bg-black !rounded-full"></span> {item}
                </li>
              ))}
            </ul>
            <button
              onClick={handleDeepDiagnostic}
              className="group !flex !items-center !justify-center !gap-3 !text-black !font-bold !text-xl hover:!text-gray-600 !transition-colors !mt-auto !w-full !border-t-2 !border-black !pt-6"
            >
              <ArrowIcon />
              Start Deep Diagnostic
            </button>
          </div>

          {/* Step 2 */}
          <div className="!flex !flex-col">
            <div className="!flex !items-start !gap-4 !mb-4 !border-b-2 !border-black !pb-4">
              <BulletIcon />
              <h3 className="!text-lg !font-bold !leading-snug">
                AI System<br />Blueprint + Roadmap
              </h3>
            </div>
            <div className="!text-center !py-6 !border-b !border-gray-300">
              <div className="!text-4xl !font-bold !mb-1">
                {blueprintPrice}
                <span className="!text-sm !font-normal !text-gray-500 !tracking-wide">
                  {' '}One time
                </span>
              </div>
            </div>
            <p className="!text-gray-900 !font-medium !py-8 !border-b !border-gray-300 !leading-relaxed !text-sm">
              Your full AI architecture and execution plan, built around your business, not a template.
            </p>
            <ul className="!py-8 !space-y-3 !text-sm !text-gray-800 !flex-grow">
              {[
                'Full AI system blueprint',
                'Workflow architecture',
                'Agent structure design',
                'Deployment-ready plan',
                'Phased implementation roadmap',
                'KPI targets per phase',
              ].map((item) => (
                <li key={item} className="!flex !items-center !gap-2">
                  <span className="!w-1 !h-1 !bg-black !rounded-full"></span> {item}
                </li>
              ))}
            </ul>
            <button
              onClick={handleBlueprint}
              className="group !flex !items-center !justify-center !gap-3 !text-black !font-bold !text-xl hover:!text-gray-600 !transition-colors !mt-auto !w-full !border-t-2 !border-black !pt-6"
            >
              <ArrowIcon />
              Generate Blueprint
            </button>
          </div>

          {/* Step 3: Full Stack Bundle */}
          <div className="!flex !flex-col">
            <div className="!flex !items-start !gap-4 !mb-4 !border-b-2 !border-black !pb-4">
              <BulletIcon />
              <div>
                <h3 className="!text-lg !font-bold !leading-snug">Full Stack Bundle</h3>
                <p className="!text-xs !text-gray-500 !mt-1">
                  Deep Diagnostic + Blueprint + Roadmap
                </p>
              </div>
            </div>
            <div className="!text-center !py-6 !border-b !border-gray-300">
              <div className="!flex !items-baseline !justify-center !gap-2">
                <span className="!text-4xl !font-bold">{fullStackPrice}</span>
                <span className="!text-sm !text-gray-500">One time</span>
              </div>
            </div>
            <p className="!text-gray-900 !font-medium !py-8 !border-b !border-gray-300 !leading-relaxed !text-sm">
              Everything in one. Know, plan, execute in order.
            </p>
            <ul className="!py-8 !space-y-3 !text-sm !text-gray-800 !flex-grow">
              {['Deep Diagnostic', 'Blueprint', 'Roadmap'].map((item) => (
                <li key={item} className="!flex !items-center !gap-2">
                  <span className="!w-1 !h-1 !bg-black !rounded-full"></span> {item}
                </li>
              ))}
            </ul>
            <div className="!text-sm !text-green-600 !font-medium !mb-6">
              Save $48 compare to buying separately
            </div>
            <button
              className="group !flex !items-center !justify-center !gap-3 !text-black !font-bold !text-xl hover:!text-gray-600 !transition-colors !mt-auto !w-full !border-t-2 !border-black !pt-6"
            >
              <ArrowIcon />
              Get full stack bundle
            </button>
          </div>
        </div>
      </div>

      {/* Black full width banner */}
      <div className="!w-full !bg-black !text-white !text-center !py-6 !px-4">
        <p className="!text-sm !font-medium !tracking-wide">
          Every output is generated specifically for your business. Not a template. Not a generic report.<br className="hidden md:block" />
          No hidden costs. No upsell calls. Buy once, own the output.
        </p>
      </div>
    </div>
  );
}

export default PricingSection;
