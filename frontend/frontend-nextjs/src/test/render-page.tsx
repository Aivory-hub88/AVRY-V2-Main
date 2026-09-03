/**
 * Shared render helper for page-level tests.
 *
 * The homepage property tests rendered `<Home />` bare, so every one of them
 * died on "useLanguage must be used within a LanguageProvider" the moment
 * Navbar called the hook — 30 failures across three files, all from a missing
 * wrapper rather than anything wrong with the page.
 *
 * `initialLanguage="en"` mirrors app/layout.tsx exactly, so these tests see the
 * same tree a visitor does. LanguageProvider defaults to 'id' when the prop is
 * omitted, which would silently test the other locale.
 */
import React from 'react';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { LanguageProvider } from '@/components/context/LanguageContext';

export function PageProviders({ children }: { children: React.ReactNode }) {
  return <LanguageProvider initialLanguage="en">{children}</LanguageProvider>;
}

export function renderPage(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
): RenderResult {
  return render(ui, { wrapper: PageProviders, ...options });
}
