'use client';

import { useEffect, useRef } from 'react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import RotatingText from './RotatingText';

export default function HeroSection() {
  const contentRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLAnchorElement>(null);

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

  useEffect(() => {
    const startTime = Math.random() * 10000;
    let animationFrameId: number;
    let isHovering = false;

    const animate = (time: number) => {
      if (btnRef.current && !isHovering) {
        const rect = btnRef.current.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const radiusX = rect.width / 2;
        const radiusY = rect.height / 2;
        const speed = 0.004;
        const angle = (time + startTime) * speed;

        const x = centerX + radiusX * Math.cos(angle);
        const y = centerY - radiusY * Math.sin(angle);

        btnRef.current.style.setProperty('--mouse-x', `${x}px`);
        btnRef.current.style.setProperty('--mouse-y', `${y}px`);
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    const el = btnRef.current;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      el.style.setProperty('--mouse-x', `${x}px`);
      el.style.setProperty('--mouse-y', `${y}px`);
    };

    if (el) {
      el.addEventListener('mouseenter', () => (isHovering = true));
      el.addEventListener('mouseleave', () => (isHovering = false));
      el.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (el) {
        el.removeEventListener('mouseenter', () => (isHovering = true));
        el.removeEventListener('mouseleave', () => (isHovering = false));
        el.removeEventListener('mousemove', handleMouseMove);
      }
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
        <div className="animate-slide-up-1 mb-4" style={{ animationDelay: '0.2s' }}>
          <h1
            className="silver-swipe-text text-[36px] md:text-[56px] font-light tracking-tight text-center leading-[1.1] pointer-events-none select-none"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            Make AI make sense
            <span
              style={{
                fontSize: '0.7em',
                verticalAlign: '0.2em',
              }}
            >
              ®
            </span>
            <br />
            for your business
          </h1>
        </div>

        {/* Rotating subtitle with initial slide up */}
        <div className="w-full animate-slide-up-2 pointer-events-none select-none" style={{ animationDelay: '0.4s' }}>
          <RotatingText />
        </div>

        {/* CTA Button */}
        <div className="animate-slide-up-3 pointer-events-none" style={{ animationDelay: '0.6s' }}>
          <a
            ref={btnRef}
            href="/free-diagnostic"
            className="inline-flex items-center gap-3 text-white no-underline uppercase cursor-pointer transition-all duration-500 animate-gentle-bounce min-h-[44px] pointer-events-auto spotlight-card auto-spotlight rounded-[24px] border-t border-l border-white/10 border-b border-r border-black/20 shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:-translate-y-1 hover:border-white/10 hover:shadow-[0_0_30px_rgba(174,201,157,0.05)]"
            style={{
              padding: '0.75rem 1.5rem',
              fontFamily: "'Manrope', sans-serif",
              fontWeight: 400,
              fontSize: '0.75rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              backgroundColor: 'var(--card-bg, rgba(20, 20, 26, 0.78))',
              backdropFilter: 'var(--card-frost, none)',
              WebkitBackdropFilter: 'var(--card-frost, none)'
            }}
          >
            <svg
              className="w-4 h-4 text-[#a3aa96] relative z-10"
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
            <span className="relative z-10">START WITH FREE ASSESSMENT</span>
          </a>
        </div>
      </div>

      {/* Scroll to Explore Indicator */}
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
