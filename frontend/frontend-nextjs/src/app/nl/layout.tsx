/** Dutch reuses the default Manrope font -- see src/app/de/layout.tsx. */
export default function DutchLayout({ children }: { children: React.ReactNode }) {
  return <div lang="nl">{children}</div>;
}
