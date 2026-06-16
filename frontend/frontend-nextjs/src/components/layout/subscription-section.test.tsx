/**
 * Subscription Section DOM Tests (task 8.2)
 *
 * Validates: Requirements 2.3, 5.4, 6.3
 *
 * CI-safe DOM assertions (jsdom + Testing Library, no browser) that pin the
 * subscription section to the legacy parity baseline:
 *
 * - Req 2.3: the three tiers (foundation / pro / enterprise) each display a
 *   price equal to `formatUsd(getProductPrice(id))` — derived from the pricing
 *   single source of truth, never a hardcoded literal — at a `/month` interval.
 * - Req 5.4: the section renders on a white background (`bg-white`, legacy
 *   `#ffffff`).
 * - Req 6.3: the tier grid collapses to a single column at ≤768px via the
 *   `grid-cols-1 md:grid-cols-3` responsive utility classes.
 *
 * Per the spec ground-truth note, the Enterprise subtitle intentionally remains
 * identical to Pro's ("For SMEs and founders running AI operations daily.")
 * because that matches the legacy `frontend/index.html` and the live stag site.
 * This test asserts the ACTUAL current subtitle, not a different "corrected"
 * string.
 *
 * `@/lib/payment` is mocked so the section can render without the auth/Midtrans
 * runtime chain (the payment module reads `pricing.ts` at import time).
 */

import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { SubscriptionSection } from './subscription-section';
import { formatUsd, getProductPrice } from '@/lib/pricing';

// Mock the payment module — the component imports `openPaymentModal` and
// `PAYMENT_CONFIG` from it; we only need the call surface, not the real SDK.
vi.mock('@/lib/payment', () => ({
  openPaymentModal: vi.fn(),
  PAYMENT_CONFIG: {},
}));

/** The three subscription tiers in published order. */
const TIERS = [
  { id: 'foundation', name: 'Foundation' },
  { id: 'pro', name: 'Pro' },
  { id: 'enterprise', name: 'Enterprise' },
] as const;

/** The legacy-parity Enterprise subtitle (identical to Pro's by design). */
const ENTERPRISE_SUBTITLE = 'For SMEs and founders running AI operations daily.';

describe('SubscriptionSection (Requirements 2.3, 5.4, 6.3)', () => {
  it('renders the section heading', () => {
    render(<SubscriptionSection />);
    expect(
      screen.getByRole('heading', { name: /Where intent becomes operation\./i })
    ).toBeInTheDocument();
  });

  it('renders all three tiers by name', () => {
    render(<SubscriptionSection />);
    for (const tier of TIERS) {
      expect(
        screen.getByRole('heading', { name: tier.name, level: 3 })
      ).toBeInTheDocument();
    }
  });

  // -- Req 2.3: prices derived from pricing.ts at a /month interval ----------
  it('displays each tier price equal to formatUsd(getProductPrice(id))', () => {
    render(<SubscriptionSection />);

    for (const tier of TIERS) {
      const expectedPrice = getProductPrice(tier.id);
      // Sanity: the pricing source of truth knows this tier.
      expect(expectedPrice).toBeDefined();
      expect(
        screen.getByText(formatUsd(expectedPrice as number))
      ).toBeInTheDocument();
    }
  });

  it('displays the legacy-parity prices $20 / $44 / $499', () => {
    render(<SubscriptionSection />);
    // Pin the concrete values so a pricing-source change is caught here too.
    expect(formatUsd(getProductPrice('foundation') as number)).toBe('$20');
    expect(formatUsd(getProductPrice('pro') as number)).toBe('$44');
    expect(formatUsd(getProductPrice('enterprise') as number)).toBe('$499');
    expect(screen.getByText('$20')).toBeInTheDocument();
    expect(screen.getByText('$44')).toBeInTheDocument();
    expect(screen.getByText('$499')).toBeInTheDocument();
  });

  it('renders a /month interval label for each tier', () => {
    render(<SubscriptionSection />);
    const monthLabels = screen.getAllByText('/month');
    expect(monthLabels).toHaveLength(TIERS.length);
  });

  // -- Enterprise subtitle: actual current (legacy-parity) copy --------------
  it('renders the Enterprise subtitle as the legacy-parity copy (identical to Pro)', () => {
    render(<SubscriptionSection />);
    // Both Pro and Enterprise intentionally share this subtitle in the legacy
    // ground truth, so it appears exactly twice.
    const subtitles = screen.getAllByText(ENTERPRISE_SUBTITLE);
    expect(subtitles).toHaveLength(2);
  });

  // -- Req 5.4: white background ---------------------------------------------
  it('renders on a white background (bg-white)', () => {
    const { container } = render(<SubscriptionSection />);
    const root = container.querySelector('#subscription-section');
    expect(root).not.toBeNull();
    expect(root).toHaveClass('bg-white');
    // Retains the legacy `subscription-section` class identifier too.
    expect(root).toHaveClass('subscription-section');
  });

  // -- Req 6.3: single-column collapse at ≤768px -----------------------------
  it('collapses the tier grid to a single column via grid-cols-1 md:grid-cols-3', () => {
    const { container } = render(<SubscriptionSection />);
    const root = container.querySelector('#subscription-section');
    expect(root).not.toBeNull();

    const grid = within(root as HTMLElement)
      .getAllByText(TIERS[0].name)[0]
      .closest('.grid');
    expect(grid).not.toBeNull();
    expect(grid).toHaveClass('grid-cols-1');
    expect(grid).toHaveClass('md:grid-cols-3');
  });
});
