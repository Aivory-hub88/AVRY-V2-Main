'use strict';

/**
 * require-page-metadata
 *
 * Every App Router page file, except the homepage and route group pages
 * (those inside paths like `(auth)/` that share a layout), should export
 * either `metadata` (static) or `generateMetadata` (dynamic). Without
 * either, the page falls back to the root layout metadata and renders
 * the homepage canonical + homepage title — a soft duplicate of the
 * homepage.
 *
 * This rule is intentionally permissive: it warns (not errors) so the
 * developer can choose either export shape. If both are present, sanity
 * is preserved.
 */

const EXEMPT_DIRS = /^\([a-zA-Z0-9_-]+\)[\\/]/; // route groups like (auth)/, (marketing)/

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'App Router pages must export `metadata` or `generateMetadata`. Pages that do neither inherit the root layout metadata (homepage canonical + title), which Google treats as a duplicate of the homepage.',
      category: 'SEO',
      recommended: true,
    },
    schema: [],
    messages: {
      missingMetadata:
        'Page exports neither `metadata` nor `generateMetadata`. The page will inherit the homepage canonical + title from the root layout. Add `metadata` (static) or `generateMetadata` (dynamic) with the page-specific canonical URL.',
    },
  },

  create(context) {
    const filename = context.getFilename();
    if (!filename || /node_modules/.test(filename)) return {};

    const isAppRouterPage = /[\\/]app[\\/].+[\\/]page\.(t|j)sx?$/.test(filename);
    if (!isAppRouterPage) return {};

    // Root homepage is exempt — its canonical IS the homepage.
    if (/[\\/]app[\\/]+page\.(t|j)sx?$/.test(filename)) return {};

    // Route-group-only page files that share a layout also exempt if the
    // layout defines metadata — too tricky to verify reliably, skip.
    if (EXEMPT_DIRS.test(filename.replace(/.*[\\/]app[\\/]/, ''))) return {};

    let foundMetadata = false;
    let foundGenerateMetadata = false;

    return {
      'Program:exit'(node) {
        if (!foundMetadata && !foundGenerateMetadata) {
          context.report({
            node,
            messageId: 'missingMetadata',
          });
        }
      },
      ExportNamedDeclaration(node) {
        const text = context.getSourceCode().getText(node).slice(0, 80);
        if (/export\s+(const|let)\s+metadata\b/.test(text)) foundMetadata = true;
        if (/export\s+(async\s+)?function\s+generateMetadata\b/.test(text)) foundGenerateMetadata = true;
      },
    };
  },
};