// @ts-nocheck
/**
 * Homepage Background Rhythm Test (Task 13.3)
 *
 * Property 5: Background rhythm.
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8**
 *
 * The single most important visual signature of the legacy homepage is its
 * dark -> light -> dark band rhythm. This CI-safe DOM test renders the real
 * `page.tsx` (`Home`) and asserts each region renders on the exact legacy
 * background hex:
 *
 *   | Region              | Legacy background | Encoding                         |
 *   | ------------------- | ----------------- | -------------------------------- |
 *   | Hero                | #030408           | inline style on `<section.hero>` |
 *   | Features            | #ffffff           | `bg-white`  on `#features`       |
 *   | Pricing             | #ffffff           | `bg-white`  on `#pricing-section`|
 *   | Subscription        | #ffffff           | `bg-white`  on `#subscription-section` |
 *   | Credit Marketplace  | #f9fafb           | `bg-gray-50` on `#credit-marketplace-section` |
 *   | Privacy             | #050505           | `bg-[#050505]` on `#privacy-section` |
 *   | Strategy CTA        | #050505           | `bg-[#050505]` on `#strategy-cta`|
 *   | Footer              | #050505           | `bg-[#050505]` on `<footer>`     |
 *
 * The hero encodes its background via an inline `style` so it is asserted with
 * `toHaveStyle({ background: '#030408' })`. The Tailwind-classed regions encode
 * their background via a utility class, so each is asserted by class presence
 * and the class is mapped back to its legacy hex (white = #ffffff,
 * gray-50 = #f9fafb, `[#050505]` = #050505) so the assertion is anchored to the
 * legacy color, not just any class.
 *
 * Mocking: `next/navigation`, `@/lib/payment`, `@/lib/auth`, the
 * `MidtransLoader`, and `next/image` (used by `BrandLogo`) are mocked so the
 * server + client section tree renders in isolation. `@/lib/pricing` is NOT
 * mocked — the real pricing source of truth backs the price-deriving sections.
 *
 * CI-safe: DOM (jsdom + Testing Library, no browser).
 */

import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

// ---------------------------------------------------------------------------
// Mocks (hoisted so the factories can reference the spies safely)
// ---------------------------------------------------------------------------

const { pushMock, openPaymentModalMock, logoutMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  openPaymentModalMock: vi.fn(() => Promise.resolve()),
  logoutMock: vi.fn(),
}));

// next/navigation — client sections (navbar, pricing) read `useRouter()`.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

// @/lib/payment — pricing/subscription/credit sections open the payment modal.
vi.mock('@/lib/payment', () => ({
  openPaymentModal: (...args: unknown[]) => openPaymentModalMock(...args),
  PAYMENT_CONFIG: { products: { BLUEPRINT: 'ai_blueprint' } },
}));

// @/lib/auth — the navbar's auth state is driven by `isAuthenticated`.
vi.mock('@/lib/auth', () => ({
  isAuthenticated: () => false,
  logout: logoutMock,
}));

// MidtransLoader — render null; it is unrelated to the background rhythm.
vi.mock('@/components/payment/midtrans-loader', () => ({
  MidtransLoader: () => null,
}));

// next/image — BrandLogo (navbar + footer) renders the SVG via next/image.
// Render a plain <img> and drop non-DOM props to avoid React warnings.
vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    className,
  }: {
    src: string;
    alt: string;
    className?: string;
  }) => React.createElement('img', { src, alt, className }),
}));

import Home from './page';

// ---------------------------------------------------------------------------
// Legacy background rhythm specification
// ---------------------------------------------------------------------------

/** Map a Tailwind background utility class to the legacy hex it encodes. */
const TAILWIND_BG_HEX: Record<string, string> = {
  'bg-white': '#ffffff',
  'bg-gray-50': '#f9fafb',
  'bg-[#050505]': '#050505',
};

/**
 * The class-backed regions, keyed by their stable DOM id, with the Tailwind
 * background class they carry and the legacy hex it must encode.
 */
