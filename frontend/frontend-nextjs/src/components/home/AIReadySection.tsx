'use client';

import { useScrollAnimation } from '@/hooks/useScrollAnimation';

export default function AIReadySection() {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <div ref={ref} className={`animate-on-scroll ${isVisible ? 'is-visible' : ''} w-full py-16 md:py-24 relative overflow-hidden bg-black`}>

      <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-24 relative z-[1]">
        <div className="text-center flex flex-col justify-center items-center">
          <h2 className="text-4xl md:text-5xl font-light tracking-tight mb-6 leading-tight text-white max-w-3xl">
            Aivory&trade; exists because AI adoption needed to be fixed.
          </h2>

          <p className="text-white/60 max-w-2xl font-light leading-relaxed mb-6">
            Aivory™ helps you move from <span className="text-white">&ldquo;where do we start?&rdquo;</span> to AI that&rsquo;s working inside your business. Assess your readiness, find the highest‑impact opportunities, and launch the right AI systems with one clear plan in one platform.
          </p>

          <p className="text-white/60 max-w-2xl font-light leading-relaxed mb-6">
            <span className="text-white">No long discovery cycles. No bloated consulting timelines. No generic strategy decks.</span> Instead of traditional consulting, Aivory uses a <span className="text-white">high‑intelligence deterministic engine</span> to compress work that used to take weeks into clear AI decisions and workflows in minutes.
          </p>

          <p className="text-white/60 max-w-2xl font-light leading-relaxed">
            <span className="text-white">AI should feel practical, not overwhelming.</span> Aivory™ turns complexity into a clear path forward, so your team can move faster and see real business results.
          </p>

          <p
            className="text-white text-base md:text-xl font-normal leading-relaxed w-full md:whitespace-nowrap mt-6"
            style={{
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            No guesswork. No wasted budget. No hidden cost. Just a clear path forward.
          </p>
        </div>
      </div>
    </div>
  );
}
