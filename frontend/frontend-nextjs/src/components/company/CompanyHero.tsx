'use client';

import { useScrollAnimation } from '@/hooks/useScrollAnimation';

export function CompanyHero() {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.05 });

  return (
    <section
      ref={ref}
      className={`animate-on-scroll ${
        isVisible ? 'is-visible' : ''
      } relative min-h-screen flex items-center justify-center overflow-hidden bg-black bg-grid-pattern border-b border-white/10`}
    >
      {/* Light gradient highlight to mimic x.ai top screen shine */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none opacity-20 blur-[100px]"
        style={{
          background: 'radial-gradient(ellipse 50% 50% at 50% 0%, #0ae8af 0%, transparent 80%)',
        }}
      />

      {/* Hero Content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto flex flex-col items-center pt-24">
        {/* Headline */}
        <h1
          className="text-4xl sm:text-5xl md:text-6xl font-light text-white mb-8 leading-[1.15] tracking-tight max-w-3xl"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          Aivory is an AI adoption platform.
        </h1>

        {/* Subtitle Paragraphs */}
        <div className="flex flex-col gap-6 text-base sm:text-lg text-white/60 max-w-3xl mx-auto mb-10 font-light leading-relaxed" style={{ fontFamily: "'Manrope', sans-serif" }}>
          <p>
            We help organizations identify where AI creates real value, design the right systems, and bring them into production without guesswork, wasted budget, or drawn-out consulting cycles.
          </p>
          <p>
            Everything happens in one place. From AI readiness assessment to implementation blueprint to deployment tools. From the moment you begin to the moment AI is actively running in your business, Aivory guides the entire journey.
          </p>
        </div>
      </div>

      {/* Wireframe Scroll Guide (Vertical line showing page flow) */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
        <div className="w-[1px] h-20 bg-gradient-to-b from-transparent to-white/15" />
        <div
          className="text-[9px] tracking-[0.15em] text-[#c4c9b8] uppercase my-3 font-light"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          SCROLL TO EXPLORE
        </div>
        <div className="w-[1px] h-12 bg-white/20" />
      </div>
    </section>
  );
}
