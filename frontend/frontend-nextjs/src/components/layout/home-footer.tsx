/**
 * Home Footer Component
 *
 * Footer matching the legacy `index.html` footer (lines ~7795–7929):
 * a `md:grid-cols-5` layout of three link columns (Product / Company / Legal),
 * an empty desktop spacer, and the brand logo right-aligned on desktop.
 *
 * Parity decisions (design recommendations 10.2 / 11.1, Requirements 10 / 11):
 * - Brand mark renders the legacy SVG logo via the shared `BrandLogo` component,
 *   right-aligned on desktop (`md:justify-end`).
 * - Copyright uses the literal `© 2026 Aivory. All rights reserved.` (not a
 *   dynamic `new Date().getFullYear()`) so screenshot diffs stay deterministic.
 *
 * Responsive (Requirement 6.6): at ≤768px the three link columns render in two
 * columns (`grid-cols-2`) with the brand mark stacked below them
 * (`col-span-2 md:col-span-1`).
 */

import React from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/components/layout/brand-logo';

interface FooterColumn {
  title: string;
  links: string[];
}

const columns: FooterColumn[] = [
  {
    title: 'Product',
    links: [
      'Deep Diagnostic',
      'AI Blueprint',
      'AI Roadmap',
      'Workflow Builder',
      'AI Agents',
      'Template Library',
    ],
  },
  {
    title: 'Company',
    links: ['About', 'Blog', 'Careers', 'Investor Relations', 'Contact'],
  },
  {
    title: 'Legal',
    links: ['Privacy Policy', 'Terms of Service', 'Cookie Policy'],
  },
  {
    title: 'Get in touch',
    links: ['hello@aivory.uk'],
  },
];

/** Map link labels to actual page hrefs */
function getLinkHref(link: string): string {
  const map: Record<string, string> = {
    // Product links → product page
    'Deep Diagnostic': '/product',
    'AI Blueprint': '/product',
    'AI Roadmap': '/product',
    'Workflow Builder': '/product',
    'AI Agents': '/product',
    'Template Library': '/product',
    // Company links → their own pages
    'About': '/about',
    'Blog': '/blog',
    'Careers': '/careers',
    'Investor Relations': '/investor-relations',
    'Contact': '/contact',
    // Legal links → their own pages
    'Privacy Policy': '/privacy',
    'Terms of Service': '/terms',
    'Cookie Policy': '/privacy',
    // Get in touch
    'hello@aivory.uk': 'mailto:hello@aivory.uk',
  };
  return map[link] || '/';
}

export function HomeFooter() {
  return (
    <footer className="!w-full !bg-[#050505] !text-white !pt-24 !pb-12 !font-sans">
      <div className="!max-w-7xl !mx-auto !px-6 md:!px-12">
        {/* Legacy desktop layout: 3 link columns + spacer + logo = md:grid-cols-5.
            At ≤768px the link columns collapse to two columns and the brand mark
            stacks below (col-span-2). */}
        <div className="!grid !grid-cols-2 md:!grid-cols-5 !gap-12 md:!gap-8 !mb-32">
          {columns.map((col) => (
            <div key={col.title} className="!col-span-1">
              <h4 className="!text-gray-500 !text-sm !font-medium !mb-4">
                {col.title}
              </h4>
              <ul className="!space-y-3 !text-sm !text-white/90">
                {col.links.map((link) => {
                  const href = getLinkHref(link);
                  const isExternal = href.startsWith('mailto:') || href.startsWith('http');
                  return (
                    <li key={link}>
                      {isExternal ? (
                        <a
                          href={href}
                          className="!text-white/90 hover:!text-white !no-underline !transition-colors"
                        >
                          {link}
                        </a>
                      ) : (
                        <Link
                          href={href}
                          className="!text-white/90 hover:!text-white !no-underline !transition-colors"
                        >
                          {link}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {/* Empty column for spacing (desktop only) */}
          <div className="!col-span-1 !hidden md:!block" />

          {/* Brand logo: right-aligned on desktop, stacked below the link
              columns on mobile. */}
          <div className="!col-span-2 md:!col-span-1 !flex md:!justify-end !mt-8 md:!mt-0">
            <div className="!flex !flex-col !items-start">
              <BrandLogo
                className="h-[48px] md:h-[72px] w-auto opacity-90"
                alt="Aivory Logo"
              />
            </div>
          </div>
        </div>

        <div className="!pb-6 !text-sm !text-white/80">
          © 2026 Aivory. All rights reserved.
        </div>
        <div className="!border-b !border-white/20 !w-full !mb-8" />
      </div>
    </footer>
  );
}

export default HomeFooter;
