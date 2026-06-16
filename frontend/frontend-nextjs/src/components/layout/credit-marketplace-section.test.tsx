/**
 * CreditMarketplaceSection Component Tests
 *
 * DOM parity assertions for the homepage Intelligence Credit Marketplace
 * (Task 9.2). Verifies that the section renders exactly the eight canonical
 * CREDIT_PACKS in published order, that each rendered credits/price pair equals
 * the Pricing_Module value (anti-drift: expected values are derived from
 * `@/lib/pricing`, never restated), that the `Most Popular` badge sits on the
 * 5,000-credit pack, that the section uses the legacy gray-50 background, and
 * that the responsive column classes match the legacy mobile layout
 * (starter `grid-cols-2 md:grid-cols-5`, scale `grid-cols-1 md:grid-cols-3`).
 *
 * Validates: Requirements 2.4, 5.5, 6.5
 *
 * CI-safe: DOM (jsdom + Testing Library, no browser).
 */

import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { CreditMarketplaceSection } from './credit-marketplace-section';
import { CREDIT_PACKS, formatUsd } from '@/lib/pricing';

// Mock the payment module so no real Midtrans/auth flow is exercised in jsdom.
vi.mock('@/lib/payment', () => ({
  openPaymentModal: vi.fn(),
}));

/** The legacy "Most Popular" badge sits on the 5,000-credit pack. */
const POPULAR_PACK_CREDITS = 5000;

/** The credits label as rendered by the component, e.g. `5,000 IC`. */
const creditsLabel = (credits: number) => `${credits.toLocaleString()} IC`;

describe('CreditMarketplaceSection', () => {
  // Requirement 5.5 — gray-50 background equal to legacy #f9fafb.
  it('renders the section root with the legacy gray-50 background (Req 5.5)', () => {
    const { container } = render(<CreditMarketplaceSection />);

    const root = container.querySelector('#credit-marketplace-section');
    expect(root).not.toBeNull();
    expect(root).toHaveClass('bg-gray-50');
  });

  // Requirement 2.4 — exactly the eight CREDIT_PACKS rendered.
  it('renders exactly eight credit packs (Req 2.4)', () => {
    render(<CreditMarketplaceSection />);

    expect(CREDIT_PACKS).toHaveLength(8);
    const packLabels = screen.getAllByText(/^[\d,]+ IC$/);
    expect(packLabels).toHaveLength(CREDIT_PACKS.length);
  });

  // Requirement 2.4 — published order is preserved across both display groups.
  it('renders the packs in published CREDIT_PACKS order (Req 2.4)', () => {
    render(<CreditMarketplaceSection />);

    const renderedLabels = screen
      .getAllByText(/^[\d,]+ IC$/)
      .map((node) => node.textContent);
    const expectedLabels = CREDIT_PACKS.map((pack) => creditsLabel(pack.credits));

    expect(renderedLabels).toEqual(expectedLabels);
  });

  // Requirement 2.4 — each credits/price pair equals the Pricing_Module value.
  it('renders each credits/price pair equal to the CREDIT_PACKS value (Req 2.4)', () => {
    render(<CreditMarketplaceSection />);

    for (const pack of CREDIT_PACKS) {
      // The credits label uniquely identifies a pack (credit amounts are unique).
      const packCard = screen
        .getByText(creditsLabel(pack.credits))
        .closest('div.flex.flex-col');
      expect(packCard).not.toBeNull();

      // The price is rendered through formatUsd within the same pack card.
      expect(
        within(packCard as HTMLElement).getByText(formatUsd(pack.price)),
      ).toBeInTheDocument();
    }
  });

  // Requirement 2.4 — the "Most Popular" badge sits on the 5,000-credit pack.
  it('renders the "Most Popular" badge on the 5,000-credit pack only (Req 2.4)', () => {
    render(<CreditMarketplaceSection />);

    const badges = screen.getAllByText('Most Popular');
    expect(badges).toHaveLength(1);

    const popularCard = badges[0].closest('div.flex.flex-col');
    expect(popularCard).not.toBeNull();
    expect(
      within(popularCard as HTMLElement).getByText(
        creditsLabel(POPULAR_PACK_CREDITS),
      ),
    ).toBeInTheDocument();
  });

  // Requirement 6.5 — starter packs use grid-cols-2 md:grid-cols-5 at ≤768px.
  it('uses the starter grid classes grid-cols-2 md:grid-cols-5 (Req 6.5)', () => {
    render(<CreditMarketplaceSection />);

    // Starter packs include the smallest pack (50 credits, ≤ 1000).
    const starterGrid = screen.getByText(creditsLabel(50)).closest('div.grid');
    expect(starterGrid).not.toBeNull();
    expect(starterGrid).toHaveClass('grid-cols-2', 'md:grid-cols-5');
  });

  // Requirement 6.5 — scale packs use grid-cols-1 md:grid-cols-3 at ≤768px.
  it('uses the scale grid classes grid-cols-1 md:grid-cols-3 (Req 6.5)', () => {
    render(<CreditMarketplaceSection />);

    // Scale packs include the largest pack (10,000 credits, ≥ 2500).
    const scaleGrid = screen.getByText(creditsLabel(10000)).closest('div.grid');
    expect(scaleGrid).not.toBeNull();
    expect(scaleGrid).toHaveClass('grid-cols-1', 'md:grid-cols-3');
  });
});
