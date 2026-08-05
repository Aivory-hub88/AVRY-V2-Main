'use strict';

/**
 * eslint-plugin-aivory-seo
 *
 * Rule catalogue and a small shared helper used by individual rule modules.
 * Loaded as a local plugin via `file:` install in the frontend-nextjs package.
 *
 * Philosophy: catch the SEO regressions that produced the /careers,
 * /contact, /free-diagnostic, /company, /product canonical bugs at
 * lint time — i.e. before they ship — rather than after Search Console
 * surfaces them as "duplicate of homepage" two weeks later.
 */
module.exports = {
  rules: {
    'require-canonical': require('./rules/require-canonical.js'),
    'no-use-client-default-page': require('./rules/no-use-client-default-page.js'),
    'require-page-metadata': require('./rules/require-page-metadata.js'),
  },
  configs: {
    recommended: {
      plugins: ['aivory-seo'],
      rules: {
        'aivory-seo/require-canonical': 'error',
        'aivory-seo/no-use-client-default-page': 'error',
        'aivory-seo/require-page-metadata': 'warn',
      },
    },
  },
};

/**
 * Is the node an ExportNamedDeclaration exporting `metadata` as a const/let?
 *   `export const metadata: Metadata = { ... };`
 *   `export const metadata = { ... };`
 */
function isMetadataExport(node) {
  return (
    node &&
    node.type === 'ExportNamedDeclaration' &&
    node.declaration &&
    node.declaration.type === 'VariableDeclaration' &&
    node.declaration.declarations.some(
      (d) => d.id && d.id.name === 'metadata',
    )
  );
}

/**
 * Is the node an ExportNamedDeclaration exporting `generateMetadata`?
 *   `export async function generateMetadata() { ... }`
 *   `export function generateMetadata() { ... }`
 */
function isGenerateMetadataExport(node) {
  return (
    node &&
    node.type === 'ExportNamedDeclaration' &&
    node.declaration &&
    (node.declaration.type === 'FunctionDeclaration' ||
      node.declaration.type === 'AsyncFunctionDeclaration') &&
    node.declaration.id &&
    node.declaration.id.name === 'generateMetadata'
  );
}

/**
 * Cheap AST inspector — does the given property path exist on an object
 * expression? Used for `metadata.alternates.canonical` style checks.
 *
 *   hasPropertyPath(obj, ['alternates', 'canonical'])
 */
function hasPropertyPath(objExpr, pathSegments) {
  if (!objExpr || objExpr.type !== 'ObjectExpression') return false;
  const [head, ...rest] = pathSegments;
  for (const prop of objExpr.properties) {
    if (prop.type !== 'Property') continue;
    const key =
      prop.key && (prop.key.name || prop.key.value || (typeof prop.key.value === 'string' ? prop.key.value : null));
    if (key !== head) continue;
    if (rest.length === 0) return true;
    return hasPropertyPath(prop.value, rest);
  }
  return false;
}

module.exports.isMetadataExport = isMetadataExport;
module.exports.isGenerateMetadataExport = isGenerateMetadataExport;
module.exports.hasPropertyPath = hasPropertyPath;