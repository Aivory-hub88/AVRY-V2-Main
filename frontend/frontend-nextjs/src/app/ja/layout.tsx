import { Noto_Sans_JP } from 'next/font/google';

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-japanese',
  display: 'swap',
});

/** See src/app/ar/layout.tsx for why `lang` is set on a wrapper, not <html>. */
export default function JapaneseLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      lang="ja"
      className={`${notoSansJP.variable} font-japanese`}
      style={{ fontFamily: 'var(--font-japanese), "Noto Sans JP", sans-serif' }}
    >
      {children}
    </div>
  );
}
