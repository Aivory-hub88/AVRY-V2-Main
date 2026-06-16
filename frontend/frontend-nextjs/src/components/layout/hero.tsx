'use client';

/**
 * Hero Component — carbon copy of live-frontend-repo/index.html hero section.
 *
 * Background layers (bottom → top):
 *   1. <video>  autoplay muted loop  (z-index: 0)
 *   2. <canvas> grid overlay 5×8 with random dark cells + crosshairs (z-index: 1, opacity:0.7)
 * Content (z-index: 10):
 *   - H1 "Make AI make sense."
 *   - Rotating subheadline (crossfade + vertical shift, 4.5 s)
 *   - Ghost-border CTA button
 */

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';

export interface HeroProps {
  className?: string;
}

/* ── Grid overlay — exact port from live index.html hero canvas ── */
function HeroGridCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const context = ctx;
    const c = canvas;

    const COLS = 5, ROWS = 8;
    const cells = Array.from({ length: COLS * ROWS }, () => ({
      opacity: 0, target: 0, speed: 0.02 + Math.random() * 0.03,
    }));

    // Lock one cell behind the button (col 2, row 5 in 5×8 grid)
    const lockedCell = 5 * COLS + 2;
    cells[lockedCell].opacity = 1;
    cells[lockedCell].target = 1;
    cells[lockedCell].speed = 0;

    const resize = () => { c.width = c.offsetWidth; c.height = c.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);

    const interval = setInterval(() => {
      cells.forEach((cell, i) => {
        if (i === lockedCell) return;
        cell.target = Math.random() < 0.5 ? 0 : 0.6 + Math.random() * 0.4;
      });
    }, 170);

    let raf: number;
    function draw() {
      context.clearRect(0, 0, c.width, c.height);
      const cw = c.width / COLS, ch = c.height / ROWS;

      cells.forEach((cell, i) => {
        if (cell.opacity < cell.target) cell.opacity = Math.min(cell.opacity + cell.speed, cell.target);
        else if (cell.opacity > cell.target) cell.opacity = Math.max(cell.opacity - cell.speed, cell.target);
        if (cell.opacity > 0.01) {
          context.fillStyle = `rgba(0,0,0,${cell.opacity})`;
          context.fillRect((i % COLS) * cw, Math.floor(i / COLS) * ch, cw, ch);
        }
      });

      // Grid lines
      context.strokeStyle = 'rgba(255,255,255,0.08)';
      context.lineWidth = 1;
      for (let x = 0; x <= COLS; x++) { context.beginPath(); context.moveTo(x * cw, 0); context.lineTo(x * cw, c.height); context.stroke(); }
      for (let y = 0; y <= ROWS; y++) { context.beginPath(); context.moveTo(0, y * ch); context.lineTo(c.width, y * ch); context.stroke(); }

      // Cross markers
      context.strokeStyle = 'rgba(255,255,255,0.25)';
      context.lineWidth = 1;
      const cs = 4;
      for (let x = 0; x <= COLS; x++) {
        for (let y = 0; y <= ROWS; y++) {
          const px = x * cw, py = y * ch;
          context.beginPath(); context.moveTo(px - cs, py); context.lineTo(px + cs, py); context.stroke();
          context.beginPath(); context.moveTo(px, py - cs); context.lineTo(px, py + cs); context.stroke();
        }
      }
      raf = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      clearInterval(interval);
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="hero-grid-overlay"
      aria-hidden="true"
      style={{
        position: 'absolute', top: 0, left: 0,
        width: '100%', height: '100%',
        zIndex: 1, pointerEvents: 'none', opacity: 0.7,
      }}
    />
  );
}

/* ── Rotating subheadline ── */
const MESSAGES = [
  'Start with clarity.<br>End with a system that runs.',
  'Know what to build.<br>Before you build anything.',
  'Discover where AI creates value.',
  'Turn AI ambition into execution.',
  'From opportunity to operation.',
  'AI made practical.<br>Built for real business outcomes.',
];

