import type { Metadata } from 'next';
import { Manrope, Doto } from 'next/font/google';
import './globals.css';
import { SITE_URL, ORGANIZATION, JsonLd } from '@/lib/seo';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
});

// Self-hosted (like Manrope above) so the diagnostic-card PNG export never
// depends on a live fetch to Google Fonts at capture time -- the previous
// setup only pulled Doto from a remote <link>, which is the likely cause of
// wrong-weight/fallback-font glyphs in the exported cards.
const doto = Doto({
  subsets: ['latin'],
  weight: ['400', '600', '700', '900'],
  variable: '--font-doto',
  display: 'swap',
});

const SITE_NAME = 'Aivory';
const SITE_TITLE = 'Aivory — AI-Powered Business Transformation';
const SITE_DESCRIPTION =
  'From diagnostic to deployment — everything you need to integrate AI into your business operations.';

// Default social/share image used by any page that doesn't set its own.
const DEFAULT_OG_IMAGE = '/hero-video-poster.jpg';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: '%s | Aivory',
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: SITE_TITLE }],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
};

import { LanguageProvider } from '@/components/context/LanguageContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${manrope.variable} ${doto.variable}`}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@200;300;400;500;600;700;800&family=Doto:wght@400;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-white font-manrope antialiased" style={{ fontFamily: 'var(--font-manrope), Manrope, sans-serif' }}>
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@graph': [
              { ...ORGANIZATION, description: SITE_DESCRIPTION },
              {
                '@type': 'WebSite',
                name: SITE_NAME,
                url: SITE_URL,
                publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
              },
            ],
          }}
        />
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
