'use strict';

/**
 * require-canonical
 *
 * In the Next.js App Router, a page's canonical URL is declared inside its
 * `metadata` (or returned from `generateMetadata`). When neither sets
 * `alternates.canonical`, the page inherits the root layout's canonical
 * — which, for Aivory, is `https://aivory.uk` (the homepage). Google then
 * sees the page as a duplicate of the homepage and either canonicalizes
 * the URL to the homepage (drops it from the index) or marks it
 * "Duplicate, Google chose different canonical" — exactly the failure
 * mode that hit /careers, /contact, /free-diagnostic, /company, and
 * /product in August 2026 before this rule existed.
 *
 * Pass: file must export either:
 *   - `export const metadata = { alternates: { canonical: ... } }`
 *   - `export async function generateMetadata(): Promise<Metadata> { return { alternates: { canonical: ... } } }`
 *
 * Note: for `generateMetadata` we only check the static, synchronous
 * `return { ... }` shape. Branchy dynamic returns (e.g. `if (cond) return A;
 * return B`) are missed on purpose — false positives on those are louder
 * than the bug we are guarding against.
 *
 * Default root page `app/page.tsx` is exempt since its canonical IS the
 * homepage canonical.
 */

const ROOT_HOME_PAGE_PATH = /^src[\\/]+app[\\/]+page\.(t|j)sx?$/;

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require every App Router page to declare alternates.canonical so it does not inherit the homepage canonical.',
      category: 'SEO',
      recommended: true,
    },
    schema: [],
    messages: {
      missingCanonical:
        'Page exports `metadata` without `alternates.canonical`. Add `alternates: { canonical: "{{path}}" }` so Google does not treat this URL as a duplicate of the homepage.',
      missingCanonicalGenerate:
        'Page exports `generateMetadata` but the return object does not declare `alternates.canonical` statically. Add `alternates: { canonical: "{{path}}" }` to the return value.',
      missingAlternates:
        'Page exports `metadata` but no `alternates` key is present. Add `alternates: { canonical: "{{path}}" }`.',
      missingAlternatesGenerate:
        'Page exports `generateMetadata` but no `alternates` key is present in the static return object. Add `alternates: { canonical: {{path}} }`.',
    },
  },

  create(context) {
    const filename = context.getFilename();
    if (!filename || /node_modules/.test(filename)) return {};

    // Only lint App Router `page.*` files, not layout/ not-found/error/loading.
    const isAppRouterPage = /[\\/]app[\\/].+[\\/]page\.(t|j)sx?$/.test(filename) && !ROOT_HOME_PAGE_PATH.test(filename.replace(/^[^/]*[\\/]/, ''));
    if (!isAppRouterPage) return {};

    const { isMetadataExport, isGenerateMetadataExport, hasPropertyPath } =
      require('../index.js');

    function inferPathFromFilename() {
      // Pull the `/about`, `/blog/[slug]` style path from the file location.
      const match = filename.match(/[\\/]app[\\/](.*)[\\/]page\.(t|j)sx?$/);
      if (!match) return '/';
      let p = match[1].replace(/\\/g, '/');
      // Next.js dynamic segment folders `[slug]` → `:slug` is fine for the
      // hint message; the developer can refine the literal.
      p = p.replace(/\[([^\]]+)\]/g, ':$1');
      return '/' + p;
    }

    function checkExportNamed(node) {
      if (!isMetadataExport(node)) {
        if (!isGenerateMetadataExport(node)) return;
        checkGenerateMetadata(node);
        return;
      }
      const decl = node.declaration.declarations.find((d) => d.id.name === 'metadata');
      const obj = decl && decl.init;
      if (!obj || obj.type !== 'ObjectExpression') return;

      if (!hasPropertyPath(obj, ['alternates'])) {
        context.report({
          node,
          messageId: 'missingAlternates',
          data: { path: inferPathFromFilename() },
        });
        return;
      }
      if (!hasPropertyPath(obj, ['alternates', 'canonical'])) {
        context.report({
          node,
          messageId: 'missingCanonical',
          data: { path: inferPathFromFilename() },
        });
      }
    }

    function checkGenerateMetadata(node) {
      const fnBody = node.body && node.body.body;
      if (!Array.isArray(fnBody)) return;
      for (const stmt of fnBody) {
        if (stmt.type !== 'ReturnStatement') continue;
        const arg = stmt.argument;
        if (!arg || arg.type !== 'ObjectExpression') return; // non-literal return — skip
        if (!hasPropertyPath(arg, ['alternates'])) {
          context.report({
            node: stmt,
            messageId: 'missingAlternatesGenerate',
            data: { path: inferPathFromFilename() },
          });
          return;
        }
        if (!hasPropertyPath(arg, ['alternates', 'canonical'])) {
          context.report({
            node: stmt,
            messageId: 'missingCanonicalGenerate',
            data: { path: inferPathFromFilename() },
          });
          return;
        }
      }
    }

    return {
      ExportNamedDeclaration: checkExportNamed,
    };
  },
};