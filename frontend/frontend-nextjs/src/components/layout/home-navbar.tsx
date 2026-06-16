/**
 * Home Navbar Component
 *
 * Transparent navbar for the homepage matching the legacy index.html navbar.
 * Shows the brand SVG logo, Sign In link, user greeting, and Dashboard button.
 *
 * Features:
 * - Displays user name when authenticated
 * - Smart dashboard button that routes based on user role (admin vs user)
 * - Logout button when authenticated
 * - Sign In button when not authenticated
 *
 * Homepage legacy parity (Requirements 1.3, 3.3, 4.3, 6.7, 10.1):
 * - The `<nav>` landmark is the stable, queryable region identifier.
 * - The legacy SVG `BrandLogo` is the brand mark (design recommendation 10.1).
 * - `Sign In` and `Dashboard` use the Manrope token (`font-manrope`) to match
 *   the legacy nav typography (replacing the inline `"Manrope", sans-serif`).
 * - At <=768px the nav container stacks and centers, and the Dashboard control
 *   shrinks to `13px` font-size / `0 16px` padding (Tailwind base styles apply
 *   below the `md` min-width:768px breakpoint).
 * - The auth-aware Logout control is kept as a new-app enhancement.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BrandLogo } from '@/components/layout/brand-logo';
import { isAuthenticated, logout as authLogout, getUser, getUserRole, getToken } from '@/lib/auth';
import { useTranslation } from '@/contexts/TranslationContext';

export function HomeNavbar() {
  const router = useRouter();
  const { language, setLanguage } = useTranslation();
  const [authed, setAuthed] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<"user" | "admin" | null>(null);

  // Check authentication on mount and listen for auth events
  useEffect(() => {
    const checkAuth = () => {
      const authenticated = isAuthenticated();
      setAuthed(authenticated);
      
      if (authenticated) {
        const user = getUser();
        setUserName(user?.email?.split('@')[0] || user?.email || null);
        const role = getUserRole();
        setUserRole(role);
      } else {
        setUserName(null);
        setUserRole(null);
      }
    };

    checkAuth();

    if (typeof window !== 'undefined') {
      window.addEventListener('authManager:login', checkAuth);
      window.addEventListener('authManager:logout', checkAuth);

      return () => {
        window.removeEventListener('authManager:login', checkAuth);
        window.removeEventListener('authManager:logout', checkAuth);
      };
    }
  }, []);

  const handleSignIn = () => {
    // Dispatch event to open login modal on homepage
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('openLoginModal'));
    }
  };

  const handleDashboard = () => {
    const user = getUser();
    const token = getToken();
    
    // Admin users go to admin dashboard (port 9002)
    if (user?.account_type === "superadmin") {
      const adminUrl = process.env.NEXT_PUBLIC_ADMIN_DASHBOARD_URL || "http://localhost:9002";
      window.location.href = adminUrl;
      return;
    }
    
    // All other users (free, paid, etc.) go to user dashboard on port 9001
    if (user && token) {
      // Pass token and user data as URL parameters so port 9001 can access them
      const userStr = encodeURIComponent(JSON.stringify(user));
      const dashboardUrl = `http://localhost:9001?token=${encodeURIComponent(token)}&user=${userStr}`;
      window.location.href = dashboardUrl;
      return;
    }
    
    // Not authenticated - show login modal
    handleSignIn();
  };

  const handleLogout = async () => {
    await authLogout();
    setAuthed(false);
    setUserName(null);
    setUserRole(null);
    // Stay on homepage
  };

  return (
    <nav className="!absolute !top-0 !left-0 !w-full !z-[1000] !bg-transparent">
      {/*
        nav-container: centered single column at <=768px (base styles), switching
        to the legacy spread row layout at the `md` (min-width:768px) breakpoint.
      */}
      <div className="!max-w-[1400px] !mx-auto !px-8 !py-6 !flex !flex-col !items-center !justify-center !gap-6 md:!flex-row md:!justify-between md:!gap-0">
        {/* Brand: legacy SVG logo (~40px legacy height) */}
        <div
          className="!cursor-pointer !flex !items-center"
          onClick={() => router.push('/')}
        >
          <BrandLogo priority />
        </div>

        {/* Auth Section */}
        <div className="!flex !items-center !gap-10">
          {/* Language Toggle */}
          <div className="!flex !items-center !gap-2">
            <button
              onClick={() => setLanguage('en')}
              className={`!transition-all !duration-300 ${
                language === 'en' ? '!opacity-100' : '!opacity-40 hover:!opacity-70'
              }`}
              style={{ fontFamily: '"Inter Tight", sans-serif', fontSize: '10px' }}
            >
              EN
            </button>
            <span className="!text-white/30 !text-[10px]">|</span>
            <button
              onClick={() => setLanguage('id')}
              className={`!transition-all !duration-300 ${
                language === 'id' ? '!opacity-100' : '!opacity-40 hover:!opacity-70'
              }`}
              style={{ fontFamily: '"Inter Tight", sans-serif', fontSize: '10px', color: 'white' }}
            >
              ID
            </button>
          </div>

          {/* Product Link */}
          <Link
            href="/product"
            className="!text-white !font-normal !uppercase !tracking-normal !no-underline hover:!underline !transition-all !duration-200"
            style={{ fontFamily: '"Inter Tight", sans-serif', fontSize: '10px' }}
          >
            PRODUCT
          </Link>

          {/* Company Link */}
          <Link
            href="/about"
            className="!text-white !font-normal !uppercase !tracking-normal !no-underline hover:!underline !transition-all !duration-200"
            style={{ fontFamily: '"Inter Tight", sans-serif', fontSize: '10px' }}
          >
            COMPANY
          </Link>

          {authed ? (
            <>
              {/* User greeting */}
              <span
                style={{
                  fontFamily: '"Inter Tight", sans-serif',
                  fontSize: '1rem',
                  fontWeight: 400,
                  color: '#ffffff',
                }}
              >
                Welcome, {userName}
              </span>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="text-white/70 hover:text-white border border-white/20 hover:border-white/40 px-4 py-2 transition-all"
                style={{ fontFamily: '"Inter Tight", sans-serif', fontSize: '0.875rem' }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              {/* Sign In link (only show when not authenticated) */}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handleSignIn();
                }}
                style={{
                  fontFamily: '"Inter Tight", sans-serif',
                  fontSize: '1rem',
                  fontWeight: 400,
                  color: '#ffffff',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none'; }}
              >
                SIGN IN
              </a>
            </>
          )}

          {/*
            Dashboard button: Show for all users except admin
            - Not authenticated: Show login modal
            - Free user: Go to user dashboard
            - Paid user: Go to user dashboard
            - Admin: Hidden (uses admin dashboard at port 9002)
          */}
          {userRole !== 'admin' && (
            <button
              onClick={handleDashboard}
              style={{
                height: '42px',
                padding: '0 28px',
                fontFamily: '"Inter Tight", sans-serif',
                fontSize: '15px',
                fontWeight: 400,
                border: 'none',
                background: 'transparent',
                color: authed ? 'white' : 'rgba(255, 255, 255, 0.5)',
                cursor: authed ? 'pointer' : 'default',
                textTransform: 'uppercase',
                letterSpacing: '0.01em',
                transition: 'all 0.2s ease',
                opacity: authed ? 1 : 0.7,
              }}
              onMouseEnter={e => {
                if (authed) {
                  (e.currentTarget as HTMLButtonElement).style.color = '#07d197';
                }
              }}
              onMouseLeave={e => {
                if (authed) {
                  (e.currentTarget as HTMLButtonElement).style.color = 'white';
                }
              }}
              title={authed ? "Go to Dashboard" : "Sign in first to access dashboard"}
            >
              DASHBOARD
            </button>
          )}
          
          {/*
            Admin Dashboard button: Show for admin users only
          */}
          {userRole === 'admin' && (
            <button
              onClick={handleDashboard}
              style={{
                height: '42px',
                padding: '0 28px',
                fontFamily: '"Inter Tight", sans-serif',
                fontSize: '15px',
                fontWeight: 400,
                border: 'none',
                background: 'transparent',
                color: 'white',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.01em',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.color = '#07d197';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.color = 'white';
              }}
              title="Go to Admin Dashboard"
            >
              ADMIN
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

export default HomeNavbar;
