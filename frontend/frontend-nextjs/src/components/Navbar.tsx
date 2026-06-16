'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Product', href: '/product' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Blog', href: '/blog' },
  { label: 'Careers', href: '/careers' },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <nav className="absolute top-0 left-0 right-0 z-50">
      <div className="max-w-[1400px] mx-auto flex justify-between items-center px-6 md:px-8 py-5">
        {/* Left: Brand */}
        <Link href="/" className="text-white font-bold text-xl">
          Aivory
        </Link>

        {/* Center: Nav links (desktop) */}
        <ul className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className={`font-medium text-[15px] transition-colors ${
                    isActive
                      ? 'text-accent'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Right: Auth actions (desktop) */}
        <div className="hidden md:flex items-center gap-4">
          <a
            href="https://app.aivory.io/sign-in"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[15px] text-white/80 hover:text-white transition-colors"
          >
            Sign In
          </a>
          <a
            href="https://app.aivory.io/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[15px] px-4 py-2 border border-white/20 rounded-full text-white/90 hover:border-white/40 hover:text-white transition-colors"
          >
            Dashboard
          </a>
        </div>

        {/* Mobile: Hamburger button */}
        <button
          type="button"
          className="md:hidden flex flex-col justify-center items-center w-8 h-8 gap-1.5"
          aria-label="Toggle menu"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <span
            className={`block w-5 h-0.5 bg-white transition-transform ${
              mobileOpen ? 'rotate-45 translate-y-[4px]' : ''
            }`}
          />
          <span
            className={`block w-5 h-0.5 bg-white transition-opacity ${
              mobileOpen ? 'opacity-0' : ''
            }`}
          />
          <span
            className={`block w-5 h-0.5 bg-white transition-transform ${
              mobileOpen ? '-rotate-45 -translate-y-[4px]' : ''
            }`}
          />
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {mobileOpen && (
        <div className="md:hidden bg-surface/95 backdrop-blur-md border-t border-border">
          <div className="max-w-[1400px] mx-auto px-6 py-4 flex flex-col gap-4">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`font-medium text-[15px] transition-colors ${
                    isActive
                      ? 'text-accent'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <hr className="border-border" />
            <a
              href="https://app.aivory.io/sign-in"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileOpen(false)}
              className="font-medium text-[15px] text-white/80 hover:text-white transition-colors"
            >
              Sign In
            </a>
            <a
              href="https://app.aivory.io/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileOpen(false)}
              className="inline-block text-center font-medium text-[15px] px-4 py-2 border border-white/20 rounded-full text-white/90 hover:border-white/40 hover:text-white transition-colors"
            >
              Dashboard
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
