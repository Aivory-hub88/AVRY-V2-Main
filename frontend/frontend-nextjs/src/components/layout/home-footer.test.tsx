/**
 * HomeFooter Component Tests
 *
 * DOM parity assertions for the homepage footer (Task 11.2). Verifies the three
 * link columns and their exact link sets/counts, the literal `© 2026` copyright,
 * the brand logo, the `#050505` dark background, and the responsive mobile
 * two-column grid class.
 *
 * Validates: Requirements 3.4, 3.5, 3.6, 5.8, 6.6, 10.2, 11.1
 *
 * CI-safe: DOM (jsdom + Testing Library, no browser). `next/image` renders a
 * plain <img> in jsdom, so no mock is required for the BrandLogo asset.
 */

import { render, screen, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { HomeFooter } from './home-footer';

/** Exact legacy link sets per column (Requirements 3.4 / 3.5 / 3.6). */
const PRODUCT_LINKS = [
  'Deep Diagnostic',
  'AI Blueprint',
  'AI Roadmap',
  'Workflow Builder',
  'AI Agents',
  'Template Library',
];
const COMPANY_LINKS = ['About', 'Blog', 'Careers', 'Contact'];
const LEGAL_LINKS = ['Privacy Policy', 'Terms of Service', 'Cookie Policy'];

/** Resolve the column wrapper that owns a given column-title heading. */
function getColumn(title: string): HTMLElement {
  const heading = screen.getByRole('heading', { name: title, level: 4 });
  const column = heading.closest('div');
  expect(column).not.toBeNull();
  return column as HTMLElement;
}

describe('HomeFooter', () => {
  it('renders the contentinfo (footer) landmark', () => {
    render(<HomeFooter />);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('renders exactly the three legacy column titles', () => {
    render(<HomeFooter />);

    expect(screen.getByRole('heading', { name: 'Product', level: 4 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Company', level: 4 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Legal', level: 4 })).toBeInTheDocument();

    // No extra column headings beyond the three legacy columns.
    expect(screen.getAllByRole('heading', { level: 4 })).toHaveLength(3);
  });

  it('renders the Product column with exactly six links (Req 3.4)', () => {
    render(<HomeFooter />);

    const column = getColumn('Product');
    const links = within(column).getAllByRole('link');
    expect(links).toHaveLength(PRODUCT_LINKS.length);
    expect(links.map((l) => l.textContent)).toEqual(PRODUCT_LINKS);
  });

  it('renders the Company column with exactly four links (Req 3.5)', () => {
    render(<HomeFooter />);

    const column = getColumn('Company');
    const links = within(column).getAllByRole('link');
    expect(links).toHaveLength(COMPANY_LINKS.length);
    expect(links.map((l) => l.textContent)).toEqual(COMPANY_LINKS);
  });

  it('renders the Legal column with exactly three links (Req 3.6)', () => {
    render(<HomeFooter />);

    const column = getColumn('Legal');
    const links = within(column).getAllByRole('link');
    expect(links).toHaveLength(LEGAL_LINKS.length);
    expect(links.map((l) => l.textContent)).toEqual(LEGAL_LINKS);
  });

  it('renders the literal "© 2026" copyright string (Req 11.1)', () => {
    render(<HomeFooter />);

    expect(
      screen.getByText('© 2026 Aivory. All rights reserved.'),
    ).toBeInTheDocument();
  });

  it('renders the brand logo (Req 10.2)', () => {
    render(<HomeFooter />);

    const logo = screen.getByRole('img', { name: 'Aivory Logo' });
    expect(logo).toBeInTheDocument();
    expect(logo.getAttribute('src')).toContain('aivory-logo-2026.svg');
  });

  it('renders the footer with the legacy #050505 dark background (Req 5.8)', () => {
    render(<HomeFooter />);

    expect(screen.getByRole('contentinfo')).toHaveClass('bg-[#050505]');
  });

  it('uses the mobile two-column grid class grid-cols-2 md:grid-cols-5 (Req 6.6)', () => {
    render(<HomeFooter />);

    const grid = screen.getByRole('contentinfo').querySelector('div.grid');
    expect(grid).not.toBeNull();
    expect(grid).toHaveClass('grid-cols-2', 'md:grid-cols-5');
  });
});
