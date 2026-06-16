'use client';

/**
 * FeaturesSection
 * Carbon-copy of live-frontend-repo/index.html homepage features block.
 * - "AI is ready" text section with grid overlay
 * - "Turn your AI Confusion" heading + 6 sticky GSAP stacking cards
 * Container: max-width 1160px, padding 0 24px  (matches live site exactly)
 * Grid overlay: 5 cols × 8 rows, dark cells rgba(25,25,25), white crosshairs
 * Cards: position:sticky top:12vh, margin-bottom:80px, gradient bg
 */

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* ─── Grid overlay canvas — exact port from live index.html ─── */
function GridCanvas({ id, opacity = 0.45 }: { id: string; opacity?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Keep a non-null reference for use inside draw()
    const context = ctx;
    // Capture non-null canvas reference for draw closure
    const c = canvas;

    const COLS = 5, ROWS = 8;
    const cells = Array.from({ length: COLS * ROWS }, () => ({
      opacity: 0, target: 0, speed: 0.015 + Math.random() * 0.025,
    }));

    const resize = () => { c.width = c.offsetWidth; c.height = c.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);

    const interval = setInterval(() => {
      cells.forEach(cell => { cell.target = Math.random() < 0.6 ? 0 : 0.4 + Math.random() * 0.3; });
    }, 200);

    let raf: number;
    function draw() {
      context.clearRect(0, 0, c.width, c.height);
      const cw = c.width / COLS, ch = c.height / ROWS;

      // Dark flickering cells
      cells.forEach((cell, i) => {
        if (cell.opacity < cell.target) cell.opacity = Math.min(cell.opacity + cell.speed, cell.target);
        else if (cell.opacity > cell.target) cell.opacity = Math.max(cell.opacity - cell.speed, cell.target);
        if (cell.opacity > 0.01) {
          context.fillStyle = `rgba(25,25,25,${cell.opacity})`;
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
      id={id}
      aria-hidden="true"
      style={{
        position: 'absolute', top: 0, left: 0,
        width: '100%', height: '100%',
        zIndex: 0, pointerEvents: 'none', opacity,
      }}
    />
  );
}

/* ─── SVG Diagrams ─── */

const DiagramDiscover = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.06)', padding: '10px 6px', border: '1px solid rgba(255,255,255,0.12)' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /></svg>
      <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', fontFamily: "'Manrope',sans-serif", fontWeight: 300 }}>Analysis</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.06)', padding: '10px 6px', border: '1px solid rgba(255,255,255,0.12)' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /></svg>
      <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', fontFamily: "'Manrope',sans-serif", fontWeight: 300 }}>Data</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.06)', padding: '10px 6px', border: '1px solid rgba(255,255,255,0.12)' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2v20M2 12h20" /></svg>
      <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', fontFamily: "'Manrope',sans-serif", fontWeight: 300 }}>Plan</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.06)', padding: '10px 6px', border: '1px solid rgba(255,255,255,0.12)' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 11l3 3L22 4" /></svg>
      <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', fontFamily: "'Manrope',sans-serif", fontWeight: 300 }}>Ready</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.06)', padding: '10px 6px', border: '1px solid rgba(255,255,255,0.12)' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 12a8 8 0 0 1 8-8 8 8 0 0 1 8 8" /></svg>
      <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', fontFamily: "'Manrope',sans-serif", fontWeight: 300 }}>Track</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.06)', padding: '10px 6px', border: '1px solid rgba(255,255,255,0.12)' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 5v14M5 12h14" /></svg>
      <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', fontFamily: "'Manrope',sans-serif", fontWeight: 300 }}>Grow</span>
    </div>
  </div>
);

const DiagramDesign = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.06)', padding: '10px 6px', border: '1px solid rgba(255,255,255,0.12)' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" /></svg>
      <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', fontFamily: "'Manrope',sans-serif", fontWeight: 300 }}>Score</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.06)', padding: '10px 6px', border: '1px solid rgba(255,255,255,0.12)' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /></svg>
      <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', fontFamily: "'Manrope',sans-serif", fontWeight: 300 }}>KPI</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.06)', padding: '10px 6px', border: '1px solid rgba(255,255,255,0.12)' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2v20M2 12h20" /></svg>
      <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', fontFamily: "'Manrope',sans-serif", fontWeight: 300 }}>Build</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.06)', padding: '10px 6px', border: '1px solid rgba(255,255,255,0.12)' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 9l6 6 6-6" /></svg>
      <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', fontFamily: "'Manrope',sans-serif", fontWeight: 300 }}>Deploy</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.06)', padding: '10px 6px', border: '1px solid rgba(255,255,255,0.12)' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3.05h16.94a2 2 0 0 0 1.71-3.05L13.71 3.86a2 2 0 0 0-3.42 0z" /></svg>
      <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', fontFamily: "'Manrope',sans-serif", fontWeight: 300 }}>Alert</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.06)', padding: '10px 6px', border: '1px solid rgba(255,255,255,0.12)' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 8v8M8 12h8" /></svg>
      <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', fontFamily: "'Manrope',sans-serif", fontWeight: 300 }}>More</span>
    </div>
  </div>
);

