'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useLanguage } from '@/components/context/LanguageContext';
import SignInModal from '@/components/auth/SignInModal';
import { isAuthenticated, getUser, logout } from '@/lib/auth';

export default function Navbar() {
  const { language, setLanguage } = useLanguage();
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [userName, setUserName] = useState('');
  const [accountType, setAccountType] = useState('free');

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

  // Set the shared cookies the dashboards expect, then navigate. Robust even if
  // the session predates cookie-setting on login.
  const handleDashboard = (target: 'user' | 'admin' = 'user') => {
    if (!authed) { setIsSignInModalOpen(true); return; }
    try {
      const raw = localStorage.getItem('aivory_auth');
      if (raw) {
        const s = JSON.parse(raw);
        const at = s?.access_token || '';
        const acct = s?.user?.user_metadata?.account_type || 'free';
        const u = { id: s?.user?.id || '', email: s?.user?.email || '', account_type: acct, role: acct };
        const attrs = 'path=/; max-age=604800; SameSite=Lax';
        if (at) {
          document.cookie = `aivory_access_token=${at}; ${attrs}`;
          document.cookie = `aivory_session_token=${encodeURIComponent(JSON.stringify(at))}; ${attrs}`;
          document.cookie = `aivory_user=${encodeURIComponent(JSON.stringify(u))}; ${attrs}`;
        }
      }
    } catch {}
    const dashUrl = target === 'admin'
      ? (process.env.NEXT_PUBLIC_ADMIN_DASHBOARD_URL || '/admin')
      : (process.env.NEXT_PUBLIC_DASHBOARD_URL || '/dashboard');
    window.location.href = dashUrl;
  };

  return (
    <nav className="absolute top-0 left-0 right-0 z-[1000]" style={{ background: 'transparent' }}>
      <div className="max-w-[1400px] mx-auto flex justify-between items-center" style={{ padding: '1.5rem clamp(1rem, 4vw, 2rem)' }}>
        {/* Left: Aivory logo */}
        <Link href="/" className="flex items-center">
          <Image
            src="/Aivory_logo_2_2026.svg"
            alt="Aivory Logo"
            width={140}
            height={30}
            className="h-[30px] w-auto object-contain"
            priority
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
              style={{ fontFamily: "'Manrope', sans-serif", fontSize: '10px' }}
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
              style={{ fontFamily: "'Manrope', sans-serif", fontSize: '10px' }}
            >
              <Image src="/id-flag.svg" alt="ID" width={14} height={10} className="rounded-[2px] object-cover h-[10px] w-[14px]" />
              ID
            </button>
          </div>
          <Link
            href="/product"
            className="text-white font-normal uppercase tracking-normal no-underline hover:underline transition-all duration-200"
            style={{ fontFamily: "'Manrope', sans-serif", fontSize: '10px' }}
          >
            PRODUCT
          </Link>
          <Link
            href="/company"
            className="text-white font-normal uppercase tracking-normal no-underline hover:underline transition-all duration-200"
            style={{ fontFamily: "'Manrope', sans-serif", fontSize: '10px' }}
          >
            COMPANY
          </Link>
          <Link
            href="/pricing"
            className="text-white font-normal uppercase tracking-normal no-underline hover:underline transition-all duration-200"
            style={{ fontFamily: "'Manrope', sans-serif", fontSize: '10px' }}
          >
            PRICING
          </Link>
          <Link
            href="/blog"
            className="text-white font-normal uppercase tracking-normal no-underline hover:underline transition-all duration-200"
            style={{ fontFamily: "'Manrope', sans-serif", fontSize: '10px' }}
          >
            BLOG
          </Link>
          <Link
            href="/careers"
            className="text-white font-normal uppercase tracking-normal no-underline hover:underline transition-all duration-200"
            style={{ fontFamily: "'Manrope', sans-serif", fontSize: '10px' }}
          >
            CAREERS
          </Link>
          {authed ? (
            <>
              <span className="text-white" style={{ fontFamily: "'Manrope', sans-serif", fontSize: '11px' }}>
                Welcome, {userName}
              </span>
              <button
                onClick={() => logout()}
                className="text-white font-normal uppercase tracking-normal no-underline hover:underline transition-all duration-200 bg-transparent border-none cursor-pointer"
                style={{ fontFamily: "'Manrope', sans-serif", fontSize: '10px' }}
              >
                SIGN OUT
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsSignInModalOpen(true)}
              className="text-white font-normal uppercase tracking-normal no-underline hover:underline transition-all duration-200 bg-transparent border-none cursor-pointer"
              style={{ fontFamily: "'Manrope', sans-serif", fontSize: '10px' }}
            >
              SIGN IN
            </button>
          )}
          <button
            onClick={() => handleDashboard('user')}
            className="h-[29px] px-[18px] font-normal text-white bg-transparent inline-flex items-center justify-center cursor-pointer transition-all duration-200 hover:bg-white/[0.08] hover:border-white/40"
            style={{
              border: '1px solid rgba(255, 255, 255, 0.25)',
              borderRadius: 0,
              fontFamily: "'Manrope', sans-serif",
              fontSize: '10px',
              letterSpacing: '-0.01em',
              textTransform: 'uppercase',
            }}
          >
            DASHBOARD
          </button>
          {authed && (accountType === 'superadmin' || accountType === 'admin') && (
            <button
              onClick={() => handleDashboard('admin')}
              className="h-[29px] px-[18px] font-normal text-[#494949] bg-[#a3aa96] inline-flex items-center justify-center cursor-pointer transition-all duration-200 hover:bg-[#8f9681]"
              style={{
                borderRadius: 0,
                fontFamily: "'Manrope', sans-serif",
                fontSize: '10px',
                letterSpacing: '-0.01em',
                textTransform: 'uppercase',
              }}
            >
              ADMIN
            </button>
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
        className={`fixed inset-0 z-[9999] bg-black flex flex-col transition-all duration-300 md:hidden ${
          isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Top bar: Logo + Close */}
        <div className="flex justify-between items-center px-4 py-6">
          <Link href="/" onClick={() => setIsMobileMenuOpen(false)}>
            <Image
              src="/Aivory_logo_2_2026.svg"
              alt="Aivory Logo"
              width={140}
              height={30}
              className="h-[30px] w-auto object-contain"
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
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            Product
          </Link>
          <Link
            href="/company"
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-white text-3xl font-light tracking-tight no-underline hover:text-white/70 transition-colors"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            Company
          </Link>
          <Link
            href="/pricing"
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-white text-3xl font-light tracking-tight no-underline hover:text-white/70 transition-colors"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            Pricing
          </Link>
          <Link
            href="/blog"
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-white text-3xl font-light tracking-tight no-underline hover:text-white/70 transition-colors"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            Blog
          </Link>
          <Link
            href="/careers"
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-white text-3xl font-light tracking-tight no-underline hover:text-white/70 transition-colors"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            Careers
          </Link>
          {authed ? (
            <button
              onClick={() => { setIsMobileMenuOpen(false); logout(); }}
              className="text-white text-3xl font-light tracking-tight no-underline hover:text-white/70 transition-colors bg-transparent border-none cursor-pointer text-left"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              Sign Out
            </button>
          ) : (
            <button
              onClick={() => { setIsMobileMenuOpen(false); setIsSignInModalOpen(true); }}
              className="text-white text-3xl font-light tracking-tight no-underline hover:text-white/70 transition-colors bg-transparent border-none cursor-pointer text-left"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              Sign In
            </button>
          )}
          <button
            onClick={() => { setIsMobileMenuOpen(false); handleDashboard('user'); }}
            className="text-white text-3xl font-light tracking-tight no-underline hover:text-white/70 transition-colors bg-transparent border-none cursor-pointer text-left"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            Dashboard
          </button>
          {authed && (accountType === 'superadmin' || accountType === 'admin') && (
            <button
              onClick={() => { setIsMobileMenuOpen(false); handleDashboard('admin'); }}
              className="text-white text-3xl font-light tracking-tight no-underline hover:text-white/70 transition-colors bg-transparent border-none cursor-pointer text-left"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              Admin
            </button>
          )}
        </div>

        {/* Bottom: Language Toggle */}
        <div className="px-8 pb-10 flex items-center gap-4">
          <button
            onClick={() => { setLanguage('en'); setIsMobileMenuOpen(false); }}
            className={`flex items-center gap-2 transition-all duration-300 ${
              language === 'en' ? 'opacity-100 grayscale-0' : 'opacity-40 grayscale hover:opacity-70'
            }`}
            style={{ fontFamily: "'Manrope', sans-serif", fontSize: '12px' }}
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
            style={{ fontFamily: "'Manrope', sans-serif", fontSize: '12px' }}
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
}
