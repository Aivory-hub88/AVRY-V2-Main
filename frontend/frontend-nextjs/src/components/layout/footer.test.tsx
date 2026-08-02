/**
 * Footer Component Tests
 * 
 * Tests for the Footer component ensuring proper rendering, navigation links,
 * and accessibility compliance.
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { Footer } from './footer';

describe('Footer', () => {
  const currentYear = new Date().getFullYear();

  it('renders the footer with correct background', () => {
    render(<Footer />);
    
    const footer = screen.getByRole('contentinfo');
    expect(footer).toBeInTheDocument();
    expect(footer).toHaveClass('bg-bg-secondary');
    expect(footer).toHaveClass('border-border-default');
  });

  it('renders the Aivory brand link', () => {
    render(<Footer />);
    
    expect(screen.getByRole('link', { name: /Aivory/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Aivory/i })).toHaveAttribute('href', '/');
  });

  it('renders the brand description', () => {
    render(<Footer />);
    
    expect(screen.getByText(/AI Readiness Assessment Platform/i)).toBeInTheDocument();
  });

  it('renders the Platform navigation section', () => {
    render(<Footer />);
    
    expect(screen.getByRole('heading', { name: /Platform/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Free Diagnostic/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Blueprint/i })).toBeInTheDocument();
  });

  it('renders the Support navigation section', () => {
    render(<Footer />);
    
    expect(screen.getByRole('heading', { name: /Support/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Contact/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /FAQ/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Privacy Policy/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Terms of Service/i })).toBeInTheDocument();
  });

  it('renders the copyright information', () => {
    render(<Footer />);
    
    expect(screen.getByText(new RegExp(`© ${currentYear} Aivory\\. All rights reserved\\.`, 'i'))).toBeInTheDocument();
  });

  it('renders social media links', () => {
    render(<Footer />);
    
    expect(screen.getByRole('link', { name: /Twitter/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /GitHub/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /LinkedIn/i })).toBeInTheDocument();
  });

  it('renders SVG icons for social media', () => {
    render(<Footer />);
    
    // Check for Twitter SVG
    const twitterSvg = screen.getByRole('link', { name: /Twitter/i }).querySelector('svg');
    expect(twitterSvg).toBeInTheDocument();
    
    // Check for GitHub SVG
    const githubSvg = screen.getByRole('link', { name: /GitHub/i }).querySelector('svg');
    expect(githubSvg).toBeInTheDocument();
    
    // Check for LinkedIn SVG
    const linkedinSvg = screen.getByRole('link', { name: /LinkedIn/i }).querySelector('svg');
    expect(linkedinSvg).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Footer className="custom-footer" />);
    
    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveClass('custom-footer');
  });

  it('has proper accessibility attributes', () => {
    render(<Footer />);
    
    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveAttribute('role', 'contentinfo');
    expect(footer).toHaveAttribute('aria-label', 'Footer navigation and copyright information');
  });

  it('renders responsive grid layout', () => {
    render(<Footer />);
    
    const grid = screen.getByRole('contentinfo').querySelector('div.grid');
    expect(grid).toBeInTheDocument();
    expect(grid).toHaveClass('grid-cols-1');
    expect(grid).toHaveClass('md:grid-cols-4');
  });

  it('renders navigation links with hover effects', () => {
    render(<Footer />);
    
    const platformLink = screen.getByRole('link', { name: /Free Diagnostic/i });
    expect(platformLink).toHaveClass('hover:text-brand-mint');
    expect(platformLink).toHaveClass('transition-colors');
  });

  it('renders social links with target="_blank" for external sites', () => {
    const { container } = render(<Footer />);
    
    // Find the Twitter link by href attribute
    const twitterLink = container.querySelector('a[href="https://twitter.com/aivory"]');
    expect(twitterLink).toBeInTheDocument();
    expect(twitterLink?.getAttribute('target')).toBe('_blank');
    expect(twitterLink?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('includes screen reader text for social icons', () => {
    render(<Footer />);
    
    expect(screen.getByText(/Twitter/i, { selector: '.sr-only' })).toBeInTheDocument();
    expect(screen.getByText(/GitHub/i, { selector: '.sr-only' })).toBeInTheDocument();
    expect(screen.getByText(/LinkedIn/i, { selector: '.sr-only' })).toBeInTheDocument();
  });
});
