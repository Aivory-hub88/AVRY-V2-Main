import { Noto_Sans_SC } from 'next/font/google';

const notoSansSC = Noto_Sans_SC({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-chinese',
  display: 'swap',
});

/** See src/app/ar/layout.tsx for why `lang` is set on a wrapper, not <html>. */
export default function ChineseLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      lang="zh-CN"
      className={`${notoSansSC.variable} font-chinese`}
      style={{ fontFamily: 'var(--font-chinese), "Noto Sans SC", sans-serif' }}
    >
      {children}
    </div>
  );
}
