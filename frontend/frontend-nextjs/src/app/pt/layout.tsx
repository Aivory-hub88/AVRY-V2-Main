/** European Portuguese reuses the default Manrope font -- see src/app/de/layout.tsx. */
export default function PortugueseLayout({ children }: { children: React.ReactNode }) {
  return <div lang="pt-PT">{children}</div>;
}
