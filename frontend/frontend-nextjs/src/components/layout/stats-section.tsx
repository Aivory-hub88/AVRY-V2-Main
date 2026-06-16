'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

interface StatItem {
  value: number;
  suffix: string;
  label: string;
}

const stats: StatItem[] = [
  { value: 100, suffix: '+', label: 'Seamless Integrations' },
  { value: 50, suffix: '+', label: 'Intelligent Workflows' },
  { value: 8, suffix: '', label: 'Core Enterprise Architectures' },
  { value: 5, suffix: '', label: 'Deployable AI Agents' },
  { value: 1, suffix: '', label: 'Mission to Make AI Make Sense®' },
];

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function useCountUp(target: number, trigger: boolean, duration = 2000): number {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!trigger) return;

    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutExpo(progress);
      setCount(Math.round(eased * target));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [trigger, target, duration]);

  return count;
}

function StatCounter({ stat, trigger }: { stat: StatItem; trigger: boolean }) {
  const count = useCountUp(stat.value, trigger);

  return (
    <div className="flex flex-col items-center text-center px-6 py-4">
      <span
        className="!text-white font-light leading-none"
        style={{
          fontFamily: "'Manrope', sans-serif",
          fontSize: 'clamp(3rem, 6vw, 5rem)',
        }}
      >
        {count}
        {stat.suffix && <span className="text-white/60">{stat.suffix}</span>}
      </span>
      <span
        className="text-white/45 text-sm md:text-base mt-3 font-light"
        style={{ fontFamily: "'Manrope', sans-serif" }}
      >
        {stat.label}
      </span>
    </div>
  );
}

export function StatsSection() {
  const { ref: sectionRef, isVisible } = useScrollAnimation({ threshold: 0.1 });
  const statsContainerRef = useRef<HTMLDivElement>(null);
  const [counting, setCounting] = useState(false);

  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    if (entry.isIntersecting) {
      setCounting(true);
    }
  }, []);

  useEffect(() => {
    const el = statsContainerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(handleIntersection, { threshold: 0.3 });
    observer.observe(el);

    return () => observer.disconnect();
  }, [handleIntersection]);

  return (
    <section
      ref={sectionRef}
      className="relative bg-transparent"
      style={{
        padding: '100px 0',
        fontFamily: "'Manrope', sans-serif",
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
        transition: 'opacity 0.8s ease, transform 0.8s ease',
      }}
    >
      {/* Top Laser Line */}
      <div className="absolute top-0 left-0 w-full h-px overflow-hidden">
        <div className="w-full h-full bg-white/[0.08] relative">
          <div className="absolute inset-0 animate-laser-right" />
        </div>
      </div>

      {/* Stats Row */}
      <div
        ref={statsContainerRef}
        className="max-w-7xl mx-auto px-6"
      >
        <div className="flex flex-col md:flex-row items-center justify-center">
          {stats.map((stat, index) => (
            <div key={stat.label} className="flex items-center">
              <StatCounter stat={stat} trigger={counting} />
              {index < stats.length - 1 && (
                <div className="hidden md:block w-px h-full min-h-[80px] bg-white/[0.08]" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Laser Line */}
      <div className="absolute bottom-0 left-0 w-full h-px overflow-hidden">
        <div className="w-full h-full bg-white/[0.08] relative">
          <div className="absolute inset-0 animate-laser-left" />
        </div>
      </div>
    </section>
  );
}
