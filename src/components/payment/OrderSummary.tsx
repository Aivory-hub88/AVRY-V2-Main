'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/components/context/LanguageContext';
import { formatCheckoutPrice, type CheckoutCurrency } from '@/lib/checkout-format';
import { getServiceInfo } from '@/lib/checkout-catalog';
import { validatePromoCode, type PromoQuote } from '@/lib/payment';

export interface OrderSummaryProps {
  productId: string;
  productName: string;
  priceUsd: number;
  invoiceNumber: string;
  /** 'subscription' shows a `/month` (or `/year`) suffix and billing note. */
  recurring: boolean;
  /** Billing period of a subscription; defaults to monthly. */
  interval?: 'one-time' | 'month' | 'year';
  /** The applied promo, if any. A preview: the server re-derives the charge. */
  promo?: PromoQuote | null;
  onPromoChange?: (promo: PromoQuote | null) => void;
}

export function OrderSummary({
  productId,
  productName,
  priceUsd,
  invoiceNumber,
  recurring,
  interval = 'month',
  promo = null,
  onPromoChange,
}: OrderSummaryProps) {
  const { language, exchangeRate } = useLanguage();
  const currency: CheckoutCurrency = language === 'id' ? 'IDR' : 'USD';
  const priceLabel = formatCheckoutPrice(priceUsd, currency, exchangeRate);
  const discountLabel = promo
    ? formatCheckoutPrice(promo.discountUsd, currency, exchangeRate)
    : '';
  const totalLabel = promo
    ? formatCheckoutPrice(promo.finalUsd, currency, exchangeRate)
    : priceLabel;

  const [codeDraft, setCodeDraft] = useState('');
  const [promoError, setPromoError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const applyPromo = async () => {
    const code = codeDraft.trim().toUpperCase();
    if (!code || !onPromoChange) return;
    setChecking(true);
    setPromoError(null);
    const result = await validatePromoCode(productId, code);
    setChecking(false);
    if (result.valid) {
      onPromoChange(result.quote);
      setCodeDraft('');
    } else {
      setPromoError(result.error);
    }
  };
  const info = getServiceInfo(productId);

  const payBefore = new Date();
  payBefore.setDate(payBefore.getDate() + 1);
  const formattedDate = payBefore.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const annual = recurring && interval === 'year';
  const intervalSuffix = !recurring
    ? ''
    : annual
      ? language === 'id' ? '/tahun' : '/year'
      : language === 'id' ? '/bulan' : '/month';

  return (
    <div className="relative isolate flex min-h-[560px] w-full flex-col overflow-hidden bg-[#05060d] text-white lg:min-h-screen">
      {/* Baked floral art (scripts/hero-renders/floral/bake-signin.cjs, PAL=checkout seed 77). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/landing/checkout/checkout-floral-v4.webp"
        alt=""
        aria-hidden="true"
        width={800}
        height={1280}
        decoding="async"
        draggable={false}
        className="absolute inset-0 -z-10 h-full w-full select-none object-cover object-bottom"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{ background: 'linear-gradient(180deg,rgba(5,6,13,.94) 0%,rgba(5,6,13,.88) 40%,rgba(5,6,13,.45) 58%,rgba(5,6,13,0) 72%)' }}
      />
      <div className="p-8 pb-6 lg:p-12 lg:pb-6">
      <h2 className="mb-2 text-2xl font-medium tracking-[-0.02em]">Order Summary</h2>
      <p className="text-sm font-semibold text-white/80 mb-8">Invoice #: {invoiceNumber}</p>

      <div className="flex items-center gap-2 text-sm font-semibold text-white/90 mb-8 pb-8 border-b border-white/15">
        <svg
          className="w-4 h-4 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        Pay before {formattedDate}
      </div>

      <div className="flex justify-between items-start mb-2">
        <div className="pr-4">
          <span className="font-medium block">{productName}</span>
          <span className="text-xs font-semibold uppercase tracking-wide text-white/75">
            {recurring ? 'Subscription' : 'One-time purchase'}
          </span>
        </div>
        <span className="font-semibold whitespace-nowrap">
          {priceLabel}
          {intervalSuffix && (
            <span className="text-xs font-semibold text-white/75">{intervalSuffix}</span>
          )}
        </span>
      </div>

      {info && (
        <>
          <p className="text-sm text-white/70 leading-relaxed mb-4">{info.description}</p>
          <ul className="space-y-1.5 mb-6">
            {info.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-white/85">
                <svg
                  className="w-4 h-4 mt-0.5 text-white shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {f}
              </li>
            ))}
          </ul>
        </>
      )}


      </div>

      <div className="px-6 pb-6 lg:px-8 lg:pb-8">
        <div className="rounded-2xl border border-white/15 bg-black/30 p-5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.7)] backdrop-blur-xl">
      {onPromoChange && (
        <div className="mb-4">
          {promo ? (
            <div className="flex items-center justify-between rounded-lg border border-white/25 bg-white/10 px-3 py-2.5 text-sm backdrop-blur-md">
              <span className="text-white">
                <span className="font-mono font-semibold">{promo.code}</span> applied
              </span>
              <button
                type="button"
                onClick={() => onPromoChange(null)}
                className="text-xs text-white/70 underline-offset-2 hover:text-white hover:underline"
              >
                Remove
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <input
                  value={codeDraft}
                  onChange={(e) => {
                    setCodeDraft(e.target.value.toUpperCase());
                    if (promoError) setPromoError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void applyPromo();
                    }
                  }}
                  placeholder="Promo code"
                  aria-label="Promo code"
                  maxLength={32}
                  className="min-w-0 flex-1 rounded-lg border border-white/25 bg-white/10 px-3 py-2.5 font-mono text-sm text-white backdrop-blur-md placeholder:font-sans placeholder:text-white/55 focus:border-white/60 focus:outline-none focus:ring-1 focus:ring-white/60"
                />
                <button
                  type="button"
                  onClick={() => void applyPromo()}
                  disabled={checking || !codeDraft.trim()}
                  className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-[#0d2a63] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {checking ? '…' : 'Apply'}
                </button>
              </div>
              {promoError && (
                <p className="mt-2 rounded-md bg-black/25 px-2 py-1 text-xs text-white">{promoError}</p>
              )}
            </>
          )}
        </div>
      )}

      {promo && (
        <div className="mb-4 flex justify-between text-sm text-white/90">
          <span>Promo {promo.code}</span>
          <span className="whitespace-nowrap">−{discountLabel}</span>
        </div>
      )}

      <div className="flex justify-between items-center">
        <span className="font-semibold text-white/90">Total Amount Due</span>
        <span className="text-xl font-bold whitespace-nowrap">
          {totalLabel}
          {intervalSuffix && (
            <span className="text-sm font-normal text-white/55">{intervalSuffix}</span>
          )}
        </span>
      </div>

      {recurring && (
        <p className="mt-3 text-xs text-white/60 leading-relaxed">
          {annual
            ? 'Billed annually — 12 months of access in one payment.'
            : 'Billed monthly. You can cancel anytime from your dashboard.'}
        </p>
      )}
        </div>
      </div>
    </div>
  );
}
