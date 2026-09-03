import { Noto_Sans_KR } from 'next/font/google';

const notoSansKR = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-korean',
  display: 'swap',
});

/** See src/app/ar/layout.tsx for why `lang` is set on a wrapper, not <html>. */
export default function KoreanLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      lang="ko"
      className={`${notoSansKR.variable} font-korean`}
      style={{ fontFamily: 'var(--font-korean), "Noto Sans KR", sans-serif' }}
    >
      {children}
    </div>
  );
}
