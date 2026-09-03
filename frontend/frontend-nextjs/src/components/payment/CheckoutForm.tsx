'use client';

/**
 * CheckoutForm — the full checkout flow for /checkout/[productId].
 *
 * Flow: (sign in / sign up) → payment method → channel-specific data entry
 * (card + billing / e-wallet phone / QRIS) → PIN → OTP → processing → success.
 *
 * Sign-in/sign-up is REAL: it calls the live backend auth service via
 * `@/lib/auth` (login / signup), the same one the rest of the site uses.
 *
 * PAYMENT IS LIVE. `MOCK_PAYMENT` is `false`: the method step creates a real
 * Midtrans transaction and hands off to the Snap popup, which owns card entry,
 * 3-D Secure, and e-wallet authorisation.
 *
 * This page therefore never touches card data. The card / PIN / OTP steps
 * below exist only for the mock path — the live path skips straight from the
 * method step into Snap, so no PAN, CVV, or OTP is ever entered into, held by,
 * or transmitted from this origin. Do not wire those fields into the live
 * path; doing so would drag this origin into PCI-DSS scope.
 *
 * The server prices the order from its own catalogue (`createPaymentTransaction`
 * sends no amount), so a browser cannot name its own price.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/context/LanguageContext';
import { login, signup, getUser, type User } from '@/lib/auth';
import {
  createPaymentTransaction,
  startMidtransSnap,
  isMidtransAvailable,
  loadMidtransSnap,
  fetchMidtransClientKey,
} from '@/lib/payment';
import { createDirectCharge, type DirectChargeResult } from '@/lib/payment';
import { loadMidtrans3ds, getCardToken, authenticate3ds } from '@/lib/midtrans-3ds';
import {
  detectCardBrand,
  lookupBin,
  formatBankName,
  formatBinType,
  BRAND_ICONS,
  BRAND_LABELS,
  BIN_LENGTH,
  type BinInfo,
} from '@/lib/card-brand';
import { formatCheckoutPrice, type CheckoutCurrency } from '@/lib/checkout-format';
import { SpotlightButton } from '@/components/ui/SpotlightButton';
import TurnstileWidget from '@/components/payment/TurnstileWidget';
import { trackEvent } from '@/lib/analytics';

// Live. Set to true only to demo the flow without touching the gateway; the
// mock path collects card-shaped fields locally and transmits nothing.
const MOCK_PAYMENT: boolean = false;

// Baked in at build time from the compose build args. Empty in a local dev
// checkout that has no key configured, which disables the gate rather than
// locking the flow behind a widget that can never solve.
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';

// Must match EXPECTED_ACTION in src/app/api/turnstile/verify/route.ts.
const TURNSTILE_ACTION = 'checkout';

type Step =
  | 'auth'
  | 'method'
  | 'details'
  | 'pin'
  | 'otp'
  | 'processing'
  | 'awaiting'
  | 'success';
type Channel = 'credit_card' | 'gopay' | 'qris';

export interface CheckoutFormProps {
  productId: string;
  productName: string;
  priceUsd: number;
  initialAuthed: boolean;
  onComplete: () => void;
}

/**
 * A payment mark, sized per logo so a wordmark and a symbol carry the same
 * optical weight — the same treatment the pricing page uses. These are the
 * official marks from /public/payments; they used to be approximations drawn
 * with Tailwind classes (a "VISA" text box, two coloured circles for
 * Mastercard, a red "QRIS" chip).
 */
function ChannelMark({ src, alt, height }: { src: string; alt: string; height: number }) {
  return (
    <img
      src={src}
      alt={alt}
      height={height}
      style={{ height, width: 'auto' }}
      decoding="async"
    />
  );
}

const CHANNELS: { id: Channel; label: string; badge: React.ReactNode }[] = [
  {
    id: 'credit_card',
    label: 'Credit / Debit Card',
    badge: (
      <div className="flex items-center gap-2.5">
        <ChannelMark src="/payments/visa.svg" alt="Visa" height={14} />
        <ChannelMark src="/payments/mastercard.svg" alt="Mastercard" height={18} />
      </div>
    ),
  },
  {
    id: 'gopay',
    label: 'GoPay (E-Wallet)',
    badge: <ChannelMark src="/payments/gopay.svg" alt="GoPay" height={13} />,
  },
  {
    id: 'qris',
    label: 'QRIS',
    badge: <ChannelMark src="/payments/qris.svg" alt="QRIS" height={14} />,
  },
];

// ---------------------------------------------------------------------------
// Small presentational helpers
// ---------------------------------------------------------------------------

const inputClass =
  'w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-[15px] text-[#1a1a1a] placeholder:text-gray-400 focus:outline-none focus:border-[#4a90e2] focus:ring-1 focus:ring-[#4a90e2] transition';
const labelClass =
  'block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5';
const primaryBtn =
  'w-full py-4 text-[15px] font-semibold bg-[#0d0d0d] text-white hover:bg-[#1a1a1a] rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed';
