'use client';

import { useEffect, useRef, useState } from 'react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

interface StatItem {
  target: number;
  suffix: string;
  label: string;
}

const stats: StatItem[] = [
  { target: 30, suffix: '+', label: 'Enterprise Integrations' },
  { target: 50, suffix: '+', label: 'Automated Workflows' },
  { target: 8, suffix: '', label: 'Core Architectures' },
  { target: 5, suffix: '', label: 'Autonomous Agents' },
  { target: 1, suffix: '', label: 'Unified Platform' },
];

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

function StatCounter({ stat, active, delay, index }: { stat: StatItem; active: boolean; delay: number; index: number }) {
  const value = useCountUp(stat.target, active);
  const isLast = index === stats.length - 1;

  return (
    <div
      className={`relative flex min-h-[132px] flex-col items-center justify-center bg-transparent px-2 py-4 text-center transition-[opacity,transform] duration-[800ms] ease-out sm:min-h-[150px] sm:px-4 sm:py-6 ${isLast ? 'col-span-2 sm:col-span-1' : ''}`}
      style={{
        opacity: active ? 1 : 0,
        transform: active ? 'translateY(0)' : 'translateY(20px)',
        transitionDelay: `${delay}ms`,
      }}
    >
      <div
        className="flex h-[60px] items-center justify-center font-light leading-none tracking-[-0.055em] text-[#f3f4ef] [font-variant-numeric:tabular-nums] sm:h-[66px]"
        style={{ fontFamily: "var(--font-manrope), 'Manrope', sans-serif", fontSize: 'clamp(2.45rem, 3.5vw, 3.65rem)' }}
      >
        {value}
        {stat.suffix && (
          <span className="ml-1 self-start pt-1.5 text-[0.42em] font-light tracking-[-0.02em] text-white/50">
            {stat.suffix}
          </span>
        )}
      </div>
      <div
        className="mt-3 flex min-h-[20px] items-center justify-center text-[9px] font-light uppercase leading-relaxed tracking-[0.1em] text-white/48 sm:whitespace-nowrap sm:text-[10px] sm:tracking-[0.11em]"
        style={{ fontFamily: "var(--font-manrope), 'Manrope', sans-serif" }}
      >
        {stat.label}
      </div>
    </div>
  );
}

export default function StatsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const { ref: animRef, isVisible } = useScrollAnimation();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div id="stats" ref={animRef} className={`animate-on-scroll ${isVisible ? 'is-visible' : ''} w-full relative overflow-hidden`} style={{ padding: '110px 0 120px 0' }}>
      <div className="relative z-[1] mx-auto max-w-[1180px] px-5 lg:px-8">
        <div
          ref={ref}
          className="grid grid-cols-2 items-stretch gap-x-4 gap-y-10 sm:grid-cols-5 sm:gap-x-0 sm:gap-y-0"
        >
          {stats.map((stat, i) => (
            <StatCounter
              key={stat.label}
              stat={stat}
              active={active}
              delay={i * 100}
              index={i}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
