'use client';

/**
 * PlanConfirmModal — pre-purchase confirmation shown when a pricing CTA is
 * clicked. It summarizes the selected plan (name, price, what's included) so
 * the user confirms what they're buying, then "Continue" opens the checkout
 * page in a NEW TAB — the landing page stays open behind it so the user never
 * loses their place.
 *
 * Rendered via a portal to <body>: the pricing sections use scroll-reveal
 * transforms on ancestors, which break `position: fixed` for anything mounted
 * inside that subtree.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/components/context/LanguageContext';
import { getProductById, isSubscription } from '@/lib/pricing';
import { getServiceInfo } from '@/lib/checkout-catalog';
import { formatCheckoutPrice, type CheckoutCurrency } from '@/lib/checkout-format';

export interface PlanConfirmModalProps {
  /** Product to confirm, or null when the modal is closed. */
  productId: string | null;
  /** Currency override from the pricing IDR/USD toggle; falls back to language. */
  currency?: CheckoutCurrency;
  onClose: () => void;
}

export function PlanConfirmModal({ productId, currency, onClose }: PlanConfirmModalProps) {
  const { language, exchangeRate } = useLanguage();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !productId) return null;
  const product = getProductById(productId);
  if (!product) return null;

  const activeCurrency: CheckoutCurrency =
    currency || (language === 'id' ? 'IDR' : 'USD');
  const priceLabel = formatCheckoutPrice(product.price, activeCurrency, exchangeRate);
  const recurring = isSubscription(product);
  const intervalSuffix = recurring ? (language === 'id' ? '/bulan' : '/month') : '';
  const info = getServiceInfo(productId);
  const continueLabel = language === 'id' ? 'Lanjut ke Pembayaran' : 'Continue to Checkout';

  const handleContinue = () => {
    if (typeof window !== 'undefined') {
      // New tab so the landing page stays open behind the checkout.
      window.open(`/checkout/${productId}`, '_blank', 'noopener,noreferrer');
    }
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-[#1a1a1a] max-h-[85vh] overflow-y-auto font-sans">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-5 top-5 text-gray-400 hover:text-[#1a1a1a] text-2xl leading-none"
        >
          &times;
        </button>

        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          {recurring ? 'Subscription' : 'One-time purchase'}
        </span>
        <h3 className="mt-2 text-2xl font-semibold">{product.name}</h3>
        <div className="mt-2 flex items-end gap-2">
          <span className="text-3xl font-bold">{priceLabel}</span>
          {intervalSuffix && <span className="pb-1 text-sm text-gray-500">{intervalSuffix}</span>}
        </div>

        {info && (
          <>
            <p className="mt-4 text-sm text-gray-600 leading-relaxed">{info.description}</p>
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                What&apos;s included
              </p>
              <ul className="space-y-2.5">
                {info.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-gray-700">
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
            </div>
          </>
        )}

        <button
          type="button"
          onClick={handleContinue}
          className="mt-8 w-full py-4 text-[15px] font-semibold bg-[#0d0d0d] text-white hover:bg-[#1a1a1a] rounded-lg transition"
        >
          {continueLabel}
        </button>
        <p className="mt-3 text-center text-xs text-gray-400">
          {language === 'id'
            ? 'Checkout terbuka di tab baru — halaman ini tetap terbuka.'
            : 'Checkout opens in a new tab — this page stays open.'}
        </p>
      </div>
    </div>,
    document.body
  );
}

export default PlanConfirmModal;
