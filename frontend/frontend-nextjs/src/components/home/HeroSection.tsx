'use client';

import { useEffect, useRef } from 'react';
import RotatingText from './RotatingText';
import { TechnicalFrameButton } from '@/components/ui/TechnicalFrameButton';

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
    return () => window.removeEventListener('scroll', handleScroll);
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
        <div className="animate-slide-up-1 mb-4" style={{ animationDelay: '0.2s' }}>
          <h1
            className="silver-swipe-text text-[36px] md:text-[56px] font-light tracking-tight text-center leading-[1.1] pointer-events-none select-none"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            AI Infrastructure for Business Transformation
          </h1>
        </div>
        <div className="w-full animate-slide-up-2 pointer-events-none select-none" style={{ animationDelay: '0.4s' }}>
          <RotatingText />
        </div>
        <div className="animate-slide-up-3 pointer-events-none" style={{ animationDelay: '0.6s' }}>
          <TechnicalFrameButton
            href="/free-diagnostic"
            className="pointer-events-auto w-fit animate-gentle-bounce"
          >
            START WITH FREE ASSESSMENT
          </TechnicalFrameButton>
        </div>
      </div>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center z-20 pointer-events-none opacity-0 animate-fade-in" style={{ animationDelay: '3.5s', animationFillMode: 'forwards' }}>
        <div className="flex flex-col items-center animate-pulse" style={{ animationDuration: '1.5s' }}>
          <div className="w-[1px] h-10 md:h-16 bg-gradient-to-b from-transparent to-white" />
          <span className="text-[10px] text-white tracking-[0.35em] font-light uppercase my-4 font-manrope">
            SCROLL TO EXPLORE
          </span>
          <div className="w-[1px] h-10 md:h-16 bg-gradient-to-t from-transparent to-white" />
        </div>
      </div>
    </div>
  );
}
