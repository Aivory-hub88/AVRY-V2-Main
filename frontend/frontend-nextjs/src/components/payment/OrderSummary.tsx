'use client';

import React from 'react';
import { useLanguage } from '@/components/context/LanguageContext';
import { formatCheckoutPrice, type CheckoutCurrency } from '@/lib/checkout-format';
import { getServiceInfo } from '@/lib/checkout-catalog';

export interface OrderSummaryProps {
  productId: string;
  productName: string;
  priceUsd: number;
  invoiceNumber: string;
  /** 'subscription' shows a `/month` suffix and recurring note. */
  recurring: boolean;
}

export function OrderSummary({
  productId,
  productName,
  priceUsd,
  invoiceNumber,
  recurring,
}: OrderSummaryProps) {
  const { language, exchangeRate } = useLanguage();
  const currency: CheckoutCurrency = language === 'id' ? 'IDR' : 'USD';
  const priceLabel = formatCheckoutPrice(priceUsd, currency, exchangeRate);
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

  const intervalSuffix = recurring ? (language === 'id' ? '/bulan' : '/month') : '';

  return (
    <div className="w-full bg-[#f8f9fa] min-h-screen p-8 lg:p-12 text-[#1a1a1a]">
      <h2 className="text-2xl font-semibold mb-2">Order Summary</h2>
      <p className="text-sm text-gray-500 mb-8">Invoice #: {invoiceNumber}</p>

      <div className="flex items-center gap-2 text-sm text-gray-600 mb-8 pb-8 border-b border-gray-200">
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
          <span className="text-xs uppercase tracking-wide text-gray-400">
            {recurring ? 'Subscription' : 'One-time purchase'}
          </span>
        </div>
        <span className="font-semibold whitespace-nowrap">
          {priceLabel}
          {intervalSuffix && (
            <span className="text-xs font-normal text-gray-400">{intervalSuffix}</span>
          )}
        </span>
      </div>

      {info && (
        <>
          <p className="text-sm text-gray-500 leading-relaxed mb-4">{info.description}</p>
          <ul className="space-y-1.5 mb-6">
            {info.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                <svg
                  className="w-4 h-4 mt-0.5 text-green-500 shrink-0"
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

      <div className="flex justify-between items-center pt-6 border-t border-gray-200">
        <span className="font-semibold text-gray-700">Total Amount Due</span>
        <span className="text-xl font-bold whitespace-nowrap">
          {priceLabel}
          {intervalSuffix && (
            <span className="text-sm font-normal text-gray-400">{intervalSuffix}</span>
          )}
        </span>
      </div>

      {recurring && (
        <p className="mt-3 text-xs text-gray-400 leading-relaxed">
          Recurring monthly. You can cancel anytime from your dashboard.
        </p>
      )}
    </div>
  );
}
