'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const productLinks = [
  { label: 'Deep Diagnostic', href: '/product' },
  { label: 'AI Blueprint', href: '/product' },
  { label: 'AI Roadmap', href: '/product' },
  { label: 'Workflow Builder', href: '/product' },
  { label: 'AI Agents', href: '/product' },
  { label: 'Template Library', href: '/product' },
];

const companyLinks = [
  { label: 'About', href: '/company' },
  { label: 'Blog', href: '/blog' },
  { label: 'Careers', href: '/careers' },
  { label: 'Investor Relations', href: '/investor-relations' },
  { label: 'Contact', href: '/contact' },
];

const legalLinks = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Cookie Policy', href: '/cookie-policy' },
];

export default function Footer() {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <footer className="w-full bg-[#050505] text-white pt-24 pb-12 font-sans">
      <div ref={ref} className={`animate-on-scroll ${isVisible ? 'is-visible' : ''}`}>
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          {/* 5-column grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-12 md:gap-8 mb-16 md:mb-32">
            {/* Product */}
            <div className="col-span-1">
              <h4 className="text-gray-500 text-sm font-normal mb-4">Product</h4>
              <ul className="space-y-3 text-sm">
                {productLinks.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-white/90 hover:text-[#939393] transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div className="col-span-1">
              <h4 className="text-gray-500 text-sm font-normal mb-4">Company</h4>
              <ul className="space-y-3 text-sm">
                {companyLinks.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-white/90 hover:text-[#939393] transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div className="col-span-1">
              <h4 className="text-gray-500 text-sm font-normal mb-4">Legal</h4>
              <ul className="space-y-3 text-sm">
                {legalLinks.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-white/90 hover:text-[#939393] transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Get in touch */}
            <div className="col-span-1">
              <h4 className="text-gray-500 text-sm font-normal mb-4">Get in touch</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <a href="mailto:hello@aivory.uk" className="text-white/90 hover:text-[#939393] transition-colors">
                    hello@aivory.uk
                  </a>
                </li>
              </ul>
            </div>

            {/* Logo */}
            <div className="col-span-2 md:col-span-1 flex md:justify-end mt-8 md:mt-0">
              <div className="flex flex-col items-start">
                <Image
                  src="/aivory-logo.svg"
                  alt="Aivory Logo"
                  width={72}
                  height={72}
                  className="h-[48px] md:h-[72px] w-auto opacity-90"
                />
              </div>
            </div>
          </div>

          {/* Copyright + Divider */}
          <div className="pb-6 text-sm text-white/80">
            &copy; 2026 Aivory. All rights reserved.
          </div>
          {/* Divider removed */}
        </div>
      </div>
    </footer>
  );
}
