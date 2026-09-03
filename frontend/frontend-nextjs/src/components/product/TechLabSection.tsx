'use client';

import React, { useEffect, useRef, useState, MouseEvent } from 'react';

// Spotlight Card component
function SpotlightCard({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cardRef.current.style.setProperty('--mouse-x', `${x}px`);
    cardRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className={`spotlight-card rounded-2xl border border-white/5 bg-zinc-950/65 shadow-lg flex flex-col ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

export function TechLabSection() {
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) observer.observe(ref.current);

    return () => observer.disconnect();
  }, []);

  return (
    <section className="bg-black pt-24 pb-0 px-6 md:px-16 lg:px-24 border-t border-white/5 font-manrope">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-12">
          <span className="text-[#dfe2d8] uppercase tracking-widest text-xs font-manrope font-light mb-6">
            Built with you. Not just for you.
          </span>
          <img
            src="/aivory-tech-lab-v2.svg"
            alt="Aivory Tech Lab Logo"
            width={293}
            height={164}
            className="w-32 md:w-48 lg:w-56 h-auto mb-2 md:mb-4 object-contain brightness-0 invert opacity-90"
          />
          <h2 className="text-4xl md:text-5xl font-light tracking-normal text-white leading-tight mb-4">
            The work starts here
          </h2>
          <p className="text-[#777] text-lg font-light max-w-2xl">
            For the work that requires more than a platform. Strategy, architecture, and delivery. In close collaboration with your team.
          </p>
        </div>

        {/* Thin Horizontal Rule */}
        <div className="h-[1px] bg-[#1a1a1a] w-full mb-12" />

        {/* Cards Grid */}
        <div ref={ref} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
          
          {/* Card 01 - col-span-2 */}
          <SpotlightCard className={`col-span-1 md:col-span-1 lg:col-span-2 p-8 justify-between ${inView ? 'opacity-100 animate-fade-in-up' : 'opacity-0'}`} style={{ animationDelay: '0ms' }}>
            <div>
              <span className="text-[#555] font-mono text-sm mb-6 block">01.</span>
              <h3 className="text-white font-medium text-lg mb-3">Engineering Studio</h3>
              <p className="text-white/70 text-[13px] font-light leading-relaxed mb-10">
                We design and build AI-native digital products — from architecture to deployment — as a dedicated creative and technical partner.
              </p>
            </div>
            
            {/* Graphic */}
            <div className="rounded-[6px] overflow-hidden">
              <img src="/images/tech-lab/engineering-studio.jpeg" alt="Engineering Studio" className="w-full h-auto rounded-[6px]" />
            </div>
          </SpotlightCard>

          {/* Card 02 - col-span-2 */}
          <SpotlightCard className={`col-span-1 md:col-span-1 lg:col-span-2 p-8 justify-between ${inView ? 'opacity-100 animate-fade-in-up' : 'opacity-0'}`} style={{ animationDelay: '100ms' }}>
            <div>
              <span className="text-[#555] font-mono text-sm mb-6 block">02.</span>
              <h3 className="text-white font-medium text-lg mb-3">AI Strategy Consultation</h3>
              <p className="text-white/70 text-[13px] font-light leading-relaxed mb-10">
                One-on-one with an Aivory expert. Validate direction, identify leverage points, and leave with a plan worth executing.
              </p>
            </div>

            {/* Graphic */}
            <div className="rounded-[6px] overflow-hidden">
              <img src="/images/tech-lab/ai-strategy-consultation.jpeg" alt="AI Strategy Consultation" className="w-full h-auto rounded-[6px]" />
            </div>
          </SpotlightCard>

          {/* Card 03 - col-span-2 */}
          <SpotlightCard className={`col-span-1 md:col-span-2 lg:col-span-2 p-8 justify-between ${inView ? 'opacity-100 animate-fade-in-up' : 'opacity-0'}`} style={{ animationDelay: '200ms' }}>
            <div>
              <span className="text-[#555] font-mono text-sm mb-6 block">03.</span>
              <h3 className="text-white font-medium text-lg mb-3">Custom AI Development</h3>
              <p className="text-white/70 text-[13px] font-light leading-relaxed mb-10">
                Bespoke agents, workflows, and integrations — designed around your operations, built on enterprise-grade infrastructure.
              </p>
            </div>

            {/* Graphic */}
            <div className="rounded-[6px] overflow-hidden">
              <img src="/images/tech-lab/custom-ai-development.jpeg" alt="Custom AI Development" className="w-full h-auto rounded-[6px]" />
            </div>
          </SpotlightCard>

          {/* Card 04 - col-span-3 */}
          <SpotlightCard className={`col-span-1 md:col-span-1 lg:col-span-3 p-8 justify-between ${inView ? 'opacity-100 animate-fade-in-up' : 'opacity-0'}`} style={{ animationDelay: '300ms' }}>
            <div className="max-w-full lg:max-w-[80%]">
              <span className="text-[#555] font-mono text-sm mb-6 block">04.</span>
              <h3 className="text-white font-medium text-lg mb-3">Corporate Training</h3>
              <p className="text-white/70 text-[13px] font-light leading-relaxed mb-10">
                Structured programs for organisations embedding AI across teams — from executive alignment to hands-on implementation.
              </p>
            </div>

            {/* Graphic */}
            <div className="rounded-[6px] overflow-hidden">
              <img src="/images/tech-lab/corporate-training.jpeg" alt="Corporate Training" className="w-full h-auto rounded-[6px]" />
            </div>
          </SpotlightCard>

          {/* Card 05 - col-span-3 */}
          <SpotlightCard className={`col-span-1 md:col-span-1 lg:col-span-3 p-8 justify-between ${inView ? 'opacity-100 animate-fade-in-up' : 'opacity-0'}`} style={{ animationDelay: '400ms' }}>
            <div className="max-w-full lg:max-w-[80%]">
              <span className="text-[#555] font-mono text-sm mb-6 block">05.</span>
              <h3 className="text-white font-medium text-lg mb-3">Enterprise Advisory</h3>
              <p className="text-white/70 text-[13px] font-light leading-relaxed mb-10">
                Long-form partnership for organisations navigating AI transformation at scale — governance, architecture, and continuity.
              </p>
            </div>

            {/* Graphic */}
            <div className="rounded-[6px] overflow-hidden">
              <img src="/images/tech-lab/enterprise-advisory.jpeg" alt="Enterprise Advisory" className="w-full h-auto rounded-[6px]" />
            </div>
          </SpotlightCard>

        </div>
      </div>
    </section>
  );
}
