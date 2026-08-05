'use strict';

/**
 * no-use-client-default-page
 *
 * `'use client'` at the top of an App Router `page.tsx` makes the page a
 * Client Component — which means it cannot export `metadata` or
 * `generateMetadata` at all. Without those exports, the page inherits the
 * root layout's canonical (homepage) and Google canonicalizes it back to
 * the homepage — the exact failure mode of /careers, /contact, and
 * /free-diagnostic in August 2026.
 *
 * The recommended pattern: rename the existing client file to
 * `<Name>Client.tsx`, keep `'use client'` on it, and create a thin
 * server-component `page.tsx` that exports the metadata and renders the
 * client component as its children.
 */

const DEFAULT_EXPORT_RE = /export\s+default\s+/;

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Forbid `"use client"` pages that also export a `default` component. Such pages cannot export `metadata`, so they fall back to the homepage canonical. Split into a client file + a server-component page.',
      category: 'SEO',
      recommended: true,
    },
    schema: [],
    messages: {
      useClientWithDefault:
        '`"use client"` page exports a default component. This page cannot export `metadata`, so its canonical will fall back to the homepage (duplicate content). Refactor: move the default export to `<Name>Client.tsx` (keeping `"use client"`) and create a server-component `page.tsx` that wraps it and exports `metadata`.',
    },
  },

  create(context) {
    const filename = context.getFilename();
    if (!filename || /node_modules/.test(filename)) return {};

    // Only lint files literally named `page.tsx|ts|jsx|js` (App Router entry).
    if (/[\\/]page\.(t|j)sx?$/.test(filename) === false) return {};

    // Root homepage is exempt — `"use client"` on the homepage is unusual but
    // the homepage canonical IS the homepage, so there is no inheritance bug.
    if (/[\\/]app[\\/]+page\.(t|j)sx?$/.test(filename)) return {};

    const sourceCode = context.getSourceCode();
    const text = sourceCode.getText();
    const hasUseClient =
      /^[ \t]*('|")use client('|");?\s*$/m.test(text.slice(0, 200)) ||
      /^[ \t]*('|")use client('|");?\s*\r?\n/.test(text.slice(0, 200));

    if (!hasUseClient) return {};

    return {
      ExportDefaultDeclaration(node) {
        context.report({
          node,
          messageId: 'useClientWithDefault',
        });
      },
    };
  },
};