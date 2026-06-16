'use client';

import { useEffect, useRef, useState } from 'react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

interface StatItem {
  target: number;
  suffix: string;
  label: string;
}

const stats: StatItem[] = [
  { target: 30, suffix: '+', label: 'Seamless Integrations' },
  { target: 50, suffix: '+', label: 'Intelligent Workflows' },
  { target: 8, suffix: '', label: 'Core Enterprise Architectures' },
  { target: 5, suffix: '', label: 'Deployable AI Agents' },
  { target: 1, suffix: '', label: 'Mission to Make AI Make Sense®' },
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

function StatCounter({ stat, active, delay }: { stat: StatItem; active: boolean; delay: number }) {
  const value = useCountUp(stat.target, active);

  return (
    <div
      className="flex-1 min-w-0 md:min-w-[180px] text-center py-6 md:py-10 px-0.5 sm:px-2 lg:px-4 transition-all duration-[800ms] ease-out"
      style={{
        opacity: active ? 1 : 0,
        transform: active ? 'translateY(0)' : 'translateY(30px)',
        transitionDelay: `${delay}ms`,
      }}
    >
      <div
        className="font-light text-white leading-none mb-3"
        style={{ fontFamily: "'Manrope', sans-serif", fontSize: 'clamp(1.4rem, 4vw, 5rem)' }}
      >
        {value}{stat.suffix}
      </div>
      <div
        className="font-light text-[8px] sm:text-[10px] md:text-[0.85rem] text-white/45 tracking-normal md:tracking-[0.08em] whitespace-nowrap"
        style={{ fontFamily: "'Manrope', sans-serif" }}
      >
        {stat.label}
      </div>
    </div>
  );
}

function LaserDivider() {
  return (
    <div className="w-px self-stretch relative min-h-[120px] hidden md:block">
      <div className="absolute top-0 bottom-0 left-0 w-px bg-transparent" />
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
    <div ref={animRef} className={`animate-on-scroll ${isVisible ? 'is-visible' : ''} w-full relative overflow-hidden`} style={{ backgroundColor: '#000000', padding: '60px 0' }}>

      <div className="relative z-[1] max-w-[1340px] mx-auto px-4 lg:px-6">
        {/* Stats Row */}
        <div
          ref={ref}
          className="flex flex-nowrap justify-center items-start relative flex-row"
        >
          {stats.map((stat, i) => (
            <div key={stat.label} className="contents">
              <StatCounter stat={stat} active={active} delay={i * 100} />
              {i < stats.length - 1 && <LaserDivider />}
            </div>
          ))}

          {/* Horizontal laser lines */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-transparent">
            <div className="absolute -top-px h-[3px] w-[120px] rounded-sm blur-[1px] animate-laser-right"
              style={{
                background: 'linear-gradient(90deg, transparent, #6b8f71, #0ae8af, #6b8f71, transparent)',
                boxShadow: '0 0 15px rgba(107,143,113,0.5), 0 0 35px rgba(10,232,175,0.25)',
              }}
            />
          </div>
          <div className="absolute top-0 left-0 right-0 h-px bg-transparent">
            <div className="absolute -top-px h-[3px] w-[120px] rounded-sm blur-[1px] animate-laser-left"
              style={{
                background: 'linear-gradient(90deg, transparent, #6b8f71, #0ae8af, #6b8f71, transparent)',
                boxShadow: '0 0 15px rgba(107,143,113,0.5), 0 0 35px rgba(10,232,175,0.25)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
