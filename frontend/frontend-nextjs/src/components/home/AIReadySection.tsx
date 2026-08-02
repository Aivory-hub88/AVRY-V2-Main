"use client";

import { useScrollAnimation } from "@/hooks/useScrollAnimation";

export default function AIReadySection() {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <div
      ref={ref}
      className={`animate-on-scroll ${isVisible ? "is-visible" : ""} w-full py-16 md:py-24 relative`}
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-24 relative z-[1]">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-12 mb-20">
          {/* Left Column */}
          <div className="w-full md:w-1/2 flex justify-start">
            <h2
              className="text-3xl sm:text-4xl md:text-[31px] lg:text-[38px] font-light tracking-tight leading-[1.1] text-white m-0 text-left"
              style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}
            >
              Transformation requires
              <br />
              operational{" "}
              <span 
                className="italic inline-block" 
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
          <div className="w-full md:w-1/2 flex flex-col justify-start text-left">
            <p className="text-white/80 font-light leading-relaxed text-[14px] md:text-[16px] m-0 max-w-xl">
              Most organisations deploy AI before understanding their operations.{" "}
              <span className="text-white font-medium">We reverse the model.</span>
              <br />
              <br />
              Assess operations. Identify bottlenecks.{" "}
              <span className="text-white font-medium">
                Deploy AI where it creates measurable impact.
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
