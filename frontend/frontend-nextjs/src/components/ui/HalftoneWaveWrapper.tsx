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
          background: 'transparent',
        }}
      />
      {/* soft indigo/blue accents echoing the flower petals */}
      <div
        className="absolute inset-0"
        style={{
          background: 'transparent',
        }}
      />
    </div>
  );
}
// Scroll anchors: the flower fades OUT crossing into #features ("Turn your
// AI Confusion...") and fades back IN crossing into #prefooter-cta ("Direct
// Engagement"), staying hidden through Stats / Pricing / Privacy in between.
function crossProgress(top: number, vh: number): number {
  const triggerLine = vh * 0.6;
  // Narrower band than before -- the crossfade resolves faster so the
  // pre-footer content and the footer read as one consistent color instead
  // of sitting in a prolonged half-blended state.
  const band = vh * 0.22;
  const t = (triggerLine - top) / band;
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

function useFlowerScrollOpacity() {
  const [opacity, setOpacity] = useState(1);
  useEffect(() => {
    let ticking = false;
    const update = () => {
      ticking = false;
      const statsEl = document.getElementById('stats');
      const preFooterEl = document.getElementById('prefooter-cta');
      if (!statsEl || !preFooterEl) return;
      const vh = window.innerHeight;
      const hideT = crossProgress(statsEl.getBoundingClientRect().top, vh);
      const showT = crossProgress(preFooterEl.getBoundingClientRect().top, vh);
      // 100% at hero, 98% during operational framework, fades out at stats
      const scrollY = window.scrollY;
      const heroT = Math.min(scrollY / (vh * 0.5), 1.0); // Transition in first 50vh
      const baseOpacity = 1.0 - (heroT * 0.02); // 1.0 -> 0.98
      setOpacity(baseOpacity - (hideT * baseOpacity) + (showT * baseOpacity));
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);
  return opacity;
}

export function HalftoneWaveWrapper({ purpleColor }: { purpleColor?: string } = {}) {
  const [useWebgl, setUseWebgl] = useState(false);
  const opacity = useFlowerScrollOpacity();
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
    // Hard timeout ceiling -- some real-world conditions (busy main thread,
    // background tabs, low-power throttling) can delay or never fire a plain
    // requestIdleCallback, silently stranding the page on the static CSS
    // fallback forever. A timeout guarantees the flower still mounts.
    const id = ric(() => setUseWebgl(true), { timeout: 2000 });
    return () => cic(id as number);
  }, []);
  return (
    <>
      {/* Always-on, very subtle base wash -- present continuously from the
          hero all the way through the pre-footer (independent of the flower
          crossfade below), so the page has a constant thread of depth/color
          instead of reading as flat black in the hero and pricing/footer
          stretch where the stronger crossfaded wash below is at 0. Single
          deep-indigo tone (#130e30), full-bleed so it never falls off to
          black at the edges. */}
      {/* Gradient removed per user request */}
      {/* Deep-indigo ambient wash, fixed to the viewport so it scrolls
          seamlessly through #features -> Stats -> Pricing -> Privacy with no
          visible section seam -- it's just the flower's opacity, inverted,
          so the two crossfade into each other at the same scroll points. */}
      {/* Gradient removed per user request */}
      <div style={{ opacity, transition: 'opacity 500ms ease' }}>
        {useWebgl ? (
          <HalftoneWave active={opacity > 0.02} purpleColor={purpleColor} />
        ) : (
          <CssGradientFallback />
        )}
      </div>
    </>
  );
}
