'use client';

import { useRef } from 'react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { InteractiveShowcase } from '@/components/product/InteractiveShowcase';
import { InteractiveGridShowcase } from '@/components/product/InteractiveGridShowcase';
import { InteractiveGrid } from '@/components/product/InteractiveGrid';

/* ─── Main Component ─── */
export default function FeatureCards() {
  const { ref: animRef, isVisible } = useScrollAnimation();

  return (
    <>
      <div ref={animRef} className={`animate-on-scroll ${isVisible ? 'is-visible' : ''} w-full pt-24 pb-12 relative overflow-hidden`} id="features" style={{ zIndex: 1 }}>
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-24 relative z-[1]">
          <div className="text-center flex flex-col justify-center items-center">
            <h2 className="text-4xl md:text-5xl font-light tracking-tight mb-6 leading-tight text-white max-w-3xl">
              Turn your AI Confusion<br />Into AI Execution
            </h2>
            <p className="text-white/60 max-w-2xl font-light leading-relaxed mb-6">
              Aivory™ helps organizations discover where AI creates value,
              design the right systems, and deploy AI with confidence
            </p>
          </div>
        </div>
      </div>

      {/* Replaced GSAP Cards with Product Page Components */}
      <div className="relative z-[1] w-full">
        <div className="hidden lg:block">
          <InteractiveShowcase />
        </div>
        <div className="block lg:hidden">
          <InteractiveGridShowcase />
        </div>
        <InteractiveGrid />
      </div>
    </>
  );
}
