"use client";

import { useScrollAnimation } from "@/hooks/useScrollAnimation";

export default function AIReadySection() {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <div
      ref={ref}
      className={`animate-on-scroll ${isVisible ? "is-visible" : ""} w-full pt-16 md:pt-24 pb-4 md:pb-6 relative`}
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-24 relative z-[1]">
        <div className="grid grid-cols-1 gap-10 mb-6 md:grid-cols-12 md:gap-8 md:items-start">
          {/* Left Column */}
          <div className="md:col-span-5 md:col-start-2 flex justify-start">
            <h2
              className="text-[26px] sm:text-[28px] md:text-[28px] lg:text-[32px] font-light tracking-tight leading-[1.15] text-white m-0 text-left"
              style={{ fontFamily: "var(--font-manrope), 'Manrope', sans-serif", fontWeight: 300 }}
            >
              Transformation requires
              <br />
              operational{" "}
              <span
                className="inline-block"
                style={{ 
                  color: "#e4effd", 
                  paddingRight: "0.25em", 
                  marginRight: "-0.25em" 
                }}
              >
                clarity.
              </span>
            </h2>
          </div>

          {/* Right Column */}
          {/* The copy is a problem, a turn, and three steps -- but as four
              free paragraphs of unequal length it read as a ragged block, with
              a stray <br/> in the second one giving that beat a rhythm none of
              the others had. Numbering the steps is what the copy was already
              doing implicitly, and it buys a left edge, an even measure, and a
              scannable sequence.

              This column sits over the busiest part of the WebGL flower, so a
              soft scrim sits behind it. Gradient only -- no backdrop blur:
              blurring a live animating layer costs a re-composite every frame
              (the trap already documented on the operations-stack cards). */}
          <div className="relative flex flex-col justify-start text-left md:col-span-6 md:col-start-7">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-x-8 -inset-y-10 -z-10"
              style={{
                background:
                  'radial-gradient(ellipse at 42% 50%, rgba(9,8,7,0.8) 0%, rgba(9,8,7,0.5) 52%, rgba(9,8,7,0) 78%)',
              }}
            />

            <p className="max-w-[54ch] text-[14px] md:text-[16px] font-light leading-relaxed text-white/60">
              Most organisations deploy AI before understanding how work actually gets done.
            </p>

            <p className="mt-6 max-w-[54ch] text-[17px] md:text-[19px] font-light leading-snug tracking-tight text-white">
              We reverse the model.
            </p>

            <ol className="mt-7 max-w-[54ch] border-b border-white/[0.13]">
              {[
                'Map the operation.',
                'Get a blueprint of quick-win automations.',
                'Then scale with governed AI agents.',
              ].map((step, i) => (
                <li
                  key={step}
                  className="flex items-baseline gap-5 border-t border-white/[0.13] py-[13px]"
                >
                  <span className="font-mono text-[11px] tracking-[0.18em] text-white/40">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-[14px] md:text-[16px] font-light leading-relaxed text-white/85">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
