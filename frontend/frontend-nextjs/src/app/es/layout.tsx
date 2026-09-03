/** Spanish reuses the default Manrope font -- see src/app/de/layout.tsx. */
export default function SpanishLayout({ children }: { children: React.ReactNode }) {
  return <div lang="es">{children}</div>;
}
