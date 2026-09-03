"use client";

import { useScrollAnimation } from "@/hooks/useScrollAnimation";

/**
 * Keeps the first 64px dark so the transparent, white-text Navbar stays
 * legible, then hands over to the ivory editorial canvas used by Careers,
 * Company and About.
 */
const HERO_BACKGROUND =
  "linear-gradient(to bottom, #050505 0, #050505 64px, #efeee8 64px, #efeee8 100%)";

interface HeroSectionProps {
  title: string;
  subtitle: string;
}

export function HeroSection({ title, subtitle }: HeroSectionProps) {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.05 });

  return (
    <section
      ref={ref}
      className={`animate-on-scroll ${
        isVisible ? "is-visible" : ""
      } relative text-[#11110f]`}
      style={{
        fontFamily: "var(--font-manrope), 'Manrope', sans-serif",
        fontWeight: 300,
        background: HERO_BACKGROUND,
      }}
    >
      <div className="mx-auto max-w-[1480px] px-6 pb-16 pt-40 md:px-12 lg:px-24 md:pb-24 md:pt-52">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/60">
          Aivory Suite / Architecture to Production
        </p>
        <h1 className="mt-5 max-w-[1180px] text-[44px] font-light leading-[1.15] tracking-[-0.02em] text-[#11110f] md:text-[64px] lg:text-[80px]">
          {title}
        </h1>
      </div>

      <div className="mx-auto max-w-[1480px] px-6 pb-20 md:px-12 lg:px-24 md:pb-28">
        <div className="grid border-t border-black/25 pt-8 lg:grid-cols-12 lg:gap-12">
          <div className="pb-8 lg:col-span-4 lg:pb-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/60">
              The suite
            </p>
          </div>
          <div className="lg:col-span-8">
            <p className="max-w-2xl text-[16px] font-light leading-[1.7] text-black/70 md:text-[17px]">
              {subtitle}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