const DiagramPlan = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.06)', padding: '10px 6px', border: '1px solid rgba(255,255,255,0.12)' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" /></svg>
      <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', fontFamily: "'Manrope',sans-serif", fontWeight: 300 }}>Phase 1</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.06)', padding: '10px 6px', border: '1px solid rgba(255,255,255,0.12)' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" /></svg>
      <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', fontFamily: "'Manrope',sans-serif", fontWeight: 300 }}>Phase 2</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.06)', padding: '10px 6px', border: '1px solid rgba(255,255,255,0.12)' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" /></svg>
      <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', fontFamily: "'Manrope',sans-serif", fontWeight: 300 }}>Phase 3</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.06)', padding: '10px 6px', border: '1px solid rgba(255,255,255,0.12)' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2v20M2 12h20" /></svg>
      <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', fontFamily: "'Manrope',sans-serif", fontWeight: 300 }}>Milestone</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.06)', padding: '10px 6px', border: '1px solid rgba(255,255,255,0.12)' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /></svg>
      <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', fontFamily: "'Manrope',sans-serif", fontWeight: 300 }}>Roadmap</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.06)', padding: '10px 6px', border: '1px solid rgba(255,255,255,0.12)' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 8v8M8 12h8" /></svg>
      <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', fontFamily: "'Manrope',sans-serif", fontWeight: 300 }}>More</span>
    </div>
  </div>
);

const DiagramBuild = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.06)', padding: '10px 6px', border: '1px solid rgba(255,255,255,0.12)' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M23 7l-7 5 7 5V7z" /></svg>
      <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', fontFamily: "'Manrope',sans-serif", fontWeight: 300 }}>Trigger</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.06)', padding: '10px 6px', border: '1px solid rgba(255,255,255,0.12)' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4h16v16H4z" /></svg>
      <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', fontFamily: "'Manrope',sans-serif", fontWeight: 300 }}>Configure</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.06)', padding: '10px 6px', border: '1px solid rgba(255,255,255,0.12)' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 11l3 3L22 4" /></svg>
      <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', fontFamily: "'Manrope',sans-serif", fontWeight: 300 }}>Execute</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.06)', padding: '10px 6px', border: '1px solid rgba(255,255,255,0.12)' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
      <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', fontFamily: "'Manrope',sans-serif", fontWeight: 300 }}>Notify</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.06)', padding: '10px 6px', border: '1px solid rgba(255,255,255,0.12)' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /></svg>
      <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', fontFamily: "'Manrope',sans-serif", fontWeight: 300 }}>Log</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.06)', padding: '10px 6px', border: '1px solid rgba(255,255,255,0.12)' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 8v8M8 12h8" /></svg>
      <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', fontFamily: "'Manrope',sans-serif", fontWeight: 300 }}>More</span>
    </div>
  </div>
);

const DiagramDeploy = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.06)', padding: '10px 6px', border: '1px solid rgba(255,255,255,0.12)' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4h16v16H4z" /></svg>
      <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', fontFamily: "'Manrope',sans-serif", fontWeight: 300 }}>Gmail</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.06)', padding: '10px 6px', border: '1px solid rgba(255,255,255,0.12)' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
      <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', fontFamily: "'Manrope',sans-serif", fontWeight: 300 }}>Slack</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.06)', padding: '10px 6px', border: '1px solid rgba(255,255,255,0.12)' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" /></svg>
      <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', fontFamily: "'Manrope',sans-serif", fontWeight: 300 }}>Telegram</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.06)', padding: '10px 6px', border: '1px solid rgba(255,255,255,0.12)' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2z" /></svg>
      <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', fontFamily: "'Manrope',sans-serif", fontWeight: 300 }}>HubSpot</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.06)', padding: '10px 6px', border: '1px solid rgba(255,255,255,0.12)' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /></svg>
      <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', fontFamily: "'Manrope',sans-serif", fontWeight: 300 }}>CRM</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.06)', padding: '10px 6px', border: '1px solid rgba(255,255,255,0.12)' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 8v8M8 12h8" /></svg>
      <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', fontFamily: "'Manrope',sans-serif", fontWeight: 300 }}>More</span>
    </div>
  </div>
);

