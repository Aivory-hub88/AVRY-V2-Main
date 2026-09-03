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
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animationFrameId: number;
    let startTime = Math.random() * 10000;

    const animate = (time: number) => {
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const radiusX = rect.width / 2;
        const radiusY = rect.height / 2;
        const speed = 0.004; 
        const angle = (time + startTime) * speed;
        
        const x = centerX + radiusX * Math.cos(angle);
        const y = centerY - radiusY * Math.sin(angle);
        
        cardRef.current.style.setProperty('--mouse-x', `${x}px`);
        cardRef.current.style.setProperty('--mouse-y', `${y}px`);
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div
      ref={cardRef}
      className="group relative spotlight-card auto-spotlight flex-1 min-w-0 md:min-w-[200px] text-center py-8 px-4 lg:px-6 rounded-2xl transition-all duration-[800ms] ease-out flex flex-col items-center justify-start border-transparent bg-transparent hover:bg-white/[0.03]"
      style={{
        opacity: active ? 1 : 0,
        transform: active ? 'translateY(0)' : 'translateY(30px)',
        transitionDelay: `${delay}ms`,
      }}
    >
      {/* Small accent mark above the number, grows in with the count-up */}
      <div
        className="h-px w-8 mb-5 rounded-full transition-all duration-[900ms] ease-out"
        style={{
          background: 'linear-gradient(90deg, transparent, #7c3aed, transparent)',
          transform: active ? 'scaleX(1)' : 'scaleX(0)',
          opacity: active ? 1 : 0,
          transitionDelay: `${delay + 150}ms`,
        }}
      />
      <div
        className="font-light text-white leading-none mb-4 flex items-baseline justify-center [font-variant-numeric:tabular-nums]"
        style={{
          fontFamily: "'Manrope', sans-serif",
          fontSize: 'clamp(3rem, 5vw, 4.5rem)',
          textShadow: '0 0 40px rgba(124, 58, 237, 0.35)',
        }}
      >
        {prefix}{value}
        {suffix && <span style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2.5rem)', marginLeft: '2px' }}>{suffix}</span>}
      </div>
      <div className="text-[#e4e4e7] text-[13px] md:text-[15px] font-medium tracking-wide mb-1.5">
        {title}
      </div>
      <div className="text-[#8a8a92] text-[11px] md:text-[13px] font-normal">
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
            <h2 className="text-4xl md:text-5xl font-light tracking-tight mb-16 leading-tight text-white max-w-3xl" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>
              Operational clarity.<br />
              Executive <span className="italic" style={{ color: '#e4effd' }}>control.</span>
            </h2>
            

            {/* Diagnostic Stats Section */}
            <div className="w-full max-w-[850px] mx-auto flex flex-col items-center">
              <div className="uppercase tracking-[0.2em] text-[#d0d0d4] text-[14px] md:text-[17px] font-semibold mb-3">
                FROM INSIGHT TO EXECUTION.
              </div>
              <h3 className="text-base md:text-2xl font-light text-white mb-12" style={{ zoom: 0.95, fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>
                Business transformation starts with understanding how the organisation operates.
              </h3>

              <div ref={statsRef} className="flex flex-nowrap justify-center items-stretch relative flex-row w-full mt-4" style={{ zoom: 0.76 }}>
                <DiagnosticStatItem target={10} prefix="" suffix="min" title="Business Operations Assessment" subtitle="not days of sessions" active={statsActive} delay={0} />
                <div
                  className="w-px self-stretch relative min-h-[100px] hidden md:block"
                  style={{ background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.14) 20%, rgba(255,255,255,0.14) 80%, transparent)' }}
                />
                <DiagnosticStatItem target={5} prefix="<" suffix="min" title="Transformation Blueprint" subtitle="not weeks of decks" active={statsActive} delay={100} />
                <div
                  className="w-px self-stretch relative min-h-[100px] hidden md:block"
                  style={{ background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.14) 20%, rgba(255,255,255,0.14) 80%, transparent)' }}
                />
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
