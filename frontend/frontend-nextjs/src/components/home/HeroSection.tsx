'use client';

import { useEffect, useRef } from 'react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import RotatingText from './RotatingText';

export default function HeroSection() {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const y = window.scrollY;
          if (contentRef.current) {
            contentRef.current.style.transform = `translateY(${y * -0.35}px)`;
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div
      className="relative w-full min-h-screen flex flex-col items-center justify-center overflow-hidden pointer-events-none"
      style={{ background: 'transparent' }}
    >
      <div
        ref={contentRef}
        className="relative z-10 flex flex-col items-center justify-center text-center w-full max-w-4xl px-5 md:px-8 pt-16 pb-16 md:pt-24 md:pb-24"
        style={{ willChange: 'transform' }}
      >
        <h1
          className="text-[36px] md:text-[56px] font-light mb-4 tracking-tight text-white/90 text-center leading-[1.1] animate-slide-up-1 pointer-events-none select-none"
          style={{ fontFamily: "'Manrope', sans-serif", animationDelay: '0.2s' }}
        >
          Make AI make sense
          <span
            style={{
              fontSize: '0.35em',
              verticalAlign: 'middle',
              position: 'relative',
              top: '-0.3em',
            }}
          >
            ®
          </span>
          <br />
          for your business
        </h1>

        {/* Rotating subtitle with initial slide up */}
        <div className="w-full animate-slide-up-2 pointer-events-none select-none" style={{ animationDelay: '0.4s' }}>
          <RotatingText />
        </div>

        {/* CTA Button */}
        <div className="animate-slide-up-3 pointer-events-none" style={{ animationDelay: '0.6s' }}>
          <a
            href="/free-diagnostic"
            className="inline-flex items-center gap-3 text-white no-underline uppercase cursor-pointer transition-all duration-[250ms] border border-white/20 bg-black/20 hover:border-[#a3aa96] hover:bg-white/5 animate-gentle-bounce min-h-[44px] pointer-events-auto"
            style={{
              padding: '0.75rem 1.5rem',
              fontFamily: "'Manrope', sans-serif",
              fontWeight: 400,
              fontSize: '0.75rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            <svg
              className="w-4 h-4 text-[#a3aa96]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 7v10H7" />
              <path d="M7 7l10 10" />
            </svg>
            START WITH FREE DIAGNOSTIC
          </a>
        </div>
      </div>

      {/* Scroll to Explore Indicator */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center z-20 pointer-events-none opacity-0 animate-fade-in" style={{ animationDelay: '3.5s', animationFillMode: 'forwards' }}>
        <div className="flex flex-col items-center animate-pulse" style={{ animationDuration: '3s' }}>
          <div className="w-[1px] h-10 md:h-16 bg-gradient-to-b from-transparent to-white/80" />
          <span className="text-[10px] text-[#dfe2d8] tracking-[0.35em] font-light uppercase my-4 font-manrope">
            SCROLL TO EXPLORE
          </span>
          <div className="w-[1px] h-10 md:h-16 bg-gradient-to-t from-transparent to-white/80" />
        </div>
      </div>
    </div>
  );
}
