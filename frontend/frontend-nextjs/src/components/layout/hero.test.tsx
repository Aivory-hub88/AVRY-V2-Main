/**
 * Hero Component Tests
 *
 * Tests for the Hero component ensuring proper rendering and accessibility.
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { Hero } from './hero';

describe('Hero', () => {
  it('renders the hero section with correct background', () => {
    render(<Hero />);

    const heroSection = screen.getByRole('region', { name: /hero section/i });
    expect(heroSection).toBeInTheDocument();
    expect(heroSection).toHaveStyle('background: #030408');
  });

  it('renders the video background', () => {
    render(<Hero />);

    const video = screen
      .getByRole('region', { name: /hero section/i })
      .querySelector('video');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders the headline with correct text', () => {
    render(<Hero />);

    expect(screen.getByText(/Make AI make sense/i)).toBeInTheDocument();
  });

  it('renders the subheadline with correct text', () => {
    render(<Hero />);

    expect(screen.getByText(/Start with clarity\./i)).toBeInTheDocument();
    expect(screen.getByText(/End with a system that runs\./i)).toBeInTheDocument();
  });

  it('renders the CTA button with correct text', () => {
    render(<Hero />);

    expect(
      screen.getByRole('link', { name: /START WITH FREE DIAGNOSTIC/i })
    ).toBeInTheDocument();
  });

  it('CTA links to the free diagnostic', () => {
    render(<Hero />);

    const cta = screen.getByRole('link', { name: /START WITH FREE DIAGNOSTIC/i });
    expect(cta).toHaveAttribute('href', '/diagnostic?type=free');
  });

  it('applies custom className', () => {
    render(<Hero className="custom-hero" />);

    const heroSection = screen.getByRole('region', { name: /hero section/i });
    expect(heroSection).toHaveClass('custom-hero');
  });

  it('has proper accessibility attributes', () => {
    render(<Hero />);

    const heroSection = screen.getByRole('region', { name: /hero section/i });
    expect(heroSection).toHaveAttribute(
      'aria-label',
      'Hero section with tagline and call to action'
    );
  });
});
