'use client';

/**
 * HomePageClient
 * Client-side wrapper for the homepage that handles client-only functionality
 * like login modal triggers and authentication events.
 */

import React, { useEffect, useState } from 'react';
import { LoginModal } from '@/components/auth/login-modal';

export function HomePageClient() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  useEffect(() => {
    // Listen for login modal open event
    const handleOpenLoginModal = () => {
      setIsLoginModalOpen(true);
    };

    const handleCloseLoginModal = () => {
      setIsLoginModalOpen(false);
    };

    window.addEventListener('openLoginModal', handleOpenLoginModal);
    window.addEventListener('closeLoginModal', handleCloseLoginModal);

    return () => {
      window.removeEventListener('openLoginModal', handleOpenLoginModal);
      window.removeEventListener('closeLoginModal', handleCloseLoginModal);
    };
  }, []);

  return (
    <LoginModal 
      isOpen={isLoginModalOpen} 
      onClose={() => setIsLoginModalOpen(false)} 
    />
  );
}

export default HomePageClient;
