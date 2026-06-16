/**
 * Credit Marketplace Section Component
 *
 * "Intelligence Credit Marketplace" - credit packages.
 * Matches the legacy index.html credit marketplace section.
 *
 * Every credits/price pair is derived from `CREDIT_PACKS` (the single pricing
 * source of truth) rather than restated locally, so the displayed values can
 * never drift from checkout. Prices are rendered through `formatUsd` for the
 * legacy "$NN" (no-decimals) display.
 */

'use client';

import React from 'react';
import { openPaymentModal } from '@/lib/payment';
import { CREDIT_PACKS, formatUsd } from '@/lib/pricing';
import { useTranslation } from '@/contexts/TranslationContext';

/**
 * Split the canonical credit packs into the two legacy display groups while
 * preserving their published order:
 * - Starter packs: smaller, experimental tiers (credits ≤ 1000)
 * - Scale packs: larger, sustained-operation tiers (credits ≥ 2500)
 */
const starterPacks = CREDIT_PACKS.filter((pack) => pack.credits <= 1000);
const scalePacks = CREDIT_PACKS.filter((pack) => pack.credits >= 2500);

/** The legacy "Most Popular" badge sits on the 5,000-credit scale pack. */
const POPULAR_PACK_CREDITS = 5000;

export function CreditMarketplaceSection() {
  const { formatPrice } = useTranslation();

  const handleAddCredits = async (credits: number) => {
    try {
      await openPaymentModal(credits);
    } catch (error) {
      console.error('Payment error:', error);
    }
  };

  return (
    <div
      id="credit-marketplace-section"
      className="!w-full !bg-gray-50 !text-black !py-24 !font-sans !border-t !border-gray-200"
    >
      <div className="!max-w-7xl !mx-auto !px-6 md:!px-12">
        <div className="!mb-16 !text-center md:!text-left">
          <h2 className="!text-4xl md:!text-5xl !font-medium !tracking-tight !mb-4">
            Intelligence Credit Marketplace
          </h2>
          <p className="!text-lg !text-gray-600 !font-light">
            Scale your AI reasoning capacity anytime.
          </p>
        </div>

        {/* Starter Packs */}
        <div className="!mb-16">
          <div className="!grid !grid-cols-2 md:!grid-cols-5 !gap-4 !mb-6">
            {starterPacks.map((pack) => (
              <div
                key={pack.credits}
                className="!bg-white !border !border-gray-200 !p-6 !flex !flex-col !items-center !justify-center !text-center"
              >
                <div className="!text-xl !font-bold !mb-1">{pack.credits.toLocaleString()} IC</div>
                <div className="!text-sm !text-gray-500 !mb-4">{formatPrice(pack.price)}</div>
                <button
                  onClick={() => handleAddCredits(pack.credits)}
                  className="!w-full !py-2 !border !border-black !text-black !text-sm !font-semibold hover:!bg-black hover:!text-white !transition-colors"
                >
                  Add
                </button>
              </div>
            ))}
          </div>
          <p className="!text-sm !text-gray-500 !font-medium !text-center md:!text-left">
            Ideal for light and experimental usage.
          </p>
        </div>

        {/* Scale Packs */}
        <div className="!mb-12">
          <div className="!grid !grid-cols-1 md:!grid-cols-3 !gap-6 !mb-6">
            {scalePacks.map((pack) => {
              const isPopular = pack.credits === POPULAR_PACK_CREDITS;
              return (
                <div
                  key={pack.credits}
                  className={`!p-8 !flex !flex-col !items-center !justify-center !text-center !relative !border ${
                    isPopular
                      ? '!bg-black !text-white !border-black'
                      : '!bg-white !border-gray-200'
                  }`}
                >
                  {isPopular && (
                    <div className="!absolute !top-0 !left-1/2 !-translate-x-1/2 !-translate-y-1/2 !bg-[#05e5ba] !text-black !text-[10px] !font-bold !px-3 !py-1 !uppercase !tracking-wider">
                      Most Popular
                    </div>
                  )}
                  <div className={`!text-2xl !font-bold !mb-1 ${isPopular ? '!mt-2' : ''}`}>
                    {pack.credits.toLocaleString()} IC
                  </div>
                  <div className={`!text-base !mb-6 ${isPopular ? '!text-gray-400' : '!text-gray-500'}`}>
                    {formatPrice(pack.price)}
                  </div>
                  <button
                    onClick={() => handleAddCredits(pack.credits)}
                    className={`!w-full !py-3 !font-semibold !transition-colors ${
                      isPopular
                        ? '!bg-white !text-black hover:!bg-gray-200'
                        : '!border !border-black !text-black hover:!bg-black hover:!text-white'
                    }`}
                  >
                    Add Credits
                  </button>
                </div>
              );
            })}
          </div>
          <p className="!text-sm !text-gray-500 !font-medium !text-center md:!text-left">
            Designed for sustained AI operations.
          </p>
        </div>

        <p className="!text-xs !text-gray-400 !font-medium !text-center md:!text-left">
          Bulk discounts automatically applied for Enterprise customers.
        </p>
      </div>
    </div>
  );
}

export default CreditMarketplaceSection;
