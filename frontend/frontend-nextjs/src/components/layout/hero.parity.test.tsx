/**
 * Hero Legacy-Parity DOM Tests
 *
 * Static React Testing Library / jsdom assertions (no browser) that pin the Hero
 * region to the legacy baseline:
 *   - H1 / H2 copy
 *   - primary CTA label + href
 *   - accent period hue (#00e59e)
 *   - Manrope applied to H1/H2 (the `font-manrope` token class)
 *   - decorative <video> attributes (autoPlay / muted / loop / playsInline)
 *   - near-black hero background (#030408)
 *
 * _Requirements: 3.1, 3.2, 4.2, 5.1, 12.1_
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { Hero } from './hero';

describe('Hero — legacy parity', () => {
  // Requirement 3.2 — hero copy
  it('renders the H1 copy "Make AI make sense." with the accent period', () => {
    render(<Hero />);

    const h1 = screen.getByRole('heading', { level: 1 });
    // The period lives in its own accent <span>, so the H1 text content
    // recombines to the full legacy string.
    expect(h1).toHaveTextContent('Make AI make sense.');
  });

  it('renders the H2 copy "Start with clarity." / "End with a system that runs."', () => {
    render(<Hero />);

    const h2 = screen.getByRole('heading', { level: 2 });
    expect(h2).toHaveTextContent('Start with clarity.');
    expect(h2).toHaveTextContent('End with a system that runs.');
  });

  // Requirement 3.1 — primary CTA label + href
  it('renders the primary CTA labeled "START WITH FREE DIAGNOSTIC →" linking to /diagnostic?type=free', () => {
    render(<Hero />);

    const cta = screen.getByRole('link', { name: /START WITH FREE DIAGNOSTIC/i });
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveTextContent('START WITH FREE DIAGNOSTIC');
    expect(cta).toHaveTextContent('→');
    expect(cta).toHaveAttribute('href', '/diagnostic?type=free');
  });

  // Requirement 12.1 — accent hue aligned to legacy #00e59e
  it('renders the H1 accent period in the legacy hue #00e59e', () => {
    render(<Hero />);

    const h1 = screen.getByRole('heading', { level: 1 });
    const accent = h1.querySelector('span');

    expect(accent).not.toBeNull();
    expect(accent).toHaveTextContent('.');
    // jsdom normalizes the inline hex to its rgb() form. `toHaveStyle` compares
    // computed colors, so the legacy hex `#00e59e` (= rgb(0, 229, 158)) matches
    // regardless of the source notation.
    expect(accent).toHaveStyle({ color: '#00e59e' });
    expect(accent).toHaveStyle({ color: 'rgb(0, 229, 158)' });
  });

  // Requirement 4.2 — Manrope applied to H1 and H2 via the `font-manrope` token class
  it('applies the font-manrope token class to H1 and H2', () => {
    render(<Hero />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveClass('font-manrope');
    expect(screen.getByRole('heading', { level: 2 })).toHaveClass('font-manrope');
  });

  // Requirement 5.1 — near-black hero background
  it('renders the hero section with the legacy near-black background #030408', () => {
    render(<Hero />);

    const heroSection = screen.getByRole('region', {
      name: /hero section/i,
    });
    expect(heroSection).toHaveStyle({ background: '#030408' });
  });

  // Requirement 5.1 / 8.1 — decorative, autoplaying, muted, looping inline video
  it('renders a decorative <video> that is autoPlay / muted / loop / playsInline', () => {
    render(<Hero />);

    const video = screen
      .getByRole('region', { name: /hero section/i })
      .querySelector('video') as HTMLVideoElement | null;

    expect(video).not.toBeNull();
    // Boolean media attributes React reflects to the DOM.
    expect(video).toHaveAttribute('autoplay');
    expect(video).toHaveAttribute('loop');
    expect(video).toHaveAttribute('playsinline');
    // `muted` is applied by React as a DOM property rather than an attribute.
    expect(video?.muted).toBe(true);
  });
});
