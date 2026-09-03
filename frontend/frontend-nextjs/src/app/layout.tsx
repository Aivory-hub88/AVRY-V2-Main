import type { Metadata } from 'next';
import { Manrope, Doto } from 'next/font/google';
import './globals.css';
import {
  AIVORY_UK_URL,
  DEFAULT_OG_IMAGE,
  JsonLd,
  buildSiteGraph,
} from '@/lib/seo';
import { LanguageProvider } from '@/components/context/LanguageContext';
import { HtmlLangSync } from '@/components/locale/HtmlLangSync';
import AiTrap from '@/components/security/AiTrap';
import CanaryLink from '@/components/security/CanaryLink';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
});

const doto = Doto({
  subsets: ['latin'],
  weight: ['400', '600', '700', '900'],
  variable: '--font-doto',
  display: 'swap',
});

const SITE_NAME = 'Aivory AI';
const SITE_TITLE = 'Aivory AI - Infrastructure for Business Transformation';
const SITE_DESCRIPTION =
  'Aivory AI helps businesses assess operations, deploy governed AI agents, and automate workflows with operational intelligence.';

export const metadata: Metadata = {
  metadataBase: new URL(AIVORY_UK_URL),
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/icon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-48.png', sizes: '48x48', type: 'image/png' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
  },
  title: {
    default: SITE_TITLE,
    template: '%s | Aivory AI',
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  verification: {
    google: '-X46S5bMyCLH8iqPOeCooGlLGvfl2X7soGY9MuaQqt4',
  },
  alternates: {
    canonical: AIVORY_UK_URL,
    // en/id share one URL (client-side toggle, not separate pages), so per
    // Google's own hreflang guidance a self-referencing en/id pair adds no
    // real signal; `x-default` alone is the correct annotation for "one URL
    // serves every language/region". Pages that define their own
    // `alternates` (about/company + locale variants) replace this map with
    // their full hreflang set, avoiding duplicate conflicting x-defaults.
    languages: {
      "x-default": AIVORY_UK_URL,
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: AIVORY_UK_URL,
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: SITE_TITLE }],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  themeColor: '#050505',
  formatDetection: { telephone: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${manrope.variable} ${doto.variable} antialiased scroll-smooth`}>
      <head>
        <link rel="preload" as="image" href="/Aivory_logo_2_2026.svg" fetchPriority="high" />
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-XYJ0EDEYS8" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-XYJ0EDEYS8');
            `,
          }}
        />
      </head>
      <body className="bg-background text-white font-manrope antialiased overflow-x-hidden w-full" style={{ fontFamily: 'var(--font-manrope), Manrope, sans-serif' }}>
        <JsonLd data={buildSiteGraph(AIVORY_UK_URL)} />
        <HtmlLangSync />
        <LanguageProvider initialLanguage="en">
          <AiTrap />
          <CanaryLink />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
