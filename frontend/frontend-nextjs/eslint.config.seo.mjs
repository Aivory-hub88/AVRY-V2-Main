// eslint.config.seo.mjs
//
// Flat-config ESLint entry point for Aivory's SEO linting.
//
// Why a dedicated flat config (instead of extending `.eslintrc.json`)?
// ESLint v9 + eslint-config-next 16 still ships a legacy `.eslintrc.json`
// in this repo that hits a circular-structure bug under ESLint v9's
// legacy rc loading path (react plugin config). Running SEO rules in a
// separate flat config sidesteps that bug entirely: this file loads ONLY
// our custom `eslint-plugin-aivory-seo` rules + the TypeScript parser.
// No Next, no React, no import resolution — the whole point is to catch
// SEO regressions before deploy, not to re-lint the codebase.
//
// Run with:  npm run lint:seo
// CI can run: npx eslint --config eslint.config.seo.mjs "src/app/**/page.{ts,tsx}"

import aivorySeo from 'eslint-plugin-aivory-seo';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    // Only App Router page files are interesting; layout/error/loading are
    // excluded to keep the audit focused on pages that emit canonical URLs.
    files: ['src/app/**/page.{ts,tsx,js,jsx}', 'src/app/**/page.{ts,tsx,js,jsx}'],
  },
  {
    files: ['src/app/**/page.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      'aivory-seo': aivorySeo,
    },
    rules: {
      // 'error': regression guard — would block the build in CI.
      'aivory-seo/require-canonical': 'error',
      // 'error': same regression severity; 'use client' pages with default
      // export are the canonical-drift footgun, not a soft suggestion.
      'aivory-seo/no-use-client-default-page': 'error',
      // 'warn': pages can legitimately use a parent layout's metadata; we
      // surface this so reviewers can confirm, not block on it.
      'aivory-seo/require-page-metadata': 'warn',
    },
  },
  {
    // Opt out of any default ignores that ESLint v9 applies — we WANT
    // node_modules-style symlinks loaded (our plugin lives in
    // node_modules/eslint-plugin-aivory-seo) but NEVER linted.
    ignores: ['**/node_modules/**', '**/.next/**', '**/dist/**'],
  },
];