const DiagramAccelerate = () => (
  <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }} className="diagram-accelerate">
    {/* 50+ badge */}
    <div style={{ position: 'absolute', top: '12px', right: '12px', background: '#111', color: '#0ae8af', fontSize: '10px', fontWeight: 300, padding: '4px 10px', fontFamily: "'Manrope',sans-serif" }}>50+</div>
    
    {/* 3x2 grid of template icons */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', padding: '24px' }}>
      {/* Email */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
            <path d="M22 7l-10 7L2 7" />
          </svg>
        </div>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontFamily: "'Manrope',sans-serif", fontWeight: 400 }}>Email</span>
      </div>
      
      {/* Sales */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontFamily: "'Manrope',sans-serif", fontWeight: 400 }}>Sales</span>
      </div>
      
      {/* Support */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
            <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
          </svg>
        </div>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontFamily: "'Manrope',sans-serif", fontWeight: 400 }}>Support</span>
      </div>
      
      {/* Reports */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <path d="M9 11h6M9 15h6" />
          </svg>
        </div>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontFamily: "'Manrope',sans-serif", fontWeight: 400 }}>Reports</span>
      </div>
      
      {/* Schedule */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        </div>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontFamily: "'Manrope',sans-serif", fontWeight: 400 }}>Schedule</span>
      </div>
      
      {/* More */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
            <circle cx="5" cy="12" r="1" />
          </svg>
        </div>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontFamily: "'Manrope',sans-serif", fontWeight: 400 }}>+ More</span>
      </div>
    </div>
  </div>
);

/* ─── Card data ─── */
const CARDS = [
  { step: 'DISCOVER', title: 'AI Readiness Deep Diagnostic', desc: 'Not a generic quiz. A structured multi-phase analysis across your business objective, data readiness, and constraints — so you know exactly where you stand before building anything.', Diagram: DiagramDiscover },
  { step: 'DESIGN',   title: 'AI System Blueprint',           desc: 'Aivory turns your diagnostic into a readiness score with KPI targets and a recommended AI architecture built specifically for your business — your score, your gaps, your next move.', Diagram: DiagramDesign },
  { step: 'PLAN',     title: 'AI Roadmap',                    desc: 'Month by month. Milestone by milestone. With KPI targets and sequenced actions so your team knows exactly what to do next — a plan built to be executed, not just presented.', Diagram: DiagramPlan },
  { step: 'BUILD',    title: 'Workflow Builder',              desc: 'Tell the builder what you want to automate in plain language. It generates the entire flow, connects your tools, and outputs it ready to export or deploy — no coding required.', Diagram: DiagramBuild },
  { step: 'DEPLOY',   title: 'AI Agent',                      desc: 'Purpose-built agents for email, customer service, sales, and more. Deploy to Telegram, Slack, or wherever your team works — the right agent, everywhere you need it.', Diagram: DiagramDeploy },
  { step: 'ACCELERATE', title: 'Automation Template Library', desc: 'Start with proven workflows instead of building from scratch. Choose from a growing library of ready-to-use automations for sales, operations, support, marketing, and more — then customize them to fit your business.', Diagram: DiagramAccelerate },
];

