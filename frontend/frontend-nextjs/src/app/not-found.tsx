import type { Metadata } from 'next';
import Link from 'next/link';

/**
 * 404 page.
 *
 * Without this file Next serves its built-in default, which inherits the root
 * layout's metadata wholesale — so every dead URL on the site declared
 * `<link rel="canonical" href="https://aivory.uk">` (pointing a missing page at
 * the homepage) alongside two contradictory robots tags: the layout's
 * `index, follow` and Next's own `noindex`.
 *
 * `alternates: null` drops the inherited canonical entirely, which is the
 * correct annotation for a page that does not exist. The status code is still
 * a real 404, so this is tidiness rather than a rescue — but a canonical
 * pointing every dead URL at the homepage is exactly the sort of conflicting
 * signal worth not sending during a domain migration.
 */
export const metadata: Metadata = {
  title: 'Page not found',
  description: 'The page you were looking for does not exist or has moved.',
  alternates: null,
  robots: {
    index: false,
    // Still worth following the links out of here — they all point back into
    // the site, and the crawler may as well rediscover live pages from a dead one.
    follow: true,
    googleBot: { index: false, follow: true },
  },
};

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/product', label: 'Product' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/blog', label: 'Blog' },
  { href: '/contact', label: 'Contact' },
];

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] w-full flex-col items-center justify-center px-6 py-24 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/40">
        404
      </p>
      <h1 className="mt-4 max-w-xl text-[32px] font-light leading-[1.15] tracking-[-0.03em] text-white md:text-[46px]">
        This page does not exist.
      </h1>
      <p className="mt-4 max-w-md text-sm font-light leading-relaxed text-white/60">
        The link may be out of date, or the page may have moved. Everything else is
        still where you left it.
      </p>

      <nav className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-sm text-white/90 underline-offset-4 transition-colors hover:text-white/60 hover:underline"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
