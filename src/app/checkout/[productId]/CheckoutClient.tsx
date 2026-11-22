'use client';

/**
 * /checkout/[productId] — self-serve checkout page.
 *
 * Resolves the product from the canonical pricing catalog (@/lib/pricing),
 * then hands the multi-step flow to <CheckoutForm> (auth → method → details →
 * PIN/OTP → success) with an <OrderSummary> sidebar.
 *
 * Payment execution is a mock while the Midtrans channels are being activated
 * (see CheckoutForm's MOCK_PAYMENT). Sign-in/sign-up is real.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckoutForm } from '@/components/payment/CheckoutForm';
import { OrderSummary } from '@/components/payment/OrderSummary';
import { getProductById, isSubscription } from '@/lib/pricing';
import { isAuthenticated } from '@/lib/auth';
import type { PromoQuote } from '@/lib/payment';

export default function CheckoutClient() {
  const params = useParams();
  const router = useRouter();
  const productId = (params.productId as string) || '';

  const product = useMemo(() => getProductById(productId), [productId]);

  const [mounted, setMounted] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  // Preview of an applied promo. The charge itself is re-derived server-side.
  const [promo, setPromo] = useState<PromoQuote | null>(null);

  useEffect(() => {
    setMounted(true);
    setAuthed(isAuthenticated());
    // Client-only so it never mismatches the server-rendered markup.
    setInvoiceNumber(`AVRY-${Math.floor(Math.random() * 90000) + 10000}`);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#07080c] flex items-center justify-center text-white/40">
        Loading…
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#07080c] flex flex-col items-center justify-center text-center px-6">
        <h1 className="text-2xl font-medium text-white mb-2">Product not found</h1>
        <p className="text-white/50 mb-8">
          We couldn&apos;t find a plan matching &ldquo;{productId}&rdquo;.
        </p>
        <button
          type="button"
          onClick={() => router.push('/pricing')}
          className="py-3 px-6 text-sm font-semibold bg-[#f4f4f4] text-[#0f1115] hover:bg-white rounded-xl transition"
        >
          Back to Pricing
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07080c] text-white font-sans">
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-screen">
        <div className="lg:col-span-7 xl:col-span-8 bg-[#07080c]">
          <CheckoutForm
            productId={product.id}
            productName={product.name}
            priceUsd={promo ? promo.finalUsd : product.price}
            promoCode={promo?.code}
            initialAuthed={authed}
            onComplete={() => {}}
          />
        </div>
        <div className="lg:col-span-5 xl:col-span-4 bg-[#05060d]">
          <OrderSummary
            productId={product.id}
            productName={product.name}
            priceUsd={product.price}
            invoiceNumber={invoiceNumber}
            recurring={isSubscription(product)}
            interval={product.interval}
            promo={promo}
            onPromoChange={setPromo}
          />
        </div>
      </div>
    </div>
  );
}
