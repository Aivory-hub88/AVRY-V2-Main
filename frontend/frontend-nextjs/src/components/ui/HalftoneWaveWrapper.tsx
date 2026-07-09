'use client';
import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
/**
 * Page-wide ambient background.
 *
 * Perf strategy:
 * - Paint the pure-CSS gradient immediately (instant ambient background, zero
 *   crash risk, nothing to download), then upgrade to the WebGL "halftone
 *   flower" once the browser is idle so it never competes with LCP / hydration.
 * - Runs on all devices. The flower itself renders lighter on mobile (0.5
 *   device-pixel-ratio, larger ASCII cell, stays centered) so it stays smooth.
 * - `prefers-reduced-motion` users keep the static CSS gradient and never
 *   download the three.js chunk.
 */
const HalftoneWave = dynamic(
  () => import('./HalftoneWave').then((mod) => mod.HalftoneWave),
  { ssr: false }
);
function CssGradientFallback() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      {/* central bloom */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 55% at 50% 42%, rgba(60,52,140,0.35) 0%, rgba(24,22,64,0.22) 38%, rgba(6,6,16,0.05) 62%, rgba(0,0,0,0) 80%)',
        }}
      />
      {/* soft indigo/blue accents echoing the flower petals */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(40% 40% at 30% 55%, rgba(38,30,110,0.28) 0%, rgba(0,0,0,0) 70%), radial-gradient(45% 45% at 72% 48%, rgba(30,42,120,0.26) 0%, rgba(0,0,0,0) 70%)',
        }}
      />
    </div>
  );
}
export function HalftoneWaveWrapper() {
  const [useWebgl, setUseWebgl] = useState(false);
  useEffect(() => {
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    // Reduced-motion: keep the static CSS gradient, skip the WebGL download.
    if (prefersReduced) return;
    // All devices: defer the WebGL flower until the browser is idle.
    const ric =
      window.requestIdleCallback ||
      ((cb: IdleRequestCallback) =>
        window.setTimeout(() => cb({} as IdleDeadline), 300));
    const cic = window.cancelIdleCallback || window.clearTimeout;
    const id = ric(() => setUseWebgl(true));
    return () => cic(id as number);
  }, []);
  if (useWebgl) return <HalftoneWave />;
  return <CssGradientFallback />;
}
