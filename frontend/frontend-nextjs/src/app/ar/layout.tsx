import { Noto_Sans_Arabic } from 'next/font/google';

const notoSansArabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-arabic',
  display: 'swap',
});

/**
 * Next.js App Router allows only the root layout to render <html>/<body>,
 * so `dir`/`lang` can't be set there for this subtree alone. We set them on
 * this wrapping element instead — correct for CSS logical properties and
 * font selection, though screen readers that key off <html lang> specifically
 * (rather than the nearest ancestor) won't pick it up. Revisit if that gap
 * matters once there's real Arabic traffic.
 */
export default function ArabicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      dir="rtl"
      lang="ar"
      className={`${notoSansArabic.variable} font-arabic`}
      style={{ fontFamily: 'var(--font-arabic), "Noto Sans Arabic", sans-serif' }}
    >
      {children}
    </div>
  );
}
