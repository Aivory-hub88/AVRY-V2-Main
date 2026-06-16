/**
 * Navbar Component
 * 
 * A navigation bar component with authentication state integration, language toggle,
 * and tier indicator. Integrates with AuthManager for authentication and UserStateManager
 * for user tier information.
 * 
 * @example
 * // Basic usage
 * <Navbar />
 * 
 * // With custom className
 * <Navbar className="custom-nav" />
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { isAuthenticated, logout, getUser } from '@/lib/auth';
import { getUserTier, getLanguage, getUserPreferences } from '@/lib/user-state';
import { getTranslations, Language, Translations } from '@/lib/translations';

export interface NavbarProps {
  className?: string;
}

/**
 * Navbar component with authentication, language toggle, and tier indicator
 * 
 * @param className - Additional CSS classes to apply
 * 
 * @returns React component
 */
export function Navbar({ className = '' }: NavbarProps) {
  const [isAuthenticatedUser, setIsAuthenticatedUser] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);
  const [userTier, setUserTier] = useState<string>('free');
  const [currentLanguage, setCurrentLanguage] = useState<Language>('en');
  const [translations, setTranslations] = useState<Translations>(getTranslations('en'));
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  // Initialize auth state and language
  useEffect(() => {
    // Set initial auth state
    const authState = isAuthenticated();
    setIsAuthenticatedUser(authState);
    
    if (authState) {
      const userData = getUser();
      setUser(userData);
    }
    
    // Set initial language
    const lang = getLanguage();
    setCurrentLanguage(lang);
    setTranslations(getTranslations(lang));
    
    // Set initial tier
    const tier = getUserTier();
    setUserTier(tier);
    
    // Listen for AuthManager events
    const handleAuthChange = () => {
      const newAuthState = isAuthenticated();
      setIsAuthenticatedUser(newAuthState);
      
      if (newAuthState) {
        const userData = getUser();
        setUser(userData);
      } else {
        setUser(null);
      }
    };
    
    // Listen for UserStateManager events
    const handleUserStateChange = () => {
      const tier = getUserTier();
      setUserTier(tier);
    };
    
    // Listen for language changes
    const handleLanguageChange = () => {
      const lang = getLanguage();
      setCurrentLanguage(lang);
      setTranslations(getTranslations(lang));
    };
    
    // Check if AuthManager is available and attach listeners
    if (typeof window !== 'undefined' && window.AuthManager) {
      window.AuthManager.on('authChange', handleAuthChange);
    }
    
    if (typeof window !== 'undefined' && window.UserStateManager) {
      window.UserStateManager.on('userStateChange', handleUserStateChange);
    }
    
    if (typeof window !== 'undefined' && window.UserStateManager) {
      window.UserStateManager.on('preferencesChange', handleLanguageChange);
    }
    
    return () => {
      if (typeof window !== 'undefined' && window.AuthManager) {
        window.AuthManager.off('authChange', handleAuthChange);
      }
      
      if (typeof window !== 'undefined' && window.UserStateManager) {
        window.UserStateManager.off('userStateChange', handleUserStateChange);
        window.UserStateManager.off('preferencesChange', handleLanguageChange);
      }
    };
  }, []);

  // Handle language toggle
  const toggleLanguage = () => {
    const newLanguage = currentLanguage === 'en' ? 'id' : 'en';
    setCurrentLanguage(newLanguage);
    setTranslations(getTranslations(newLanguage));
    
    // Update user preferences
    if (typeof window !== 'undefined' && window.UserStateManager) {
      window.UserStateManager.updatePreferences({
        language: newLanguage,
      });
    }
  };

  // Handle sign in
  const handleSignIn = () => {
    if (typeof window !== 'undefined' && window.AuthManager) {
      window.AuthManager.login();
    }
  };

  // Handle sign out
  const handleSignOut = () => {
    if (typeof window !== 'undefined' && window.AuthManager) {
      window.AuthManager.logout();
    }
  };

  // Get navigation links based on authentication state
  const getNavLinks = (): { label: string; href: string; active: boolean }[] => {
    // Operational dashboard/logs routes now live in the product app
    // (dashboard.aivory.id) and are no longer served by the marketing site,
    // so they are not linked from the marketing navbar.
    const links = [
      { label: translations.nav.learnMore, href: '#', active: false },
    ];

    return links;
  };

  const navLinks = getNavLinks();

  return (
    <nav 
      className={`sticky top-0 z-50 w-full border-b border-border-default bg-bg-primary/95 backdrop-blur supports-[backdrop-filter]:bg-bg-primary/60 ${className}`}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Link 
              href="/"
              className="flex items-center gap-2 font-semibold text-text-primary hover:text-brand-mint transition-colors"
              aria-label="Aivory Home"
            >
              <span className="text-xl">AI</span>
              <span className="text-lg">Vory</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-brand-mint ${
                  link.active 
                    ? 'text-brand-mint' 
                    : 'text-text-secondary'
                }`}
                aria-current={link.active ? 'page' : undefined}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-4">
            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
              aria-label={`Switch to ${currentLanguage === 'en' ? 'Indonesian' : 'English'}`}
              aria-pressed={currentLanguage === 'id'}
              type="button"
            >
              <span className="text-lg">
                {currentLanguage === 'en' ? '🇺🇸' : '🇮🇩'}
              </span>
              <span className="hidden sm:inline">
                {currentLanguage === 'en' ? 'EN' : 'ID'}
              </span>
            </button>

            {/* Tier Indicator */}
            {isAuthenticatedUser && (
              <div 
                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-tertiary border border-border-subtle"
                role="status"
                aria-label={`User tier: ${userTier}`}
              >
                <span className="text-xs font-medium text-text-secondary">
                  {translations.nav.dashboard}
                </span>
                <span className="text-xs font-semibold text-brand-mint">
                  {userTier.toUpperCase()}
                </span>
              </div>
            )}

            {/* Auth Button */}
            {isAuthenticatedUser ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                type="button"
              >
                {user?.name || user?.email || 'Sign Out'}
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={handleSignIn}
                type="button"
              >
                {translations.nav.signIn}
              </Button>
            )}

            {/* Mobile Menu Button */}
            <button
              className="md:hidden flex items-center justify-center p-2 text-text-secondary hover:text-text-primary transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
              aria-expanded={isMenuOpen}
              type="button"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {isMenuOpen ? (
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                ) : (
                  <>
                    <line x1="4" y1="12" x2="20" y2="12"></line>
                    <line x1="4" y1="6" x2="20" y2="6"></line>
                    <line x1="4" y1="18" x2="20" y2="18"></line>
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-border-default bg-bg-primary">
          <div className="container mx-auto px-4 py-4 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`block px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  link.active
                    ? 'bg-bg-tertiary text-brand-mint'
                    : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                }`}
                aria-current={link.active ? 'page' : undefined}
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}

            {/* Mobile Tier Indicator */}
            {isAuthenticatedUser && (
              <div className="flex items-center justify-between px-4 py-2">
                <span className="text-sm text-text-secondary">
                  {translations.nav.dashboard}
                </span>
                <span className="text-sm font-semibold text-brand-mint">
                  {userTier.toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
