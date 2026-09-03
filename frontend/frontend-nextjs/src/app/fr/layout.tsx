/** French reuses the default Manrope font -- see src/app/de/layout.tsx. */
export default function FrenchLayout({ children }: { children: React.ReactNode }) {
  return <div lang="fr">{children}</div>;
}
