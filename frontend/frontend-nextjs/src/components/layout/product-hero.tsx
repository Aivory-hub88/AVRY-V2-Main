'use client';

import { useScrollAnimation } from '@/hooks/useScrollAnimation';

export function ProductHero() {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.05 });

  return (
    <section
      ref={ref}
      className="relative !pt-48 !pb-24 overflow-hidden"
      style={{
        background: '#000',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
        transition: 'opacity 0.8s ease, transform 0.8s ease',
      }}
    >
      {/* Gradient accent */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none opacity-15 blur-[120px]"
        style={{
          background: 'radial-gradient(ellipse 50% 50% at 50% 0%, #0ae8af 0%, transparent 80%)',
        }}
      />

      <div className="relative z-10 !max-w-5xl !mx-auto !px-6 md:!px-12 !text-center">
        <h1
          className="!text-4xl sm:!text-5xl md:!text-6xl !font-light !text-white !mb-8 !leading-[1.1] !tracking-tight"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          AI-Powered Business Transformation
        </h1>
        <p className="!text-lg md:!text-xl !text-white/60 !font-light !leading-relaxed !max-w-3xl !mx-auto">
          From diagnostic to deployment — everything you need to integrate AI into your business operations.
        </p>
      </div>
    </section>
  );
}

export default ProductHero;
