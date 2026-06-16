'use client';

import { useEffect, useRef } from 'react';
import GridOverlay from './GridOverlay';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import RotatingText from './RotatingText';

export default function HeroSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const darkCellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const CW = 120;
    const CH = 120;

    const positionDarkCell = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const offsetX = (w / 2) % CW;
      const offsetY = (h / 2) % CH;
      const colCount = Math.ceil(w / CW);
      const rowCount = Math.ceil(h / CH);
      // last full cell x position
      const cellX = (colCount - 1) * CW + offsetX;
      const cellY = (rowCount - 1) * CH + offsetY;
      if (darkCellRef.current) {
        darkCellRef.current.style.left = `${cellX}px`;
        darkCellRef.current.style.top = `${cellY}px`;
        darkCellRef.current.style.width = `${CW}px`;
        darkCellRef.current.style.height = `${CH}px`;
      }
    };

    positionDarkCell();
    window.addEventListener('resize', positionDarkCell);

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const y = window.scrollY;
          if (videoRef.current) {
            videoRef.current.style.transform = `translateY(${y * 0.6}px)`;
          }
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
      window.removeEventListener('resize', positionDarkCell);
    };
  }, []);

  return (
    <div
      className="relative w-full min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{ background: '#030408' }}
    >
      {/* Background Video */}
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover z-0"
        style={{ willChange: 'transform' }}
      >
        <source src="/hero-video/Hero%20Aivory%20black%20sphere%202%20optimized.mp4" type="video/mp4" />
      </video>

      {/* Grid Overlay with random fade (hero only) */}
      <GridOverlay />

      {/* Content */}
      <div
        ref={contentRef}
        className="relative z-10 flex flex-col items-center justify-center text-center w-full max-w-4xl px-5 md:px-8 pt-16 pb-16 md:pt-24 md:pb-24"
        style={{ willChange: 'transform' }}
      >
        <h1
          className="text-[36px] md:text-[56px] font-light mb-4 tracking-tight text-white/90 text-center leading-[1.1] animate-slide-up-1"
          style={{ fontFamily: "'Manrope', sans-serif", animationDelay: '2s' }}
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
        <div className="w-full animate-slide-up-2" style={{ animationDelay: '2.4s' }}>
          <RotatingText />
        </div>

        {/* CTA Button */}
        <div className="animate-slide-up-3" style={{ animationDelay: '2.8s' }}>
          <a
            href="/free-diagnostic"
            className="inline-flex items-center gap-3 text-white no-underline uppercase cursor-pointer transition-all duration-[250ms] border border-white/20 bg-black/60 hover:bg-white hover:text-black hover:border-white animate-gentle-bounce min-h-[44px]"
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
              className="w-4 h-4"
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
          <span className="text-[10px] text-[#c4c9b8] tracking-[0.35em] font-light uppercase my-4 font-manrope">
            SCROLL TO EXPLORE
          </span>
          <div className="w-[1px] h-10 md:h-16 bg-gradient-to-t from-transparent to-white/80" />
        </div>
      </div>
      {/* Fixed dark grid cell — canvas is clipped to never draw here; CSS div is fully opaque */}
      <div
        ref={darkCellRef}
        className="absolute pointer-events-none"
        style={{
          backgroundColor: '#030408', // matches hero background
          opacity: 0.98,
          zIndex: 2,
        }}
      />
    </div>
  );
}