function RotatingSubheadline() {
  const textRef = useRef<HTMLParagraphElement>(null);
  const indexRef = useRef(0);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;

    const rotate = () => {
      // Fade out + slide up
      el.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
      el.style.opacity = '0';
      el.style.transform = 'translateY(calc(-50% - 14px))';

      setTimeout(() => {
        indexRef.current = (indexRef.current + 1) % MESSAGES.length;
        el.innerHTML = MESSAGES[indexRef.current];
        // Snap to below-center, no transition
        el.style.transition = 'none';
        el.style.transform = 'translateY(calc(-50% + 14px))';
        el.style.opacity = '0';
        // Force reflow
        void el.offsetHeight;
        // Fade in + slide to center
        el.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
        el.style.opacity = '1';
        el.style.transform = 'translateY(-50%)';
      }, 500);
    };

    const id = setInterval(rotate, 4500);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      id="hero-rotating-container"
      style={{ position: 'relative', height: '5.5rem', overflow: 'hidden', width: '100%', marginBottom: '2.5rem' }}
    >
      <p
        ref={textRef}
        id="hero-rotating-text"
        style={{
          fontFamily: 'Manrope, sans-serif',
          fontSize: 'clamp(21px, 3.3vw, 33.6px)',
          fontWeight: 400,
          color: '#57ffdf',
          textAlign: 'center',
          width: '100%',
          position: 'absolute',
          top: '50%',
          left: 0,
          right: 0,
          margin: 0,
          lineHeight: 1.25,
          transform: 'translateY(-50%)',
          opacity: 1,
          transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
        }}
        dangerouslySetInnerHTML={{ __html: MESSAGES[0] }}
      />
    </div>
  );
}

/* ── Hero ── */
export function Hero({ className = '' }: HeroProps) {
  return (
    <section
      id="hero"
      className={`relative w-full min-h-screen flex flex-col items-center justify-center overflow-hidden ${className}`}
      style={{ background: '#030408' }}
      aria-label="Hero"
    >
      {/* Video background */}
      <video
        autoPlay muted loop playsInline
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0, pointerEvents: 'none' }}
        aria-hidden="true"
      >
        <source src="/videos/hero-video.mp4" type="video/mp4" />
      </video>

      {/* Grid overlay — live site hero canvas */}
      <HeroGridCanvas />

      {/* Content */}
      <div
        className="relative flex flex-col items-center justify-center text-center w-full max-w-4xl"
        style={{ padding: '6rem 2rem', zIndex: 10 }}
      >
        <h1
          className="text-center mb-2 tracking-tight"
          style={{
            fontFamily: 'Manrope, sans-serif',
            fontSize: 'clamp(33.6px, 4.9vw, 50.4px)',
            fontWeight: 400,
            color: 'rgba(255,255,255,0.9)',
            letterSpacing: '-0.025em',
          }}
        >
          Make AI make sense<span style={{ color: '#00e59e' }}>.</span>
        </h1>

        <RotatingSubheadline />

        {/* Ghost-border CTA */}
        <Link
          href="/diagnostic"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.625rem 1.25rem',
            border: '1px solid rgba(255,255,255,0.6)',
            background: 'transparent',
            color: 'white',
            textDecoration: 'none',
            fontFamily: 'Manrope, sans-serif',
            fontWeight: 300,
            fontSize: '0.625rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            transition: 'all 0.25s ease',
            cursor: 'pointer',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLAnchorElement;
            el.style.background = 'white';
            el.style.color = 'black';
            el.style.borderColor = 'white';
            const arrow = el.querySelector<HTMLSpanElement>('.hero-btn-arrow');
            if (arrow) arrow.style.color = 'black';
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLAnchorElement;
            el.style.background = 'transparent';
            el.style.color = 'white';
            el.style.borderColor = 'rgba(255,255,255,0.6)';
            const arrow = el.querySelector<HTMLSpanElement>('.hero-btn-arrow');
            if (arrow) arrow.style.color = 'white';
          }}
        >
          START WITH FREE DIAGNOSTIC
          <span className="hero-btn-arrow" style={{ color: 'white', fontSize: '0.75rem', transition: 'color 0.25s ease' }}>→</span>
        </Link>
      </div>
    </section>
  );
}

export default Hero;
