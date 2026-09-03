'use client';

/**
 * Cloudflare Turnstile widget.
 *
 * Rendered explicitly (`render=explicit`) rather than via the `cf-turnstile`
 * auto-scan class, because React owns this DOM node and the auto-scanner
 * would re-render into a node it does not control across re-renders.
 *
 * Tokens are single-use and expire after ~5 minutes. Whenever the caller
 * needs a fresh one — a rejected verification, a retried submit — it bumps
 * `resetSignal` and this component resets the widget in place.
 */

import { useEffect, useRef } from 'react';

interface TurnstileApi {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_ID = 'cf-turnstile-api';
const SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

/** Load the Turnstile script once per page, shared by every widget on it. */
function loadTurnstileScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.turnstile) return Promise.resolve();

  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('turnstile script failed')));
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('turnstile script failed'));
    document.head.appendChild(script);
  });
}

interface TurnstileWidgetProps {
  siteKey: string;
  /** Must match the action the server-side verifier expects. */
  action: string;
  onToken: (token: string) => void;
  /** Called when the token expires or the challenge errors, so the caller can clear its copy. */
  onExpire?: () => void;
  /** Bump to force a fresh challenge (tokens are single-use). */
  resetSignal?: number;
  theme?: 'light' | 'dark' | 'auto';
}

export default function TurnstileWidget({
  siteKey,
  action,
  onToken,
  onExpire,
  resetSignal = 0,
  theme = 'light',
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  // Keep the newest callbacks reachable without re-rendering the widget: the
  // render options are read once by Turnstile, so passing the props directly
  // would freeze whichever closure existed at mount.
  const onTokenRef = useRef(onToken);
  const onExpireRef = useRef(onExpire);
  onTokenRef.current = onToken;
  onExpireRef.current = onExpire;

  useEffect(() => {
    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        if (widgetIdRef.current !== null) return;

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          theme,
          callback: (token: string) => onTokenRef.current(token),
          'expired-callback': () => onExpireRef.current?.(),
          'error-callback': () => onExpireRef.current?.(),
        });
      })
      .catch(() => {
        // Script blocked or offline. The caller keeps its "not verified" state,
        // so the protected action stays closed rather than silently opening.
        onExpireRef.current?.();
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current !== null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, action, theme]);

  useEffect(() => {
    if (resetSignal === 0) return;
    if (widgetIdRef.current !== null && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    }
  }, [resetSignal]);

  return <div ref={containerRef} />;
}