const backBtn =
  'text-[13px] text-gray-500 hover:text-[#1a1a1a] transition-colors mb-6 inline-flex items-center gap-1';

function formatCardNumber(raw: string): string {
  return raw
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(.{4})/g, '$1 ')
    .trim();
}

function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

/** Row of single-digit boxes with auto-advance + backspace-to-previous. */
function DigitBoxes({
  length,
  value,
  onChange,
  mask,
}: {
  length: number;
  value: string;
  onChange: (v: string) => void;
  mask?: boolean;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.padEnd(length, ' ').split('');

  const setDigit = (idx: number, char: string) => {
    const arr = value.split('');
    arr[idx] = char;
    onChange(arr.join('').slice(0, length));
  };

  const handleChange = (idx: number, raw: string) => {
    // Accept multi-digit input (paste, autofill, or fast typing that outruns
    // focus) by distributing digits across the boxes from `idx` onward.
    const incoming = raw.replace(/\D/g, '');
    if (!incoming) return;
    const arr = value.padEnd(length, ' ').split('');
    let cursor = idx;
    for (const ch of incoming) {
      if (cursor >= length) break;
      arr[cursor] = ch;
      cursor += 1;
    }
    onChange(arr.join('').replace(/ +$/g, ''));
    refs.current[Math.min(cursor, length - 1)]?.focus();
  };

  const handleKeyDown = (
    idx: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === 'Backspace') {
      if (value[idx]) {
        setDigit(idx, '');
      } else if (idx > 0) {
        refs.current[idx - 1]?.focus();
        setDigit(idx - 1, '');
      }
    }
  };

  return (
    <div className="flex gap-2.5 justify-center">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type={mask ? 'password' : 'text'}
          inputMode="numeric"
          maxLength={1}
          value={digits[i] === ' ' ? '' : digits[i]}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="w-12 h-14 text-center text-[20px] text-[#1a1a1a] border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-[#4a90e2] focus:ring-1 focus:ring-[#4a90e2] transition"
        />
      ))}
    </div>
  );
}

/**
 * Decorative QR placeholder — reads as a real QR in screenshots but encodes
 * nothing and is not scannable. Deterministic (no Math.random) so server and
 * client render identical markup.
 */
const QR_SIZE = 25;
const QR_MATRIX: boolean[][] = (() => {
  const finders: Array<[number, number]> = [
    [0, 0],
    [0, QR_SIZE - 7],
    [QR_SIZE - 7, 0],
  ];
  const finderPixel = (r: number, c: number) => {
    if (r === 0 || r === 6 || c === 0 || c === 6) return true;
    if (r === 1 || r === 5 || c === 1 || c === 5) return false;
    return true;
  };
  const m: boolean[][] = [];
  for (let r = 0; r < QR_SIZE; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < QR_SIZE; c++) {
      const zone = finders.find(
        ([zr, zc]) => r >= zr && r < zr + 7 && c >= zc && c < zc + 7
      );
      if (zone) row.push(finderPixel(r - zone[0], c - zone[1]));
      else if (r === 6 || c === 6) row.push((r + c) % 2 === 0);
      else row.push((r * 13 + c * 7 + r * c * 3) % 5 < 2);
    }
    m.push(row);
  }
  return m;
})();

function QrPlaceholder() {
  return (
    <div className="w-[200px] h-[200px] p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
      <svg
        viewBox={`0 0 ${QR_SIZE} ${QR_SIZE}`}
        width="100%"
        height="100%"
        shapeRendering="crispEdges"
      >
        <rect x={0} y={0} width={QR_SIZE} height={QR_SIZE} fill="#fff" />
        {QR_MATRIX.map((row, r) =>
          row.map((on, c) =>
            on ? (
              <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#1a1a1a" />
            ) : null
          )
        )}
      </svg>
    </div>
  );
}

/**
 * Midtrans attribution badge. The wordmark used to be typed out in Tailwind
 * classes; it is now the official lockup from midtrans.com. The white-on-dark
 * variant sits at /payments/midtrans.svg if a dark surface ever needs it.
 * Spacing is deliberately left to the call site.
 */
