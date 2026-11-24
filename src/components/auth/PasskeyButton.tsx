'use client';

import { useEffect, useState } from 'react';
import {
  loginWithPasskey,
  passkeysSupported,
  PasskeyCancelledError,
  PaymentRequiredError,
} from '@/lib/auth';

interface PasskeyButtonProps {
  /** Called after the session is stored. */
  onSignedIn: () => void;
  /** Called with a message to show; not called when the user just dismisses the prompt. */
  onError: (message: string) => void;
  /** The account is inside its no-purchase window (same as password login). */
  onPaymentRequired?: (deadlineAt: string) => void;
  disabled?: boolean;
}

/**
 * "Sign in with a passkey" plus its "or" divider. Renders nothing on browsers
 * without WebAuthn, and nothing during SSR, so there is no hydration mismatch.
 */
export function PasskeyButton({ onSignedIn, onError, onPaymentRequired, disabled }: PasskeyButtonProps) {
  const [supported, setSupported] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSupported(passkeysSupported());
  }, []);

  if (!supported) return null;

  const handleClick = async () => {
    setBusy(true);
    try {
      await loginWithPasskey();
      onSignedIn();
    } catch (err) {
      if (err instanceof PasskeyCancelledError) return;
      if (err instanceof PaymentRequiredError && onPaymentRequired) {
        onPaymentRequired(err.deadlineAt);
        return;
      }
      onError(err instanceof Error ? err.message : 'Passkey sign-in failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-5">
      <div className="flex items-center gap-3 mb-5" aria-hidden="true">
        <span className="h-px flex-1 bg-white/10" />
        <span className="text-[11px] uppercase tracking-wider text-white/35">or</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || busy}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-[8px] border border-white/15 bg-white/[0.03] text-sm font-medium text-white/90 hover:bg-white/[0.07] hover:border-white/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="9" cy="8" r="4" />
          <path d="M2 21v-1a6 6 0 0 1 6-6h2" />
          <circle cx="18" cy="15" r="2.5" />
          <path d="M18 17.5V22l2-1.5-2-1.5" />
        </svg>
        {busy ? 'Waiting for your passkey...' : 'Sign in with a passkey'}
      </button>
    </div>
  );
}
