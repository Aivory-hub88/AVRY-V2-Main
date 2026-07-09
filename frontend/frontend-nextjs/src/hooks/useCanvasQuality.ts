"use client";
import { useEffect, useState } from 'react';

/**
 * Device-aware quality settings for the decorative section 3D canvases
 * (RetroMac, LabFlask). On mobile/tablet we render at native 1x device pixel
 * ratio instead of up to 1.5x — the flasks/mac are small decorative elements,
 * so the drop is visually negligible but cuts fragment-shader work by ~50% on
 * the high-DPI screens where the GPU budget is tightest (and where the tab
 * crash originally happened).
 */
export function useCanvasQuality() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    setIsMobile(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return {
    isMobile,
    dpr: (isMobile ? [1, 1] : [1, 1.5]) as [number, number],
  };
}
