import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import './globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Aivory — AI-Powered Business Transformation',
  description:
    'From diagnostic to deployment — everything you need to integrate AI into your business operations.',
};

import { LanguageProvider } from '@/components/context/LanguageContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={manrope.variable}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@200;300;400;500;600;700;800&family=Doto:wght@400;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-white font-manrope antialiased" style={{ fontFamily: 'var(--font-manrope), Manrope, sans-serif' }}>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
