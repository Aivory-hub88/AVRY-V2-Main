/**
 * German uses the site's default Manrope font (Latin, covers umlauts/ß
 * fine) so no dedicated font import -- just the `lang` wrapper. See
 * src/app/ar/layout.tsx for why this can't be set on <html> directly.
 */
export default function GermanLayout({ children }: { children: React.ReactNode }) {
  return <div lang="de">{children}</div>;
}
