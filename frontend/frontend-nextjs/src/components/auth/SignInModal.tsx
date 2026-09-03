'use client';

import { useState, useEffect, useRef, MouseEvent } from 'react';
import Image from 'next/image';
import { login } from '@/lib/auth';
import { SpotlightButton } from '@/components/ui/SpotlightButton';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SignInModal({ isOpen, onClose }: SignInModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: MouseEvent) => {
    if (!modalRef.current) return;
    const rect = modalRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    modalRef.current.style.setProperty('--mouse-x', `${x}px`);
    modalRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(formData.email, formData.password);
      onClose();
      window.location.href = '/';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div 
        ref={modalRef}
        onMouseMove={handleMouseMove}
        className="relative spotlight-card w-full max-w-[420px] bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl p-8 sm:p-10 animate-in fade-in zoom-in-95 duration-200"
      >
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-white/60 hover:text-white transition-colors p-1"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <Image
              src="/aivory-logo.svg"
              alt="Aivory Logo"
              width={100}
              height={32}
              className="h-[32px] w-auto opacity-90"
            />
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2 tracking-tight" style={{ fontFamily: "var(--font-manrope), 'Manrope', sans-serif" }}>
            Welcome back
          </h2>
          <p className="text-[#b2cca2] text-sm font-light">
            Only subscribed users can access their workspace.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-[13px] font-medium text-white/85 mb-2">
              Email address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="name@company.com"
              required
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-lg text-white placeholder-white/20 focus:outline-none focus:border-[#c4c9b8] focus:ring-1 focus:ring-[#c4c9b8] transition-all text-sm"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="password" className="block text-[13px] font-medium text-white/85">
                Password
              </label>
              <a href="#" className="text-[12px] text-[#b2cca2] hover:text-white transition-colors">
                Forgot password?
              </a>
            </div>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-lg text-white placeholder-white/20 focus:outline-none focus:border-[#c4c9b8] focus:ring-1 focus:ring-[#c4c9b8] transition-all text-sm tracking-widest"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center" role="alert">{error}</p>
          )}
          <SpotlightButton
            type="submit"
            disabled={isLoading}
            roundedClass="rounded-[8px]"
            className="w-full mt-2"
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-white/50"><path d="M7 7l10 10M17 7v10H7" /></svg>
            }
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </SpotlightButton>
        </form>

        <div className="mt-8 text-center">
          <p className="text-[13px] text-white/60">
            Don&apos;t have a subscription yet?{' '}
            <a href="/product" className="text-white hover:text-[#b2cca2] transition-colors font-medium">
              Explore plans &rarr;
            </a>
          </p>
        </div>

      </div>
    </div>
  );
}
