'use client';

import { useScrollAnimation } from '@/hooks/useScrollAnimation';

export default function AIReadySection() {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <div ref={ref} className={`animate-on-scroll ${isVisible ? 'is-visible' : ''} w-full py-16 md:py-24 relative overflow-hidden`}>
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-24 relative z-[1]">
        <div className="text-center flex flex-col justify-center items-center">
          <h2 className="text-4xl md:text-5xl font-light tracking-tight mb-6 leading-tight text-white max-w-3xl">
            Where do we start?
          </h2>

          <p className="text-white/80 max-w-2xl font-light leading-relaxed mb-6 text-lg md:text-xl">
            That&rsquo;s the question that stops most AI adoption before it begins.<br />
            <span className="text-white font-medium">Aivory answers it.</span><br /><br />
            Assess your readiness. Get a plan built for your business. Launch it.<br />
            <span className="text-white font-medium">Not a consultant. A system.</span><br /><br />
            No guesswork. No noise.
          </p>

          <p
            className="text-white font-medium leading-relaxed w-full md:whitespace-nowrap mt-2 text-xl md:text-2xl"
            style={{
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            AI that works, from day one.
          </p>
        </div>
      </div>
    </div>
  );
}