const CLASS_BACKED_REGIONS: ReadonlyArray<{
  name: string;
  selector: string;
  className: string;
  hex: string;
  requirement: string;
}> = [
  { name: 'Features', selector: '#features', className: 'bg-white', hex: '#ffffff', requirement: '5.2' },
  { name: 'Pricing', selector: '#pricing-section', className: 'bg-white', hex: '#ffffff', requirement: '5.3' },
  { name: 'Subscription', selector: '#subscription-section', className: 'bg-white', hex: '#ffffff', requirement: '5.4' },
  { name: 'Credit Marketplace', selector: '#credit-marketplace-section', className: 'bg-gray-50', hex: '#f9fafb', requirement: '5.5' },
  { name: 'Privacy', selector: '#privacy-section', className: 'bg-[#050505]', hex: '#050505', requirement: '5.6' },
  { name: 'Strategy CTA', selector: '#strategy-cta', className: 'bg-[#050505]', hex: '#050505', requirement: '5.7' },
];

describe('Homepage background rhythm (Property 5)', () => {
  describe('Hero near-black background (Req 5.1)', () => {
    it('renders the hero section with the legacy #030408 background via inline style', () => {
      const { container } = render(<Home />);
      const hero = container.querySelector('section.hero');
      expect(hero).not.toBeNull();
      expect(hero).toHaveStyle({ background: '#030408' });
    });
  });

  describe('Tailwind-classed region backgrounds (Req 5.2-5.7)', () => {
    it.each(CLASS_BACKED_REGIONS)(
      '$name renders on $hex (class $className) [Req $requirement]',
      ({ selector, className, hex }) => {
        const { container } = render(<Home />);
        const region = container.querySelector(selector);
        expect(region).not.toBeNull();
        // The region carries the expected Tailwind background utility...
        expect(region).toHaveClass(className);
        // ...and that utility maps to the exact legacy hex.
        expect(TAILWIND_BG_HEX[className]).toBe(hex);
      },
    );
  });

  describe('Footer dark background (Req 5.8)', () => {
    it('renders the footer with the legacy #050505 background via bg-[#050505]', () => {
      const { container } = render(<Home />);
      const footer = container.querySelector('footer');
      expect(footer).not.toBeNull();
      expect(footer).toHaveClass('bg-[#050505]');
      expect(TAILWIND_BG_HEX['bg-[#050505]']).toBe('#050505');
    });
  });

  describe('Full dark -> light -> dark rhythm (Req 5.1-5.8)', () => {
    it('preserves the legacy band sequence across all eight regions', () => {
      const { container } = render(<Home />);

      // Hero (dark, inline style).
      const hero = container.querySelector('section.hero');
      expect(hero).toHaveStyle({ background: '#030408' });

      // The remaining seven regions, in legacy order, with their expected hex.
      const expectedRhythm: ReadonlyArray<{ selector: string; hex: string }> = [
        { selector: '#features', hex: '#ffffff' },
        { selector: '#pricing-section', hex: '#ffffff' },
        { selector: '#subscription-section', hex: '#ffffff' },
        { selector: '#credit-marketplace-section', hex: '#f9fafb' },
        { selector: '#privacy-section', hex: '#050505' },
        { selector: '#strategy-cta', hex: '#050505' },
      ];

      for (const { selector, hex } of expectedRhythm) {
        const region = container.querySelector(selector);
        expect(region, `missing region ${selector}`).not.toBeNull();
        const bgClass = Object.keys(TAILWIND_BG_HEX).find((cls) =>
          region!.classList.contains(cls),
        );
        expect(bgClass, `region ${selector} carries no known bg class`).toBeDefined();
        expect(TAILWIND_BG_HEX[bgClass as string]).toBe(hex);
      }

      // Footer (dark).
      const footer = container.querySelector('footer');
      expect(footer).toHaveClass('bg-[#050505]');
    });
  });
});
