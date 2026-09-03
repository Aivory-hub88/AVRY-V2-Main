/**
 * Thin GA4 wrapper.
 *
 * gtag is loaded site-wide in app/layout.tsx, but it is not guaranteed to be
 * present: it is blocked by most ad blockers and absent during SSR. Every call
 * here is a no-op in that case — analytics must never be able to break a page.
 */

type EventParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (command: string, eventName: string, params?: EventParams) => void;
  }
}

export function trackEvent(name: string, params: EventParams = {}): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  try {
    window.gtag('event', name, params);
  } catch {
    // Never let a broken analytics call surface to the user.
  }
}