function MidtransBadge() {
  return (
    <div className="inline-flex items-center gap-2.5 border border-blue-200 bg-blue-50/50 rounded px-3 py-1.5">
      <span className="text-[10px] font-semibold text-blue-400 tracking-wider">
        POWERED BY
      </span>
      <img
        src="/payments/midtrans-blue.svg"
        alt="Midtrans"
        height={15}
        style={{ height: 15, width: 'auto' }}
        decoding="async"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CheckoutForm({
  productId,
  productName,
  priceUsd,
  initialAuthed,
  onComplete,
}: CheckoutFormProps) {
  const router = useRouter();
  const { language, setLanguage, exchangeRate } = useLanguage();
  const currency: CheckoutCurrency = language === 'id' ? 'IDR' : 'USD';
  const priceLabel = formatCheckoutPrice(priceUsd, currency, exchangeRate);

  const [step, setStep] = useState<Step>(initialAuthed ? 'method' : 'auth');
  const [channel, setChannel] = useState<Channel | null>(null);
  // Core API result for the channel the customer picked — the QR, deeplink or
  // VA number we draw ourselves instead of handing the screen to Snap.
  const [charge, setCharge] = useState<DirectChargeResult | null>(null);
  // The issuing bank's 3-D Secure page, shown in an overlay so the customer
  // stays on this checkout instead of being sent to a separate tab.
  const [threeDsUrl, setThreeDsUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [langOpen, setLangOpen] = useState(false);

  // Auth
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirm, setAuthConfirm] = useState('');
  const [authCompany, setAuthCompany] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Card fields
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  // Issuing-bank / credit-vs-debit metadata from Midtrans' BIN API. Purely
  // informational: nothing below gates on it, per Midtrans' own guidance that
  // BIN values are advisory and may be empty.
  const [binInfo, setBinInfo] = useState<BinInfo | null>(null);
  const [billingAddress, setBillingAddress] = useState('');
  const [billingCity, setBillingCity] = useState('');
  const [billingPostal, setBillingPostal] = useState('');
  const [billingCountry, setBillingCountry] = useState('Indonesia');

  // Network from the leading digits — local, instant, runs on every keystroke.
  const cardBrand = detectCardBrand(cardNumber);

  // The bank behind those digits needs Midtrans. Debounced and keyed on the
  // BIN alone, so it fires once per card rather than once per keystroke, and
  // an in-flight request is aborted the moment the BIN changes.
  const cardBin = cardNumber.replace(/\D/g, '').slice(0, BIN_LENGTH);
  useEffect(() => {
    if (cardBin.length < BIN_LENGTH) {
      setBinInfo(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (!window.MIDTRANS_CLIENT_KEY) await fetchMidtransClientKey();
      const key = window.MIDTRANS_CLIENT_KEY;
      if (!key) return;
      const info = await lookupBin(
        cardBin,
        key,
        window.MIDTRANS_IS_PRODUCTION !== false,
        controller.signal,
      );
      setBinInfo(info);
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [cardBin]);

  // E-wallet fields
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [otp, setOtp] = useState('');

  // Turnstile. `humanVerified` is what actually gates payment: it is only set
  // after the server round-trip succeeds, never straight from the widget
  // callback, so a forged client-side token cannot open the flow.
  const turnstileEnabled = TURNSTILE_SITE_KEY.length > 0;
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [humanVerified, setHumanVerified] = useState(!turnstileEnabled);
  const [verifying, setVerifying] = useState(false);
  const [turnstileResetSignal, setTurnstileResetSignal] = useState(0);

  useEffect(() => {
    setCurrentUser(getUser());
  }, []);

  const payBefore = useRef<Date>(
    (() => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return d;
    })()
  ).current;
  const dateStr = payBefore
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    .toUpperCase();
  const timeStr = payBefore.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const isEwallet = channel === 'gopay';
  const channelLabel = CHANNELS.find((c) => c.id === channel)?.label ?? '';

  const detailsValid =
    channel === 'credit_card'
      ? cardNumber.replace(/\D/g, '').length >= 12 &&
        cardExpiry.length === 5 &&
        cardCvv.length >= 3 &&
        cardName.trim().length > 1 &&
        billingAddress.trim().length > 3 &&
        billingCity.trim().length > 1 &&
        billingPostal.trim().length >= 4
      : isEwallet
        ? phone.replace(/\D/g, '').length >= 8
        : true;

  // -- Payment execution --------------------------------------------------

  const runMockPayment = () => {
    setStep('processing');
    // Simulate a gateway round-trip; no data is transmitted or stored.
    setTimeout(() => setStep('success'), 1600);
  };

  // Core API channels that can be drawn entirely on this page. Card is absent
  // on purpose: it needs Midtrans' browser tokenisation library first. DANA is
  // absent because Core API has no payment_type for it at all — both keep
  // running through Snap.
  const DIRECT_CHANNELS = new Set(['gopay', 'qris', 'credit_card']);

  // On by default. This was opt-in while the direct path was unproven, but the
  // opt-in was the reason nobody ever saw it — the flag has to be remembered on
  // every visit, so the checkout simply stayed on Snap.
  //
  // Defaulting it on is safe because a direct charge that throws or comes back
  // fallback_to_snap drops through to the Snap path below rather than stranding
  // the customer. `?pay=snap` forces the old flow if the new one ever misbehaves.
  const directPayEnabled =
    typeof window === 'undefined' ||
    new URLSearchParams(window.location.search).get('pay') !== 'snap';

  const runDirectCharge = async (picked: Channel): Promise<boolean> => {
    let cardTokenId: string | undefined;

    if (picked === 'credit_card') {
      // Card details go straight from this form to Midtrans and come back as a
      // single-use token. They never touch an Aivory server, and the customer
      // never types them a second time into someone else's popup.
      // The client key is ALWAYS needed here. This used to be guarded by
      // `!isMidtransAvailable() && ...`, copied from the Snap path where that
      // reads "Snap is already loaded, so no key is needed" — but tokenisation
      // needs the key regardless. Once Snap's SDK was present the key was
      // never fetched, so this bailed out and every card silently fell back to
      // the Snap popup.
      if (!window.MIDTRANS_CLIENT_KEY) {
        await fetchMidtransClientKey();
      }
      const clientKey = window.MIDTRANS_CLIENT_KEY;
      if (!clientKey) {
        console.warn('[checkout] No Midtrans client key; falling back to Snap');
        return false;
      }

      await loadMidtrans3ds(clientKey, window.MIDTRANS_IS_PRODUCTION !== false);
      cardTokenId = await getCardToken({
        number: cardNumber,
        expiry: cardExpiry,
        cvv: cardCvv,
      });
    }

    const result = await createDirectCharge(productId, picked, cardTokenId);
    if (result.fallback_to_snap || !result.success) {
      console.warn(
        '[checkout] Direct charge declined, falling back to Snap:',
        result.error || 'channel not served by Core API',
      );
      return false;
    }

    // A card charge that needs 3-D Secure comes back with the issuer's URL
    // instead of a finished payment.
    if (result.redirect_url) {
      const outcome = await authenticate3ds(
        result.redirect_url,
        (url) => setThreeDsUrl(url),
        () => setThreeDsUrl(null),
      );
      if (outcome === 'success') {
        trackEvent('purchase', {
          value: priceUsd,
          currency: 'USD',
          transaction_id: result.order_id,
        });
        setStep('success');
        return true;
      }
    }

    setCharge(result);
    setStep('awaiting');
    return true;
  };

  const runRealPayment = async () => {
    setStep('processing');
    setError(null);
    try {
      // Draw the payment ourselves where we can. A refusal falls through to
      // Snap rather than stranding the customer.
      if (directPayEnabled && channel && DIRECT_CHANNELS.has(channel)) {
        try {
          if (await runDirectCharge(channel)) return;
        } catch (directErr) {
          console.warn('Direct charge unavailable, falling back to Snap:', directErr);
        }
      }

      // The server prices the product from its own catalogue — no amount is
      // sent from here. The Channel ids in CHANNELS are deliberately the same
      // strings Midtrans uses, so the picked one passes straight through and
      // Snap opens on it rather than asking the customer to choose again.
      const result = await createPaymentTransaction(
        productId,
        channel ? [channel] : undefined
      );
      if (!result?.token) throw new Error('Failed to get payment token');

      // Snap is loaded on demand rather than on every page view: the SDK is
      // only needed once a customer actually commits to paying.
      if (!isMidtransAvailable()) {
        await fetchMidtransClientKey();
        // fetchMidtransClientKey parks the key on window; read it through an
        // explicit cast rather than relying on a global augmentation that this
        // project does not actually declare anywhere.
        const clientKey =
          typeof window === 'undefined'
            ? undefined
            : (window as unknown as { MIDTRANS_CLIENT_KEY?: string }).MIDTRANS_CLIENT_KEY;
        if (!clientKey) throw new Error('Payment gateway is unavailable. Please try again.');
        await loadMidtransSnap(clientKey);
      }

      if (isMidtransAvailable()) {
        // Snap owns channel choice, card entry and 3-D Secure from here.
        const snapResult = await startMidtransSnap(result.token);

        // startMidtransSnap resolves for pending payments as well as paid
        // ones -- bank transfer / VA and convenience-store orders land in
        // Snap's onPending with instructions issued and no money received.
        // Firing `purchase` on those inflates the Google Ads Purchase
        // conversion (a GA4 import of this very event) and feeds smart
        // bidding orders that may never be paid, which matters here because
        // VA is a common method for Indonesian customers. Only a settled
        // card capture or a settlement counts; a capture still sitting in
        // fraud review does not.
        const transactionStatus = snapResult?.transaction_status;
        const isPaid =
          transactionStatus === 'settlement' ||
          (transactionStatus === 'capture' && snapResult?.fraud_status !== 'challenge');

        if (isPaid) {
          trackEvent('purchase', {
            value: priceUsd,
            currency: 'USD',
            transaction_id: result.order_id,
          });
        }
        setStep('success');
        return;
      }

      // Snap could not load (blocked script, offline). Midtrans' hosted page
      // is the same transaction, so send the customer there rather than
      // failing a checkout that already has a valid token.
      if (result.redirect_url && typeof window !== 'undefined') {
        window.location.href = result.redirect_url;
        return;
      }
      throw new Error('Payment gateway is unavailable. Please try again.');
    } catch (err) {
      // Closing the Snap popup rejects too; that is an abandoned payment, not
      // a failure worth shouting about, so it returns to the method step
      // without an error banner.
      const message = err instanceof Error ? err.message : '';
      const closed = /payment closed/i.test(message);

      // An expired session reaches here as the gateway's own wording, which
      // tells a customer nothing actionable at the moment they are trying to
      // pay. Send them to the sign-in step this page already has instead.
      if (/token|unauthor|not authenticated|401/i.test(message)) {
        setAuthError('Your session has expired. Please sign in again to continue.');
        setStep('auth');
        setHumanVerified(!turnstileEnabled);
        setTurnstileToken(null);
        setTurnstileResetSignal((n) => n + 1);
        return;
      }

      if (!closed) {
        setError(message || 'Payment initialisation failed');
      }
      setStep('method');
      // The Turnstile token was spent on the attempt; mint a fresh one so a
      // retry is not rejected as a replay.
      setHumanVerified(!turnstileEnabled);
      setTurnstileToken(null);
      setTurnstileResetSignal((n) => n + 1);
    }
  };

  const pay = () => {
    // Belt and braces: the method step already gates on this, but pay() is
    // also reachable from the OTP step, so it re-checks rather than trusting
    // that the user could only have arrived here through the gate.
    if (!humanVerified) {
      setError('Please complete the verification challenge before paying.');
      setStep('method');
      return;
    }
    return MOCK_PAYMENT ? runMockPayment() : runRealPayment();
  };

  /**
   * Exchange the widget token for a server-side verdict, then advance.
   * Tokens are single-use, so a rejection resets the widget for a fresh one.
   */
  const handleMethodContinue = async () => {
    if (!turnstileEnabled) {
      setStep('details');
      return;
    }
    if (!turnstileToken) {
      setError('Please complete the verification challenge.');
      return;
    }

    setVerifying(true);
    setError(null);
    try {
      const response = await fetch('/api/turnstile/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: turnstileToken }),
      });
      if (!response.ok) throw new Error('verification rejected');
      setHumanVerified(true);
      // Live checkout used to hand straight to Snap here, because the card
      // form was mock-only: putting it in front of a real gateway that
      // collects the same data itself would have asked for the card twice.
      //
      // That is no longer true for the direct path — we tokenise the card
      // ourselves, so the form has to be shown or there is nothing to
      // tokenise. Skipping it is exactly why every card fell back to Snap:
      // runRealPayment ran with the card fields still empty, getCardToken
      // threw, and the fallback did its job silently.
      //
      // Everything else still goes straight through: e-wallets and QRIS need
      // no details from us, and a card on the Snap path must not be asked
      // twice.
      const collectCardHere = directPayEnabled && channel === 'credit_card';
      if (MOCK_PAYMENT || collectCardHere) {
        setStep('details');
      } else {
        await runRealPayment();
      }
    } catch {
      setHumanVerified(false);
      setTurnstileToken(null);
      setTurnstileResetSignal((n) => n + 1);
      setError('Verification failed. Please try the challenge again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleDetailsContinue = () => {
    // E-wallets verify with an in-app PIN then an SMS OTP; card + QRIS pay now.
    if (isEwallet) setStep('pin');
    else pay();
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (authMode === 'signup' && authPassword !== authConfirm) {
      setAuthError('Passwords do not match.');
      return;
    }
    setAuthLoading(true);
    try {
      const user =
        authMode === 'signin'
          ? await login(authEmail, authPassword)
          : await signup(authEmail, authPassword, authCompany || undefined);
      setCurrentUser(user);
      setStep('method');
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      );
    } finally {
      setAuthLoading(false);
    }
  };

  // -- Render -------------------------------------------------------------

  return (
    <div className="w-full bg-white min-h-screen p-8 lg:p-12 text-[#1a1a1a] flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-12">
        <img
          src="/Aivory_logo_2_2026.svg"
          alt="Aivory"
          width={383}
          height={79}
          className="h-8 w-auto filter invert"
        />
        <div className="relative">
          <button
            type="button"
            onClick={() => setLangOpen((v) => !v)}
            className="flex items-center gap-1 text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-md transition-colors"
          >
            {language === 'id' ? 'Bahasa Indonesia' : 'English'}
            <svg
              className="w-4 h-4 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {langOpen && (
            <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-md shadow-lg z-10 overflow-hidden">
              {(['en', 'id'] as const).map((lng) => (
                <button
                  key={lng}
                  type="button"
                  onClick={() => {
                    setLanguage(lng);
                    setLangOpen(false);
                  }}
                  className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                    language === lng ? 'font-semibold text-[#4a90e2]' : 'text-gray-700'
                  }`}
                >
                  {lng === 'en' ? 'English' : 'Bahasa Indonesia'}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 max-w-lg mx-auto w-full bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-4 font-bold">
            ✕
          </button>
        </div>
      )}

      <div className="flex-grow flex flex-col items-center justify-center max-w-lg mx-auto w-full">
        {/* ---- AUTH ---- */}
        {step === 'auth' && (
          <div className="w-full">
            <h1 className="text-2xl font-semibold mb-1 text-center">
              {authMode === 'signin' ? 'Sign in to continue' : 'Create your account'}
            </h1>
            <p className="text-sm text-gray-500 mb-8 text-center">
              {productName} · <span className="font-semibold text-[#1a1a1a]">{priceLabel}</span>
            </p>

            <div className="flex mb-6 border border-gray-200 rounded-full p-1 bg-gray-50">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signin');
                  setAuthError(null);
                }}
                className={`flex-1 py-2 text-sm font-medium rounded-full transition-colors ${
                  authMode === 'signin' ? 'bg-white shadow-sm text-[#1a1a1a]' : 'text-gray-500'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signup');
                  setAuthError(null);
                }}
                className={`flex-1 py-2 text-sm font-medium rounded-full transition-colors ${
                  authMode === 'signup' ? 'bg-white shadow-sm text-[#1a1a1a]' : 'text-gray-500'
                }`}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className={inputClass}
                />
              </div>
              {authMode === 'signup' && (
                <div>
                  <label className={labelClass}>Company (optional)</label>
                  <input
                    type="text"
                    autoComplete="organization"
                    placeholder="Acme Corporation"
                    value={authCompany}
                    onChange={(e) => setAuthCompany(e.target.value)}
                    className={inputClass}
                  />
                </div>
              )}
              <div>
                <label className={labelClass}>Password</label>
                <input
                  type="password"
                  required
                  autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className={inputClass}
                />
              </div>
              {authMode === 'signup' && (
                <div>
                  <label className={labelClass}>Confirm Password</label>
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={authConfirm}
                    onChange={(e) => setAuthConfirm(e.target.value)}
                    className={inputClass}
                  />
                </div>
              )}
              {authError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                  {authError}
                </p>
              )}
              <div className="mt-2 w-full">
                <SpotlightButton type="submit" disabled={authLoading} className="w-full" roundedClass="rounded-lg">
                  {authLoading
                    ? 'Please wait…'
                    : authMode === 'signin'
                      ? 'Sign In'
                      : 'Create Account'}
                </SpotlightButton>
              </div>
            </form>
            <p className="mt-4 text-center text-xs text-gray-400">
              This step is real — it authenticates against your live Aivory account.
            </p>
          </div>
        )}

        {/* ---- METHOD ---- */}
        {step === 'method' && (
          <div className="w-full">
            {!initialAuthed && (
              <button type="button" onClick={() => setStep('auth')} className={backBtn}>
                ← Back
              </button>
            )}
            <p className="text-sm font-semibold text-gray-500 tracking-wider mb-4 text-center">
              PAY BEFORE {dateStr} AT {timeStr}
            </p>
            <h1 className="text-5xl font-light text-[#4a90e2] mb-12 text-center">
              {priceLabel}
            </h1>

            <p className="text-xs font-bold text-gray-500 tracking-wider mb-4">
              PAYMENT METHOD
            </p>
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              {CHANNELS.map((c, i) => (
                <label
                  key={c.id}
                  className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
                    i < CHANNELS.length - 1 ? 'border-b border-gray-200' : ''
                  } ${channel === c.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payment_method"
                      checked={channel === c.id}
                      onChange={() => setChannel(c.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="font-medium text-sm">{c.label}</span>
                  </div>
                  {c.badge}
                </label>
              ))}
            </div>

            {turnstileEnabled && (
              <div className="mt-6 flex justify-center">
                <TurnstileWidget
                  siteKey={TURNSTILE_SITE_KEY}
                  action={TURNSTILE_ACTION}
                  onToken={setTurnstileToken}
                  onExpire={() => {
                    setTurnstileToken(null);
                    setHumanVerified(false);
                  }}
                  resetSignal={turnstileResetSignal}
                />
              </div>
            )}

            <div className="mt-6 w-full">
              <SpotlightButton
                type="button"
                disabled={!channel || verifying || (turnstileEnabled && !turnstileToken)}
                onClick={handleMethodContinue}
                className="w-full"
                roundedClass="rounded-lg"
              >
                {verifying ? 'Verifying…' : 'Continue'}
              </SpotlightButton>
            </div>
            <div className="mt-12 flex justify-center">
              <MidtransBadge />
            </div>
          </div>
        )}

        {/* ---- DETAILS ---- */}
        {step === 'details' && channel && (
          <div className="w-full">
            <button type="button" onClick={() => setStep('method')} className={backBtn}>
              ← Back
            </button>
            <h1 className="text-2xl font-semibold mb-1">{channelLabel}</h1>
            <p className="text-sm text-gray-500 mb-8">
              {productName} · <span className="font-semibold text-[#1a1a1a]">{priceLabel}</span>
            </p>

            {channel === 'credit_card' && (
              <div className="flex flex-col gap-4">
                <div>
                  <label className={labelClass}>Card Number</label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="4811 1111 1111 1114"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      className={`${inputClass} pr-14`}
                    />
                    {cardBrand && BRAND_ICONS[cardBrand] && (
                      <img
                        key={cardBrand}
                        src={BRAND_ICONS[cardBrand]}
                        alt={BRAND_LABELS[cardBrand]}
                        className="card-brand-mark absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
                        style={{ height: cardBrand === 'mastercard' ? 20 : 14, width: 'auto' }}
                        decoding="async"
                      />
                    )}
                  </div>
                  {(binInfo?.bank || binInfo?.binType) && (
                    <p className="mt-1.5 text-xs text-gray-500">
                      {[
                        binInfo.bank ? formatBankName(binInfo.bank) : null,
                        binInfo.binType ? formatBinType(binInfo.binType) : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  )}
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className={labelClass}>Expiry</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                      className={inputClass}
                    />
                  </div>
                  <div className="flex-1">
                    <label className={labelClass}>CVV</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      placeholder="123"
                      maxLength={4}
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Cardholder Name</label>
                  <input
                    type="text"
                    placeholder="As it appears on the card"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="mt-2 pt-4 border-t border-gray-200">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
                    Billing Address
                  </p>
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className={labelClass}>Address</label>
                      <input
                        type="text"
                        placeholder="Street address"
                        value={billingAddress}
                        onChange={(e) => setBillingAddress(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className={labelClass}>City</label>
                        <input
                          type="text"
                          placeholder="Jakarta"
                          value={billingCity}
                          onChange={(e) => setBillingCity(e.target.value)}
                          className={inputClass}
                        />
                      </div>
                      <div className="flex-1">
                        <label className={labelClass}>Postal Code</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="12345"
                          value={billingPostal}
                          onChange={(e) =>
                            setBillingPostal(e.target.value.replace(/\D/g, '').slice(0, 6))
                          }
                          className={inputClass}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Country</label>
                      <input
                        type="text"
                        value={billingCountry}
                        onChange={(e) => setBillingCountry(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isEwallet && (
              <div className="flex flex-col gap-4">
                <div>
                  <label className={labelClass}>{channelLabel} Phone Number</label>
                  <div className="flex">
                    <span className="flex items-center px-4 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50 text-[15px] text-gray-600">
                      +62
                    </span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      placeholder="812xxxxxxx"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 13))}
                      className={`${inputClass} rounded-l-none flex-1`}
                    />
                  </div>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Next, you&apos;ll confirm with your {channelLabel.replace(' (E-Wallet)', '')} PIN
                  and a one-time code sent to this number.
                </p>
              </div>
            )}

            {channel === 'qris' && (
              <div className="flex flex-col items-center py-2">
                <QrPlaceholder />
                <p className="mt-5 text-sm text-gray-600 text-center max-w-xs">
                  Open GoPay, DANA, OVO, ShopeePay, or any mobile banking app and scan this QRIS
                  code to pay {priceLabel}.
                </p>
              </div>
            )}

            <div className="mt-8 w-full">
              <SpotlightButton
                type="button"
                disabled={!detailsValid}
                onClick={handleDetailsContinue}
                className="w-full"
                roundedClass="rounded-lg"
              >
                {channel === 'qris'
                  ? "I've scanned and paid"
                  : isEwallet
                    ? 'Continue'
                    : `Pay ${priceLabel}`}
              </SpotlightButton>
            </div>
            {/* This step used to render in mock mode only, so the disclaimer
                was true. It now also carries a real card on the live path,
                where "no payment data is transmitted" is flatly false and
                exactly the wrong thing to tell someone about to be charged.
                The live path therefore shows the Midtrans badge instead of a
                claim about where the card data goes. */}
            {MOCK_PAYMENT ? (
              <p className="mt-4 text-center text-xs text-gray-400">
                Preview only — no payment data is transmitted or stored.
              </p>
            ) : (
              <div className="mt-5 flex justify-center">
                <MidtransBadge />
              </div>
            )}
          </div>
        )}

        {/* ---- PIN ---- */}
        {step === 'pin' && isEwallet && (
          <div className="w-full">
            <button type="button" onClick={() => setStep('details')} className={backBtn}>
              ← Back
            </button>
            <h1 className="text-2xl font-semibold mb-1 text-center">
              Enter your {channelLabel.replace(' (E-Wallet)', '')} PIN
            </h1>
            <p className="text-sm text-gray-500 mb-8 text-center">
              Confirm the payment of{' '}
              <span className="font-semibold text-[#1a1a1a]">{priceLabel}</span> for {productName}.
            </p>
            <DigitBoxes length={6} value={pin} onChange={setPin} mask />
            <button
              type="button"
              disabled={pin.replace(/\D/g, '').length !== 6}
              onClick={() => setStep('otp')}
              className={`${primaryBtn} mt-8`}
            >
              Confirm PIN
            </button>
            <p className="mt-4 text-center text-xs text-gray-400">
              Preview only — no data is transmitted or stored.
            </p>
          </div>
        )}

        {/* ---- OTP ---- */}
        {step === 'otp' && isEwallet && (
          <div className="w-full">
            <button type="button" onClick={() => setStep('pin')} className={backBtn}>
              ← Back
            </button>
            <h1 className="text-2xl font-semibold mb-1 text-center">Enter the OTP code</h1>
            <p className="text-sm text-gray-500 mb-8 text-center">
              We sent a 6-digit code to +62 {phone || 'xxxxxxxxx'} to verify this payment.
            </p>
            <DigitBoxes length={6} value={otp} onChange={setOtp} />
            <button
              type="button"
              disabled={otp.replace(/\D/g, '').length !== 6}
              onClick={pay}
              className={`${primaryBtn} mt-8`}
            >
              Verify &amp; Pay {priceLabel}
            </button>
            <p className="mt-4 text-center text-xs text-gray-400">
              Preview only — no data is transmitted or stored.
            </p>
          </div>
        )}

        {/* ---- PROCESSING ---- */}
        {step === 'processing' && (
          <div className="py-16 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-[#4a90e2] animate-spin" />
            <p className="mt-6 text-[15px] text-gray-600">
              {isEwallet ? `Confirming your ${channelLabel.replace(' (E-Wallet)', '')} payment…` : 'Processing your payment…'}
            </p>
          </div>
        )}

        {/* ---- 3-D SECURE ---- */}
        {threeDsUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="border-b border-gray-200 px-5 py-3">
                <p className="text-[13px] font-medium text-gray-900">
                  Verify with your bank
                </p>
                <p className="mt-0.5 text-[12px] text-gray-500">
                  {/* Naming the owner of this screen matters: it looks nothing
                      like our checkout, and an unexplained bank page mid-payment
                      is exactly what a phishing attempt looks like. */}
                  This step is provided by your card issuer.
                </p>
              </div>
              <iframe
                src={threeDsUrl}
                title="3-D Secure verification"
                className="h-[420px] w-full border-0"
              />
            </div>
          </div>
        )}

        {/* ---- AWAITING PAYMENT (Aivory-drawn, no Snap popup) ---- */}
        {step === 'awaiting' && charge && (
          <div className="py-8 flex flex-col items-center text-center">
            <p className="text-[13px] uppercase tracking-[0.14em] text-gray-500">
              {channelLabel}
            </p>

            {/* The exact figure the gateway will collect, straight from the
                charge response — not the page's own USD-to-IDR estimate.
                The site computes a display price from its own rate feed and a
                separately-configured margin, so the two can drift; for a
                virtual-account transfer the customer must key in the precise
                amount, and an estimate is worse than useless there. */}
            {typeof charge.amount_idr === 'number' && (
              <p className="mt-2 text-[26px] font-semibold tracking-tight text-gray-900">
                Rp{charge.amount_idr.toLocaleString('id-ID')}
              </p>
            )}
            <p className="mt-2 text-[15px] text-gray-600">
              {charge.va_number
                ? 'Transfer the exact amount to the account below.'
                : 'Scan the code with your payment app to complete the purchase.'}
            </p>

            {/* QRIS / GoPay QR. Midtrans hands back a hosted image as well as
                the raw string, so there is nothing to encode here. */}
            {charge.qr_url && (
              <img
                src={charge.qr_url}
                alt={`${channelLabel} payment QR code`}
                className="mt-6 w-56 h-56 rounded-xl border border-gray-200 bg-white p-3"
              />
            )}

            {/* Phones cannot scan their own screen, so the app hand-off is the
                route that actually works there. */}
            {charge.deeplink_url && (
              <a
                href={charge.deeplink_url}
                className="mt-6 inline-flex items-center justify-center rounded-lg bg-[#4a90e2] px-6 py-3 text-[14px] font-medium text-white transition-colors hover:bg-[#3f7fc9] sm:hidden"
              >
                Open {channelLabel.replace(' (E-Wallet)', '')}
              </a>
            )}

            {charge.va_number && (
              <div className="mt-6 w-full max-w-sm rounded-xl border border-gray-200 bg-gray-50 p-4 text-left">
                <p className="text-[12px] uppercase tracking-[0.1em] text-gray-500">
                  {(charge.va_bank || 'bank').toUpperCase()} virtual account
                </p>
                <p className="mt-1 font-mono text-[20px] tracking-wide text-gray-900">
                  {charge.va_number}
                </p>
              </div>
            )}

            <p className="mt-6 text-[13px] text-gray-500">
              This page updates as soon as your payment is confirmed. It is safe
              to close it &mdash; your purchase is recorded either way.
            </p>

            {/* The automatic fallback only catches a charge that FAILS. If one
                succeeds but what we drew is unusable — a QR that will not
                load — nothing else would rescue the customer, so give them a
                way out by hand. */}
            <button
              type="button"
              onClick={() => {
                setCharge(null);
                window.location.search = 'pay=snap';
              }}
              className="mt-3 text-[13px] text-gray-500 underline underline-offset-2 hover:text-gray-700"
            >
              Having trouble? Pay another way
            </button>
          </div>
        )}

        {/* ---- SUCCESS ---- */}
        {step === 'success' && (
          <div className="py-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center">
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="mt-6 text-2xl font-semibold">Payment successful</h1>
            <p className="mt-2 text-sm text-gray-500 max-w-xs">
              {productName} · {priceLabel} via {channelLabel}
            </p>
            {currentUser?.email && (
              <p className="mt-1 text-xs text-gray-400">Signed in as {currentUser.email}</p>
            )}
            <button
              type="button"
              onClick={() => {
                onComplete();
                router.push('/dashboard');
              }}
              className={`${primaryBtn} mt-8 max-w-xs`}
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
