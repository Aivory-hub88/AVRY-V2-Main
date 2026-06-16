'use client';

import { useScrollAnimation } from '@/hooks/useScrollAnimation';

interface FeaturedProductProps {
  id: string;
  title: string;
  tagline: string;
  description: string;
  features: string[];
  alignment?: 'left' | 'right' | 'center';
}

export function FeaturedProduct({
  id,
  title,
  tagline,
  description,
  features,
  alignment = 'left',
}: FeaturedProductProps) {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section
      id={id}
      ref={ref}
      className={`animate-on-scroll ${isVisible ? 'is-visible' : ''} min-h-[80vh] flex items-center px-6 md:px-16 lg:px-24`}
      style={{ background: '#050505' }}
    >
      <div
        className={`max-w-6xl mx-auto flex flex-col ${
          alignment === 'right' ? 'md:items-end md:text-right' : ''
        }`}
      >
        <p
          className="text-[#c4c9b8] text-sm uppercase tracking-widest mb-4 font-light"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          {tagline}
        </p>
        <h2
          className="text-4xl md:text-5xl lg:text-6xl font-light text-white mb-6"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          {title}
        </h2>
        <p
          className="text-lg text-white/70 max-w-2xl mb-8 font-light leading-relaxed"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          {description}
        </p>
        <ul className="space-y-3">
          {features.map((feature, i) => (
            <li
              key={i}
              className={`flex items-start gap-3 text-white/90 ${
                alignment === 'right' ? 'md:flex-row-reverse' : ''
              }`}
            >
              <span className="text-accent mt-0.5 flex-shrink-0">✓</span>
              <span style={{ fontFamily: "'Manrope', sans-serif" }}>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
