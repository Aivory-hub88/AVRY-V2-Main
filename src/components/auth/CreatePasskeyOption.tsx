'use client';

import { useEffect, useState } from 'react';
import { passkeysSupported } from '@/lib/auth';

interface CreatePasskeyOptionProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

/**
 * "Create a passkey on this device" checkbox for the password form. A passkey
 * can only be created while signed in, so this is how a first-time user gets
 * one from the login screen: sign in with the password, and the passkey is
 * created right after. Renders nothing where WebAuthn is unavailable.
 */
export function CreatePasskeyOption({ checked, onChange, disabled }: CreatePasskeyOptionProps) {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(passkeysSupported());
  }, []);

  if (!supported) return null;

  return (
    <label className="flex items-start gap-2.5 text-[13px] text-white/70 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-white/25 bg-white/[0.04] accent-[#8b7cf6]"
      />
      <span>
        Create a passkey on this device
        <span className="block text-[12px] text-white/40">Next time, sign in with Touch ID or your device PIN.</span>
      </span>
    </label>
  );
}
