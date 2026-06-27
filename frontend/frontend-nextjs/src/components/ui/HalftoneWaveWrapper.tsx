'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';

const HalftoneWave = dynamic(
  () => import('./HalftoneWave').then((mod) => mod.HalftoneWave),
  { ssr: false }
);

export function HalftoneWaveWrapper() {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // Delay rendering of heavy WebGL background to prioritize LCP and hydration
    // This allows the browser to paint the initial frame immediately!
    const timer = setTimeout(() => {
      setShouldRender(true);
    }, 150);
    
    return () => clearTimeout(timer);
  }, []);

  if (!shouldRender) return null;

  return <HalftoneWave />;
}
