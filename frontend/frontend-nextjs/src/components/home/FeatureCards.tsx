'use client';

import { useRef, useState, useEffect } from 'react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { InteractiveShowcase } from '@/components/product/InteractiveShowcase';
import { InteractiveGridShowcase } from '@/components/product/InteractiveGridShowcase';
import { InteractiveGrid } from '@/components/product/InteractiveGrid';

/* ─── Helpers for Diagnostic Stats ─── */
function useCountUp(target: number, active: boolean, duration = 2000) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;
    let start: number | null = null;
    let raf: number;

    function easeOutExpo(t: number) {
      return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }

    function step(timestamp: number) {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setValue(Math.round(easeOutExpo(progress) * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    }

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration]);

  return value;
}

function DiagnosticStatItem({ 
  target, prefix, suffix, title, subtitle, active, delay 
}: { 
  target: number; prefix: string; suffix: string; title: string; subtitle: string; active: boolean; delay: number 
}) {
  const value = useCountUp(target, active);

  return (
    <div
      className="flex-1 min-w-0 md:min-w-[200px] text-center py-4 px-2 lg:px-4 transition-all duration-[800ms] ease-out flex flex-col items-center justify-start"
      style={{
        opacity: active ? 1 : 0,
        transform: active ? 'translateY(0)' : 'translateY(30px)',
        transitionDelay: `${delay}ms`,
      }}
    >
      <div
        className="font-light text-white leading-none mb-3 flex items-baseline justify-center"
        style={{ fontFamily: "'Manrope', sans-serif", fontSize: 'clamp(3rem, 5vw, 4.5rem)' }}
      >
        {prefix}{value}
        {suffix && <span style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2.5rem)', marginLeft: '2px' }}>{suffix}</span>}
      </div>
      <div className="text-[#d0d0d4] text-[13px] md:text-[15px] font-medium tracking-wide mb-1">
        {title}
      </div>
      <div className="text-[#b6b6ba] text-[11px] md:text-[13px] font-normal">
        {subtitle}
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
export default function FeatureCards() {
  const { ref: animRef, isVisible } = useScrollAnimation();
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsActive, setStatsActive] = useState(false);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStatsActive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Both showcases used to mount on every device (CSS `hidden` only hides them — the
  // component still mounts and keeps ~20 setInterval animation loops running off-screen).
  // We render BOTH until mounted (so the SSR HTML keeps the marketing copy for SEO and
  // there's no hydration mismatch), then unmount the one for the other breakpoint. Since
  // it was already display:none, dropping it is invisible — but its timers/DOM go away.
  const [isLg, setIsLg] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsLg(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return (
    <>
      <div ref={animRef} className={`animate-on-scroll ${isVisible ? 'is-visible' : ''} w-full pt-24 pb-12 relative overflow-hidden`} id="features" style={{ zIndex: 1 }}>
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-24 relative z-[1]">
          <div className="text-center flex flex-col justify-center items-center">
            <h2 className="text-4xl md:text-5xl font-light tracking-tight mb-6 leading-tight text-white max-w-3xl">
              Turn your AI Confusion<br />Into AI Execution
            </h2>
            <p className="text-white/75 max-w-2xl font-light leading-relaxed mb-16">
              Aivory™ helps organizations discover where AI creates value,
              design the right systems, and deploy AI with confidence
            </p>

            {/* Diagnostic Stats Section */}
            <div className="w-full max-w-[1000px] mx-auto flex flex-col items-center">
              <div className="uppercase tracking-[0.2em] text-[#d0d0d4] text-[10px] md:text-xs font-semibold mb-3">
                From Diagnostic to Deployment
              </div>
              <h3 className="text-xl md:text-3xl font-light text-white mb-12">
                Days of consulting, compressed into minutes
              </h3>

              <div ref={statsRef} className="flex flex-nowrap justify-center items-start relative flex-row w-full mt-4">
                <DiagnosticStatItem target={10} prefix="" suffix="min" title="AI Readiness Diagnostic" subtitle="not days of sessions" active={statsActive} delay={0} />
                <div className="w-px self-stretch relative min-h-[100px] hidden md:block border-l border-white/10" />
                <DiagnosticStatItem target={5} prefix="<" suffix="min" title="AI System Blueprint" subtitle="not weeks of decks" active={statsActive} delay={100} />
                <div className="w-px self-stretch relative min-h-[100px] hidden md:block border-l border-white/10" />
                <DiagnosticStatItem target={0} prefix="" suffix="" title="False Starts" subtitle="one clear starting point" active={statsActive} delay={200} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Replaced GSAP Cards with Product Page Components */}
      <div className="relative w-full">
        <div className="hidden lg:block">
          {(isLg === null || isLg) && <InteractiveShowcase />}
        </div>
        <div className="block lg:hidden">
          {(isLg === null || !isLg) && <InteractiveGridShowcase />}
        </div>
        <InteractiveGrid />
      </div>
    </>
  );
}
