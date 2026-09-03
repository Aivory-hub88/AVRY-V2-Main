'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/components/context/LanguageContext';
import SignInModal from '@/components/auth/SignInModal';
import { isAuthenticated, getUser, logout } from '@/lib/auth';
import { TechnicalFrameButton } from '@/components/ui/TechnicalFrameButton';

/* ─── Arrow Icon ─── */
function ArrowIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 7v10H7" />
      <path d="M7 7l10 10" />
    </svg>
  );
}

export default function Navbar() {
  const { language, setLanguage } = useLanguage();
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [userName, setUserName] = useState('');
  const [accountType, setAccountType] = useState('free');
  const [mounted, setMounted] = useState(false);

  // Fixed nav needs to escape whatever stacking context the host page wraps
  // it in — several pages nest it inside a `relative z-10` hero wrapper that
  // sits before an equally-`z-10` sibling further down the page, which wins
  // paint order by DOM position and buries the nav under later sections once
  // scrolled past the hero. Portaling to <body> after mount sidesteps that
  // entirely; the pre-mount render (SSR + first paint) stays in place so the
  // logo still lands in the initial HTML for LCP.
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const check = () => {
      const a = isAuthenticated();
      setAuthed(a);
      if (a) {
        const u = getUser();
        setUserName(u?.email?.split('@')[0] || u?.email || '');
        setAccountType(u?.account_type || 'free');
      } else {
        setUserName('');
        setAccountType('free');
      }
    };
    check();
    window.addEventListener('authManager:login', check);
    window.addEventListener('authManager:logout', check);
    return () => {
      window.removeEventListener('authManager:login', check);
      window.removeEventListener('authManager:logout', check);
    };
  }, []);

  // Navigate only — auth cookies are written exclusively at login time
  // (setAuthCookies in lib/auth.ts). Re-stamping them here from localStorage
  // resurrected stale tokens as domain-wide duplicates and poisoned the
  // dashboards' sessions; if the cookie is missing/expired the dashboard
  // redirects to login, which is the correct behavior.
  const handleDashboard = (target: 'user' | 'admin' = 'user') => {
    if (!authed) { setIsSignInModalOpen(true); return; }
    const dashUrl = target === 'admin'
      ? (process.env.NEXT_PUBLIC_ADMIN_DASHBOARD_URL || '/admin')
      : (process.env.NEXT_PUBLIC_DASHBOARD_URL || '/dashboard');
    window.location.href = dashUrl;
  };

  const nav = (
    <nav className="fixed top-0 inset-x-0 z-[1000]">
      <div
        className="h-16 w-full flex justify-between items-center border-b border-white/5 bg-black/35 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_8px_30px_-4px_rgba(0,0,0,0.5)]"
        style={{ padding: '0 clamp(1rem, 4vw, 2rem)' }}
      >
        {/* Left: Aivory logo */}
        <Link href="/" className="flex items-center">
          {/* Measured as the page's LCP element — the hero headline paints via
              a clipped gradient and the flower is a canvas, so this 1.4KB mark
              is what the metric actually lands on. It therefore gets explicit
              priority instead of queueing behind the rest of the page. */}
          <img
            src="/Aivory_new_logo_white.svg"
            alt="Aivory Logo"
            width={1260}
            height={512}
            fetchPriority="high"
            decoding="sync"
            className="h-[52px] w-auto object-contain"
          />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-7">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLanguage('en')}
              className={`flex items-center gap-1.5 transition-all duration-300 ${
                language === 'en' ? 'opacity-100 grayscale-0' : 'opacity-40 grayscale hover:opacity-70'
              }`}
              style={{ fontFamily: "var(--font-manrope), 'Manrope', sans-serif", fontSize: '10px' }}
            >
              <Image src="/uk-flag.svg" alt="EN" width={14} height={10} className="rounded-[2px] object-cover h-[10px] w-[14px]" />
              EN
            </button>
            <span className="text-white/30 text-[10px]">|</span>
            <button
              onClick={() => setLanguage('id')}
              className={`flex items-center gap-1.5 transition-all duration-300 ${
                language === 'id' ? 'opacity-100 grayscale-0' : 'opacity-40 grayscale hover:opacity-70'
              }`}
              style={{ fontFamily: "var(--font-manrope), 'Manrope', sans-serif", fontSize: '10px' }}
            >
              <Image src="/id-flag.svg" alt="ID" width={14} height={10} className="rounded-[2px] object-cover h-[10px] w-[14px]" />
              ID
            </button>
          </div>
          <Link
            href="/product"
            className="text-white font-normal uppercase tracking-normal no-underline hover:underline transition-all duration-200"
            style={{ fontFamily: "var(--font-manrope), 'Manrope', sans-serif", fontSize: '10px' }}
          >
            PRODUCT
          </Link>
          <Link
            href="/company"
            className="text-white font-normal uppercase tracking-normal no-underline hover:underline transition-all duration-200"
            style={{ fontFamily: "var(--font-manrope), 'Manrope', sans-serif", fontSize: '10px' }}
          >
            COMPANY
          </Link>
          <Link
            href="/pricing"
            className="text-white font-normal uppercase tracking-normal no-underline hover:underline transition-all duration-200"
            style={{ fontFamily: "var(--font-manrope), 'Manrope', sans-serif", fontSize: '10px' }}
          >
            PRICING
          </Link>
          <Link
            href="/blog"
            className="text-white font-normal uppercase tracking-normal no-underline hover:underline transition-all duration-200"
            style={{ fontFamily: "var(--font-manrope), 'Manrope', sans-serif", fontSize: '10px' }}
          >
            BLOG
          </Link>
          <Link
            href="/careers"
            className="text-white font-normal uppercase tracking-normal no-underline hover:underline transition-all duration-200"
            style={{ fontFamily: "var(--font-manrope), 'Manrope', sans-serif", fontSize: '10px' }}
          >
            CAREERS
          </Link>
          {authed ? (
            <>
              <span className="text-white" style={{ fontFamily: "var(--font-manrope), 'Manrope', sans-serif", fontSize: '11px' }}>
                Welcome, {userName}
              </span>
              <button
                onClick={() => logout()}
                className="text-white font-normal uppercase tracking-normal no-underline hover:underline transition-all duration-200 bg-transparent border-none cursor-pointer"
                style={{ fontFamily: "var(--font-manrope), 'Manrope', sans-serif", fontSize: '10px' }}
              >
                SIGN OUT
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsSignInModalOpen(true)}
              className="text-white font-normal uppercase tracking-normal no-underline hover:underline transition-all duration-200 bg-transparent border-none cursor-pointer"
              style={{ fontFamily: "var(--font-manrope), 'Manrope', sans-serif", fontSize: '10px' }}
            >
              SIGN IN
            </button>
          )}
          <TechnicalFrameButton
            onClick={() => handleDashboard('user')}
            size="compact"
          >
            <ArrowIcon className="w-3 h-3 text-[#a3aa96]" />
            DASHBOARD
          </TechnicalFrameButton>
          {authed && (accountType === 'superadmin' || accountType === 'admin') && (
            <TechnicalFrameButton
              onClick={() => handleDashboard('admin')}
              size="compact"
            >
              <ArrowIcon className="w-3 h-3 text-[#a3aa96]" />
              ADMIN
            </TechnicalFrameButton>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="md:hidden flex flex-col items-center justify-center w-10 h-10 bg-transparent border-none cursor-pointer gap-[5px]"
          aria-label="Open menu"
        >
          <span className="block w-5 h-[1px] bg-white" />
          <span className="block w-5 h-[1px] bg-white" />
        </button>
      </div>

      {/* Mobile Fullscreen Overlay Menu */}
      <div
        className={`fixed inset-0 z-[9999] bg-background flex flex-col transition-all duration-300 md:hidden ${
          isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Top bar: Logo + Close */}
        <div className="h-16 flex justify-between items-center px-4">
          <Link href="/" onClick={() => setIsMobileMenuOpen(false)}>
            <img
              src="/Aivory_new_logo_white.svg"
              alt="Aivory Logo"
              width={1260}
              height={512}
              className="h-[52px] w-auto object-contain"
            />
          </Link>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center justify-center w-10 h-10 bg-transparent border-none cursor-pointer text-white"
            aria-label="Close menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 flex flex-col justify-center px-8 gap-8">
          <Link
            href="/product"
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-white text-3xl font-light tracking-tight no-underline hover:text-white/70 transition-colors"
            style={{ fontFamily: "var(--font-manrope), 'Manrope', sans-serif" }}
          >
            Product
          </Link>
          <Link
            href="/company"
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-white text-3xl font-light tracking-tight no-underline hover:text-white/70 transition-colors"
            style={{ fontFamily: "var(--font-manrope), 'Manrope', sans-serif" }}
          >
            Company
          </Link>
          <Link
            href="/pricing"
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-white text-3xl font-light tracking-tight no-underline hover:text-white/70 transition-colors"
            style={{ fontFamily: "var(--font-manrope), 'Manrope', sans-serif" }}
          >
            Pricing
          </Link>
          <Link
            href="/blog"
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-white text-3xl font-light tracking-tight no-underline hover:text-white/70 transition-colors"
            style={{ fontFamily: "var(--font-manrope), 'Manrope', sans-serif" }}
          >
            Blog
          </Link>
          <Link
            href="/careers"
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-white text-3xl font-light tracking-tight no-underline hover:text-white/70 transition-colors"
            style={{ fontFamily: "var(--font-manrope), 'Manrope', sans-serif" }}
          >
            Careers
          </Link>
          {authed ? (
            <button
              onClick={() => { setIsMobileMenuOpen(false); logout(); }}
              className="text-white text-3xl font-light tracking-tight no-underline hover:text-white/70 transition-colors bg-transparent border-none cursor-pointer text-left"
              style={{ fontFamily: "var(--font-manrope), 'Manrope', sans-serif" }}
            >
              Sign Out
            </button>
          ) : (
            <button
              onClick={() => { setIsMobileMenuOpen(false); setIsSignInModalOpen(true); }}
              className="text-white text-3xl font-light tracking-tight no-underline hover:text-white/70 transition-colors bg-transparent border-none cursor-pointer text-left"
              style={{ fontFamily: "var(--font-manrope), 'Manrope', sans-serif" }}
            >
              Sign In
            </button>
          )}
          <TechnicalFrameButton
            onClick={() => { setIsMobileMenuOpen(false); handleDashboard('user'); }}
            size="compact"
          >
            Dashboard
          </TechnicalFrameButton>
          {authed && (accountType === 'superadmin' || accountType === 'admin') && (
            <TechnicalFrameButton
              onClick={() => { setIsMobileMenuOpen(false); handleDashboard('admin'); }}
              size="compact"
            >
              Admin
            </TechnicalFrameButton>
          )}
        </div>

        {/* Bottom: Language Toggle */}
        <div className="px-8 pb-10 flex items-center gap-4">
          <button
            onClick={() => { setLanguage('en'); setIsMobileMenuOpen(false); }}
            className={`flex items-center gap-2 transition-all duration-300 ${
              language === 'en' ? 'opacity-100 grayscale-0' : 'opacity-40 grayscale hover:opacity-70'
            }`}
            style={{ fontFamily: "var(--font-manrope), 'Manrope', sans-serif", fontSize: '12px' }}
          >
            <Image src="/uk-flag.svg" alt="EN" width={18} height={12} className="rounded-[2px] object-cover h-[12px] w-[18px]" />
            EN
          </button>
          <span className="text-white/30 text-xs">|</span>
          <button
            onClick={() => { setLanguage('id'); setIsMobileMenuOpen(false); }}
            className={`flex items-center gap-2 transition-all duration-300 ${
              language === 'id' ? 'opacity-100 grayscale-0' : 'opacity-40 grayscale hover:opacity-70'
            }`}
            style={{ fontFamily: "var(--font-manrope), 'Manrope', sans-serif", fontSize: '12px' }}
          >
            <Image src="/id-flag.svg" alt="ID" width={18} height={12} className="rounded-[2px] object-cover h-[12px] w-[18px]" />
            ID
          </button>
        </div>
      </div>

      {/* Sign In Modal */}
      <SignInModal
        isOpen={isSignInModalOpen}
        onClose={() => setIsSignInModalOpen(false)}
      />
    </nav>
  );

  return mounted ? createPortal(nav, document.body) : nav;
}
