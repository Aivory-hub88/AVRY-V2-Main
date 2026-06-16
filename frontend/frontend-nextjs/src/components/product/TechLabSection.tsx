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
          <span className="text-[#c4c9b8] uppercase tracking-widest text-xs font-manrope font-light mb-6">
            Built with you. Not just for you.
          </span>
          <img 
            src="/aivory-tech-lab-v2.svg" 
            alt="Aivory Tech Lab Logo" 
            className="w-32 md:w-48 lg:w-56 h-auto mb-2 md:mb-4 object-contain brightness-0 invert opacity-90"
          />
          <h2 className="text-4xl md:text-5xl font-light tracking-tight text-white leading-tight mb-4">
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
              <p className="text-white/50 text-[13px] font-light leading-relaxed mb-10">
                We design and build AI-native digital products — from architecture to deployment — as a dedicated creative and technical partner.
              </p>
            </div>
            
            {/* Graphic */}
            <div className="bg-[#0c0c0c] border-[0.5px] border-[#1a1a1a] rounded-[6px] p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between bg-[#111a11] border border-[#2a3a2a] p-2 rounded-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#3a6a3a]"></div>
                  <span className="text-[#8aaa8a] text-[10px] uppercase tracking-wider">AI Product Layer</span>
                </div>
                <span className="text-[#8aaa8a] text-[10px] border border-[#2a3a2a] px-1.5 py-0.5 rounded-[2px]">Interface</span>
              </div>
              <div className="flex items-center justify-between bg-[#141414] p-2 rounded-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#3a3a3a]"></div>
                  <span className="text-[#666] text-[10px] uppercase tracking-wider">Orchestration & Agents</span>
                </div>
                <span className="text-[#666] text-[10px] border border-[#2a2a2a] px-1.5 py-0.5 rounded-[2px]">Logic</span>
              </div>
              <div className="flex items-center justify-between bg-[#141414] p-2 rounded-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#2a2a2a]"></div>
                  <span className="text-[#555] text-[10px] uppercase tracking-wider">Data & Infrastructure</span>
                </div>
                <span className="text-[#555] text-[10px] border border-[#2a2a2a] px-1.5 py-0.5 rounded-[2px]">Foundation</span>
              </div>
            </div>
          </SpotlightCard>

          {/* Card 02 - col-span-2 */}
          <SpotlightCard className={`col-span-1 md:col-span-1 lg:col-span-2 p-8 justify-between ${inView ? 'opacity-100 animate-fade-in-up' : 'opacity-0'}`} style={{ animationDelay: '100ms' }}>
            <div>
              <span className="text-[#555] font-mono text-sm mb-6 block">02.</span>
              <h3 className="text-white font-medium text-lg mb-3">AI Strategy Consultation</h3>
              <p className="text-white/50 text-[13px] font-light leading-relaxed mb-10">
                One-on-one with an Aivory expert. Validate direction, identify leverage points, and leave with a plan worth executing.
              </p>
            </div>

            {/* Graphic */}
            <div className="bg-[#0c0c0c] border-[0.5px] border-[#1a1a1a] rounded-[6px] p-4">
              <div className="flex items-center justify-between mb-4 border-b border-[#1a1a1a] pb-3">
                <span className="text-[#555] text-[10px] uppercase tracking-widest font-medium">STRATEGY SESSION</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#3a6a3a] animate-pulse"></div>
                  <span className="text-[#3a6a3a] text-[10px] uppercase">Live</span>
                </div>
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1 bg-[#141414] h-10 rounded-sm flex items-center justify-center text-[10px] text-[#666] border border-[#1e1e1e]">You</div>
                <div className="w-[1px] h-6 bg-[#2a2a2a]"></div>
                <div className="flex-1 bg-[#141414] h-10 rounded-sm flex items-center justify-center text-[10px] text-[#8aaa8a] border border-[#2a3a2a]">AV</div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[#333] line-through text-[10px]">Current state audit</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#888] text-[10px]">AI opportunity mapping</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#444] text-[10px]">Prioritization & roadmap</span>
                </div>
              </div>
            </div>
          </SpotlightCard>

          {/* Card 03 - col-span-2 */}
          <SpotlightCard className={`col-span-1 md:col-span-2 lg:col-span-2 p-8 justify-between ${inView ? 'opacity-100 animate-fade-in-up' : 'opacity-0'}`} style={{ animationDelay: '200ms' }}>
            <div>
              <span className="text-[#555] font-mono text-sm mb-6 block">03.</span>
              <h3 className="text-white font-medium text-lg mb-3">Custom AI Development</h3>
              <p className="text-white/50 text-[13px] font-light leading-relaxed mb-10">
                Bespoke agents, workflows, and integrations — designed around your operations, built on enterprise-grade infrastructure.
              </p>
            </div>

            {/* Graphic */}
            <div className="bg-[#0c0c0c] border-[0.5px] border-[#1a1a1a] rounded-[6px] p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex-1 bg-[#141414] border border-[#1e1e1e] text-[#666] text-[9px] text-center py-1.5 rounded-sm">Your Data</div>
                <span className="text-[#333] text-[10px]">→</span>
                <div className="flex-1 bg-[#111a11] border border-[#2a3a2a] text-[#8aaa8a] text-[9px] text-center py-1.5 rounded-sm">AI Engine</div>
                <span className="text-[#333] text-[10px]">→</span>
                <div className="flex-1 bg-[#111a11] border border-[#2a3a2a] text-[#8aaa8a] text-[9px] text-center py-1.5 rounded-sm">Output</div>
              </div>
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="bg-[#141414] border border-[#1a1a1a] text-[#444] text-[9px] px-2 py-1 rounded-sm">CRM</div>
                <span className="text-[#333] text-[10px]">+</span>
                <div className="bg-[#141414] border border-[#1a1a1a] text-[#444] text-[9px] px-2 py-1 rounded-sm">Docs</div>
                <span className="text-[#333] text-[10px]">+</span>
                <div className="bg-[#141414] border border-[#1a1a1a] text-[#444] text-[9px] px-2 py-1 rounded-sm">API</div>
              </div>
              <div className="h-[1px] bg-[#1a1a1a] w-full mb-3" />
              <div className="flex flex-wrap justify-center gap-2">
                <span className="border border-[#1e2a1e] text-[#3a5a3a] text-[8px] uppercase px-1.5 py-0.5 rounded-[2px]">LOCAL INFRA</span>
                <span className="border border-[#1e2a1e] text-[#3a5a3a] text-[8px] uppercase px-1.5 py-0.5 rounded-[2px]">PRIVATE CLOUD</span>
                <span className="border border-[#1e2a1e] text-[#3a5a3a] text-[8px] uppercase px-1.5 py-0.5 rounded-[2px]">ENTERPRISE SECURITY</span>
              </div>
            </div>
          </SpotlightCard>

          {/* Card 04 - col-span-3 */}
          <SpotlightCard className={`col-span-1 md:col-span-1 lg:col-span-3 p-8 justify-between ${inView ? 'opacity-100 animate-fade-in-up' : 'opacity-0'}`} style={{ animationDelay: '300ms' }}>
            <div className="max-w-full lg:max-w-[80%]">
              <span className="text-[#555] font-mono text-sm mb-6 block">04.</span>
              <h3 className="text-white font-medium text-lg mb-3">Corporate Training</h3>
              <p className="text-white/50 text-[13px] font-light leading-relaxed mb-10">
                Structured programs for organizations embedding AI across teams — from executive alignment to hands-on implementation.
              </p>
            </div>

            {/* Graphic */}
            <div className="bg-[#0c0c0c] border-[0.5px] border-[#1a1a1a] rounded-[6px] p-4">
              <div className="flex flex-col gap-3 mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-[#8aaa8a] text-[12px]">✅</span>
                  <span className="text-[#444] line-through text-[11px]">AI Readiness Assessment</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[#8aaa8a] text-[12px]">✅</span>
                  <span className="text-[#444] line-through text-[11px]">Executive Workshop Series</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[#333] text-[12px]">☐</span>
                  <span className="text-[#888] text-[11px]">Team Certification Program</span>
                </div>
              </div>
              <div className="h-1 w-full bg-[#141414] rounded-full overflow-hidden">
                <div className="h-full bg-[#3a6a3a] transition-all duration-1000 ease-out w-0" style={{ width: inView ? '66%' : '0%' }}></div>
              </div>
            </div>
          </SpotlightCard>

          {/* Card 05 - col-span-3 */}
          <SpotlightCard className={`col-span-1 md:col-span-1 lg:col-span-3 p-8 justify-between ${inView ? 'opacity-100 animate-fade-in-up' : 'opacity-0'}`} style={{ animationDelay: '400ms' }}>
            <div className="max-w-full lg:max-w-[80%]">
              <span className="text-[#555] font-mono text-sm mb-6 block">05.</span>
              <h3 className="text-white font-medium text-lg mb-3">Enterprise Advisory</h3>
              <p className="text-white/50 text-[13px] font-light leading-relaxed mb-10">
                Long-form partnership for organizations navigating AI transformation at scale — governance, architecture, and continuity.
              </p>
            </div>

            {/* Graphic */}
            <div className="bg-[#0c0c0c] border-[0.5px] border-[#1a1a1a] rounded-[6px] p-4 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-[#555] text-[9px] font-medium tracking-widest uppercase">Client</span>
                <div className="bg-[#141414] border border-[#1e1e1e] text-[#777] text-[11px] p-2.5 rounded-[4px] rounded-tl-none w-11/12 leading-relaxed">
                  "How do we govern AI across 12 regional offices without losing velocity?"
                </div>
              </div>
              <div className="flex flex-col gap-1 items-end text-right">
                <span className="text-[#555] text-[9px] font-medium tracking-widest uppercase">Aivory™</span>
                <div className="bg-[#111a11] border border-[#2a3a2a] text-[#8aaa8a] text-[11px] p-2.5 rounded-[4px] rounded-tr-none w-11/12 leading-relaxed text-left">
                  "Federated model — central policy, local execution. We start by mapping your current decision topology."
                </div>
              </div>
            </div>
          </SpotlightCard>

        </div>
      </div>
    </section>
  );
}
