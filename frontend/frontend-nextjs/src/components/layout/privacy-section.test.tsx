/**
 * PrivacySection Component Tests (DOM parity)
 *
 * Verifies legacy parity for the combined Privacy region (`#privacy-section`)
 * and the Strategy CTA region (`#strategy-cta`) rendered by privacy-section.tsx:
 * heading, 3 pillars, 5 trust badges, both Strategy CTA labels, the two
 * `#050505` dark backgrounds, and the responsive single-column / wrap classes.
 *
 * CI-safe: DOM (jsdom + Testing Library, no browser).
 * Requirements: 3.7, 5.6, 5.7, 6.4
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { PrivacySection } from './privacy-section';

// Pillar/heading copy is split across `<br />` line breaks, which produces no
// whitespace between the fragments in `textContent`. Normalize by stripping all
// whitespace so partial line-break copy matches the rendered text exactly.
const stripWhitespace = (value: string) => value.replace(/\s+/g, '');

const matchesNormalized = (expected: string, tagName: string) => (
  _content: string,
  element: Element | null
) =>
  element != null &&
  element.tagName.toLowerCase() === tagName &&
  stripWhitespace(element.textContent ?? '') === stripWhitespace(expected);

describe('PrivacySection (legacy parity)', () => {
  it('renders the privacy heading (Requirement 5.6)', () => {
    render(<PrivacySection />);

    expect(
      screen.getByText(matchesNormalized('Your data stays where it belongs.', 'h2'))
    ).toBeInTheDocument();
  });

  it('renders the three privacy pillars (Requirement 3.7)', () => {
    render(<PrivacySection />);

    expect(
      screen.getByText(matchesNormalized("We don't train on your data.", 'p'))
    ).toBeInTheDocument();
    expect(
      screen.getByText(matchesNormalized('Processed locally. Stored locally.', 'p'))
    ).toBeInTheDocument();
    expect(
      screen.getByText(matchesNormalized('GDPR compliant by design.', 'p'))
    ).toBeInTheDocument();
  });

  it('renders the five trust badges in legacy order (Requirement 3.7)', () => {
    const { container } = render(<PrivacySection />);

    const expectedBadges = [
      'GDPR ready',
      'No Data Training',
      'Local Processing Only',
      'Zero Server Logging',
      'End to End Private',
    ];

    for (const badge of expectedBadges) {
      expect(screen.getByText(badge)).toBeInTheDocument();
    }

    // Order check: each badge lives in the privacy badges (flex-wrap) container.
    const badgeContainer = container.querySelector('#privacy-section .flex-wrap');
    expect(badgeContainer).not.toBeNull();
    const renderedBadges = Array.from(badgeContainer!.children).map((child) =>
      (child.textContent ?? '').trim()
    );
    expect(renderedBadges).toEqual(expectedBadges);
  });

  it('renders the Strategy CTA heading and both CTA labels (Requirement 5.7)', () => {
    render(<PrivacySection />);

    expect(
      screen.getByText(matchesNormalized('Some decisions need a conversation.', 'h2'))
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Book a Session/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Book a Corporate Training/i })
    ).toBeInTheDocument();
  });

  it('renders both regions with the legacy dark #050505 background (Requirements 5.6, 5.7)', () => {
    const { container } = render(<PrivacySection />);

    const privacyRegion = container.querySelector('#privacy-section');
    const strategyRegion = container.querySelector('#strategy-cta');

    expect(privacyRegion).not.toBeNull();
    expect(strategyRegion).not.toBeNull();
    expect(privacyRegion).toHaveClass('bg-[#050505]');
    expect(strategyRegion).toHaveClass('bg-[#050505]');
  });

  it('collapses the pillar grid to a single column at ≤768px (Requirement 6.4)', () => {
    const { container } = render(<PrivacySection />);

    const pillarGrid = container.querySelector('#privacy-section div.grid');
    expect(pillarGrid).not.toBeNull();
    expect(pillarGrid).toHaveClass('grid-cols-1');
    expect(pillarGrid).toHaveClass('md:grid-cols-3');
  });

  it('allows trust badges to wrap at ≤768px (Requirement 6.4)', () => {
    const { container } = render(<PrivacySection />);

    const badgeContainer = container.querySelector('#privacy-section .flex-wrap');
    expect(badgeContainer).not.toBeNull();
    expect(badgeContainer).toHaveClass('flex-wrap');
  });
});