/* ─── Main component ─── */
export function FeaturesSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const cards = gsap.utils.toArray<HTMLElement>(section.querySelectorAll('.gsap-card'));
    const total = cards.length;

    // Entrance animation — fade up when card enters viewport
    ScrollTrigger.batch(cards, {
      start: 'top 85%',
      once: true,
      onEnter: (batch) => batch.forEach(card => card.classList.add('animate')),
    });

    // Scale-scrub stacking (desktop ≥1025px, matching live site)
    const mm = gsap.matchMedia();
    mm.add('(min-width: 1025px)', () => {
      cards.forEach((card, i) => {
        if (i === total - 1) return;
        gsap.to(card, {
          scale: 0.94 - 0.01 * (total - i),
          ease: 'none',
          scrollTrigger: {
            trigger: cards[i + 1],
            start: 'top 35%',
            end: 'top 25%',
            scrub: true,
          },
        });
      });
    });

    // Heading reveal
    section.querySelectorAll<HTMLElement>('.reveal-el').forEach(el => {
      gsap.set(el, { opacity: 0, y: 30 });
      gsap.to(el, {
        opacity: 1, y: 0, duration: 0.7, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      });
    });

    return () => { mm.revert(); ScrollTrigger.getAll().forEach(t => t.kill()); };
  }, []);

  /* shared container style — max-width 1160px, padding 0 24px (live site) */
  const inner: React.CSSProperties = { maxWidth: '1160px', margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 };

  return (
    <div ref={sectionRef} id="features" style={{ position: 'relative', zIndex: 1, background: '#05070b' }}>
      <GridCanvas id="ai-ready-grid-overlay" opacity={0.45} />
      <GridCanvas id="ai-execution-grid-overlay" opacity={0.4} />

      {/* ── Section 1: AI is ready ── */}
      <div className="!w-full !py-24" style={{ ...inner, paddingTop: '80px' }}>
        <h2 className="reveal-el" style={{ fontSize: '3.5rem', fontWeight: 500, color: '#fff', marginBottom: '12px', fontFamily: "'Inter Tight',sans-serif", lineHeight: 1.15, letterSpacing: '-0.02em' }}>
          AI is ready. The question is, are you?
        </h2>
        <p className="reveal-el" style={{ fontSize: '1.25rem', color: '#b2b2b2', fontFamily: "'Inter Tight',sans-serif", fontWeight: 300, lineHeight: 1.6, maxWidth: '720px' }}>
          Aivory takes you from &ldquo;where do we even start?&rdquo; to AI that&rsquo;s actually running in your business. One place, one clear plan, from day one.
        </p>
        <p className="reveal-el" style={{ fontSize: '1.25rem', color: '#b2b2b2', fontFamily: "'Inter Tight',sans-serif", fontWeight: 300, lineHeight: 1.6, maxWidth: '720px', marginTop: '24px' }}>
          That&rsquo;s what it means to make AI make sense! Not just understanding it, but having it work for your business, end to end.
        </p>
        <p className="reveal-el" style={{ fontSize: '1.25rem', color: '#fff', fontFamily: "'Inter Tight',sans-serif", fontWeight: 800, lineHeight: 1.6, maxWidth: '720px', marginTop: '24px', whiteSpace: 'nowrap' }}>
          No guesswork. No wasted budget. No hidden cost. Just a clear path forward.
        </p>
      </div>

      {/* ── Section 2: Turn your AI Confusion + stacking cards ── */}
      <div style={{ 
        width: '100%', 
        paddingBottom: '96px',
        maxWidth: '1160px', 
        margin: '0 auto', 
        padding: '160px 24px 24px 24px', 
        position: 'relative', 
        zIndex: 1 
      }}>
          <div style={{ marginBottom: '20px' }}>
            <h2 className="reveal-el" style={{ fontSize: '3.5rem', fontWeight: 500, color: '#fff', marginBottom: '12px', fontFamily: "'Inter Tight',sans-serif", lineHeight: 1.15, letterSpacing: '-0.02em' }}>
              Turn your AI Confusion<br />Into AI Execution
            </h2>
            <p className="reveal-el" style={{ fontSize: '1.25rem', color: '#b2b2b2', fontFamily: "'Inter Tight',sans-serif", fontWeight: 300, lineHeight: 1.6 }}>
              Aivory helps organizations discover where AI creates value,<br />design the right systems, and deploy AI with confidence
            </p>
          </div>

          {/* Stacking cards */}
          <div className="gsap-card-container">
            {CARDS.map(({ step, title, desc, Diagram }, i) => (
              <div 
                key={step} 
                className="gsap-card" 
                style={{ 
                  zIndex: i + 1,
                  position: 'sticky',
                  top: '12vh',
                  borderRadius: '32px',
                  minHeight: '520px',
                  marginBottom: '80px',
                  overflow: 'hidden',
                  willChange: 'transform',
                  transformOrigin: 'center top',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  boxShadow: '0 -20px 50px rgba(0, 0, 0, 0.6)',
                  display: 'grid',
                  gridTemplateColumns: '1.4fr 1fr',
                  opacity: 1,
                  transform: 'translateY(0)',
                  transition: 'opacity 0.6s ease, transform 0.6s ease',
                  background: 'linear-gradient(135deg, #15171c 0%, #05070b 100%)',
                }}
              >
                <div style={{
                  padding: '64px 48px 64px 80px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'flex-start',
                  textAlign: 'left'
                }}>
                  <span style={{
                    display: 'inline-block',
                    fontSize: '13px',
                    fontWeight: 600,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: '#0ae8af',
                    marginBottom: '20px',
                    fontFamily: "'Inter Tight',sans-serif"
                  }}>
                    {step}
                  </span>
                  <div style={{
                    fontSize: '44px',
                    fontWeight: 300,
                    color: '#fff',
                    marginBottom: '24px',
                    fontFamily: "'Inter Tight',sans-serif",
                    lineHeight: 1.15,
                    textAlign: 'left',
                    width: '100%'
                  }}>
                    {title}
                  </div>
                  <div style={{
                    fontSize: '17px',
                    fontWeight: 400,
                    color: 'rgba(255, 255, 255, 0.65)',
                    lineHeight: 1.7,
                    fontFamily: "'Inter Tight',sans-serif",
                    textAlign: 'left',
                    width: '100%'
                  }}>
                    {desc}
                  </div>
                </div>
                <div style={{
                  padding: '48px 24px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <Diagram />
                </div>
              </div>
            ))}
          </div>
        </div>

    </div>
  );
}

export default FeaturesSection;
