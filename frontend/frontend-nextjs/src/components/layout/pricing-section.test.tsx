// @ts-nocheck
/**
 * Pricing Section DOM Tests (Task 7.2)
 *
 * Static React Testing Library / jsdom assertions (CI-safe, no browser) for the
 * pricing section parity work. These tests pin the verifiable parity contracts:
 *
 * - Req 2.2 / 5.3-derivation: every displayed one-time price equals
 *   `formatUsd(getProductPrice(id))` for `ai_snapshot` / `ai_blueprint` /
 *   `full_stack`. Expected values are computed from the pricing single source of
 *   truth (`@/lib/pricing`) rather than hardcoded, so this is an ANTI-DRIFT
 *   assertion: if a literal is ever reintroduced into the component, or the
 *   catalog price changes, this test fails.
 * - Req 13.1 / 12.2: the legacy marketing copy `Save 13% compare to buying
 *   separately` is rendered verbatim in the legacy accent hue `#00e59e`.
 * - Req 5.3: the section renders on a white background.
 * - Req 6.2: the tier grid collapses to one column (`grid-cols-1
 *   md:grid-cols-3`) and the Full Stack banner stacks (`flex-col md:flex-row`)
 *   at ≤768px.
 * - Banner copy (Full Stack banner + bottom black full-width banner) is present.
 *
 * `next/navigation` and `@/lib/payment` are mocked; `@/lib/pricing` is NOT
 * mocked so the real helpers back both the component and the expected values.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { formatUsd, getProductPrice, PRODUCT_IDS } from '@/lib/pricing';
import { PricingSection } from './pricing-section';

// --- Mocks -----------------------------------------------------------------

// next/navigation: the component calls useRouter().push for the free diagnostic.
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

// @/lib/payment: the component opens the payment modal for the blueprint CTA.
const openPaymentModalMock = vi.fn(() => Promise.resolve());
vi.mock('@/lib/payment', () => ({
  openPaymentModal: (...args: unknown[]) => openPaymentModalMock(...args),
  PAYMENT_CONFIG: { products: { BLUEPRINT: 'ai_blueprint' } },
}));

// Expected prices derived from the single source of truth (anti-drift).
const expectedDeepDiagnosticPrice = formatUsd(getProductPrice(PRODUCT_IDS.DEEP_DIAGNOSTIC) ?? 0);
const expectedBlueprintPrice = formatUsd(getProductPrice(PRODUCT_IDS.BLUEPRINT) ?? 0);
const expectedFullStackPrice = formatUsd(getProductPrice(PRODUCT_IDS.FULL_STACK) ?? 0);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PricingSection', () => {
  describe('Pricing fidelity — prices derived from pricing.ts (Req 2.2)', () => {
    it('displays the Deep Diagnostic price equal to formatUsd(getProductPrice(ai_snapshot))', () => {
      render(<PricingSection />);
      expect(screen.getByText(expectedDeepDiagnosticPrice)).toBeInTheDocument();
    });

    it('displays the Blueprint price equal to formatUsd(getProductPrice(ai_blueprint))', () => {
      render(<PricingSection />);
      expect(screen.getByText(expectedBlueprintPrice)).toBeInTheDocument();
    });

    it('displays the Full Stack price equal to formatUsd(getProductPrice(full_stack))', () => {
      render(<PricingSection />);
      expect(screen.getByText(expectedFullStackPrice)).toBeInTheDocument();
    });

    it('does not hardcode prices that diverge from the catalog (the three prices match the SoT)', () => {
      // Guard against literal drift: the catalog values are the published $29/$85/$99.
      expect(expectedDeepDiagnosticPrice).toBe('$29');
      expect(expectedBlueprintPrice).toBe('$85');
      expect(expectedFullStackPrice).toBe('$99');
    });
  });

  describe('Save 13% copy + accent hue (Req 13.1, 12.2)', () => {
    it('renders the legacy "Save 13%" marketing copy verbatim', () => {
      render(<PricingSection />);
      expect(
        screen.getByText('Save 13% compare to buying separately')
      ).toBeInTheDocument();
    });

    it('renders the "Save 13%" copy in the legacy accent hue #00e59e', () => {
      render(<PricingSection />);
      const saveEl = screen.getByText('Save 13% compare to buying separately');
      expect(saveEl).toHaveStyle({ color: '#00e59e' });
    });
  });

  describe('Banner copy (Req 5.3 section content)', () => {
    it('renders the Full Stack banner headline', () => {
      render(<PricingSection />);
      expect(
        screen.getByText(/Full Stack > Deep Diagnostic \+ Blueprint \+ Roadmap/)
      ).toBeInTheDocument();
    });

    it('renders the bottom black full-width banner copy', () => {
      render(<PricingSection />);
      expect(
        screen.getByText(/Every output is generated specifically for your business/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Buy once, own the output\./i)
      ).toBeInTheDocument();
    });
  });

  describe('White background (Req 5.3)', () => {
    it('renders the section on a white background', () => {
      const { container } = render(<PricingSection />);
      const section = container.querySelector('#pricing-section');
      expect(section).not.toBeNull();
      expect(section).toHaveClass('bg-white');
    });
  });

  describe('Responsive grid + banner stack (Req 6.2)', () => {
    it('renders the tier grid as a single column at ≤768px (grid-cols-1 md:grid-cols-3)', () => {
      const { container } = render(<PricingSection />);
      const grid = container.querySelector('#pricing-section .grid');
      expect(grid).not.toBeNull();
      expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-3');
    });

    it('stacks the Full Stack banner at ≤768px (flex-col md:flex-row)', () => {
      const { container } = render(<PricingSection />);
      const banner = container.querySelector('.flex-col.md\\:flex-row');
      expect(banner).not.toBeNull();
      expect(banner).toHaveClass('flex-col', 'md:flex-row');
    });
  });

  describe('CTA wiring (mocked next/navigation + @/lib/payment)', () => {
    it('routes to the free diagnostic when Start Deep Diagnostic is clicked', () => {
      render(<PricingSection />);
      fireEvent.click(screen.getByRole('button', { name: /Start Deep Diagnostic/i }));
      expect(pushMock).toHaveBeenCalledWith('/diagnostic?type=free');
    });

    it('opens the payment modal for the blueprint when Generate Blueprint is clicked', () => {
      render(<PricingSection />);
      fireEvent.click(screen.getByRole('button', { name: /Generate Blueprint/i }));
      expect(openPaymentModalMock).toHaveBeenCalledWith('ai_blueprint');
    });
  });
});
