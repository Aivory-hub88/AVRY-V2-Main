/**
 * BrandLogo Component Tests
 *
 * Verifies the shared brand mark renders the ported legacy SVG asset with an
 * accessible label and forwards sizing/priority props (Requirement 10.3).
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { BrandLogo, BRAND_LOGO_SRC } from './brand-logo';

describe('BrandLogo', () => {
  it('exposes the ported public asset path', () => {
    expect(BRAND_LOGO_SRC).toBe('/aivory-logo-2026.svg');
  });

  it('renders an accessible image referencing the ported logo asset', () => {
    render(<BrandLogo />);

    const logo = screen.getByRole('img', { name: 'Aivory' });
    expect(logo).toBeInTheDocument();
    // next/image rewrites the src; the asset filename must be referenced.
    expect(logo.getAttribute('src')).toContain('aivory-logo-2026.svg');
  });

  it('uses a default accessible label of "Aivory"', () => {
    render(<BrandLogo />);

    expect(screen.getByAltText('Aivory')).toBeInTheDocument();
  });

  it('supports a custom accessible label', () => {
    render(<BrandLogo alt="Aivory home" />);

    expect(screen.getByRole('img', { name: 'Aivory home' })).toBeInTheDocument();
  });

  it('applies the default sizing className', () => {
    render(<BrandLogo />);

    expect(screen.getByRole('img', { name: 'Aivory' })).toHaveClass('h-10', 'w-auto');
  });

  it('applies a custom className for navbar/footer sizing', () => {
    render(<BrandLogo className="h-[48px] md:h-[72px] w-auto" alt="Aivory footer" />);

    const logo = screen.getByRole('img', { name: 'Aivory footer' });
    expect(logo).toHaveClass('h-[48px]', 'md:h-[72px]', 'w-auto');
  });
});
