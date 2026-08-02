'use client';

import { useState, useEffect, useRef, MouseEvent } from 'react';
import { SpotlightButton } from '@/components/ui/SpotlightButton';
import { WorkflowAnimation } from './InteractiveShowcase';
import {
  DiagnosticAnimation,
  BlueprintAnimation,
  RoadmapAnimation,
  ConsoleAnimation,
} from './OperationalFrameworkScenes';
import dynamic from 'next/dynamic';

const LabFlaskCanvas = dynamic(
  () => import('./LabFlask3D').then((mod) => mod.LabFlaskCanvas),
  { ssr: false }
);

// Product context text
const showcaseProducts = [
  {
    step: '01. DISCOVER', title: 'Business Operations Assessment',
    description: (
      <>
        Every successful transformation begins with operational clarity. Assess how your business operates, identify what limits performance, and prioritise the improvements that create the greatest business impact.
      </>
    ),
  },
  {
    step: '02. DESIGN', title: 'Transformation Blueprint',
    description: 'Transform assessment insights into a practical roadmap for business improvement. Prioritise operational improvements, identify AI opportunities, and define a clear path from strategy to execution.',
  },
  {
    step: '03. PLAN', title: 'Transformation Roadmap',
    description: 'Turn strategy into action through a structured roadmap that prioritises operational improvements, delivers measurable milestones, and introduces AI where it creates the greatest business value.',
  },
  {
    step: '04. CONTROL', title: 'Operations Console',
    description: 'A unified executive workspace for monitoring operations, tracking transformation progress, and managing governed AI from a single place.',
  },
  {
    step: '05. BUILD', title: 'Workflow Builder',
    description: 'Say it, and it builds!. Turn business processes into intelligent workflows using plain language. No code, no complexity. Just faster execution across your existing systems.',
  },
];

// Spotlight Card
function SpotlightCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
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
      className={`spotlight-card rounded-2xl border border-white/5 bg-zinc-950/65 shadow-lg flex flex-col p-4 md:p-6 min-w-0 w-full ${className}`}
    >
      {children}
    </div>
  );
}


// ── Main Layout ──
const renderTitle = (title: string) => {
  const words = title.split(' ');
  if (words.length <= 1) return <span className="italic" style={{ color: '#e4effd' }}>{title}</span>;
  const lastWord = words.pop();
  return (
    <>
      {words.join(' ')} <span className="italic" style={{ color: '#e4effd' }}>{lastWord}</span>
    </>
  );
};

export function InteractiveGridShowcase() {
  return (
    <section id="framework" className="relative text-white py-24 md:py-32 overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        
        {/* Header */}
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <SpotlightButton 
            className="mb-6 pointer-events-auto hover:-translate-y-0" 
            style={{ 
              borderWidth: '0.5px', 
              borderStyle: 'solid', 
              borderColor: 'rgba(255,255,255,0.1)', 
              cursor: 'default' 
            }}
            icon={false}
          >
            Operational Framework
          </SpotlightButton>
          <h3 className="text-4xl md:text-5xl font-light tracking-normal mb-6 leading-tight" style={{ zoom: 0.7 }}>
            From Operational Clarity <br className="hidden md:block" />to <span className="italic" style={{ color: '#e4effd' }}>Intelligent Operations</span>
          </h3>
          <p className="text-white/75 font-light leading-relaxed">
            We guide organisations through every stage of transformation. From understanding how the business operates today to redesigning workflows and deploying governed AI that delivers measurable business outcomes.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
          
          {/* Card 1: Diagnostic */}
          <SpotlightCard className="col-span-1 md:col-span-1 lg:col-span-2">
            <div className="relative z-10 mb-4 flex-shrink-0">
              <span className="text-[#bbe2ef] text-[13px] font-medium tracking-[0.2em] mb-2 block uppercase" style={{ fontFamily: "'Doto', 'Courier New', monospace" }}>{showcaseProducts[0].step}</span>
              <h4 className="text-xl font-medium mb-2">{renderTitle(showcaseProducts[0].title)}</h4>
              <p className="text-white/70 text-[13px] font-light leading-relaxed">{showcaseProducts[0].description}</p>
            </div>
            <div className="relative z-10 flex-1 min-h-[260px] bg-gradient-to-br from-white/[0.04] to-transparent border border-white/10 rounded-xl mt-auto overflow-hidden backdrop-blur-sm min-w-0 w-full" style={{ zoom: 0.72 }}>
              <DiagnosticAnimation />
            </div>
          </SpotlightCard>

          {/* Card 2: Blueprint */}
          <SpotlightCard className="col-span-1 md:col-span-1 lg:col-span-2">
            <div className="relative z-10 mb-4 flex-shrink-0">
              <span className="text-[#bbe2ef] text-[13px] font-medium tracking-[0.2em] mb-2 block uppercase" style={{ fontFamily: "'Doto', 'Courier New', monospace" }}>{showcaseProducts[1].step}</span>
              <h4 className="text-xl font-medium mb-2">{renderTitle(showcaseProducts[1].title)}</h4>
              <p className="text-white/70 text-[13px] font-light leading-relaxed">{showcaseProducts[1].description}</p>
            </div>
            <div className="relative z-10 flex-1 min-h-[260px] bg-gradient-to-br from-white/[0.04] to-transparent border border-white/10 rounded-xl mt-auto overflow-hidden backdrop-blur-sm min-w-0 w-full" style={{ zoom: 0.72 }}>
              <BlueprintAnimation />
            </div>
          </SpotlightCard>

          {/* Card 3: Roadmap */}
          <SpotlightCard className="col-span-1 md:col-span-2 lg:col-span-2">
            <div className="relative z-10 mb-4 flex-shrink-0">
              <span className="text-[#bbe2ef] text-[13px] font-medium tracking-[0.2em] mb-2 block uppercase" style={{ fontFamily: "'Doto', 'Courier New', monospace" }}>{showcaseProducts[2].step}</span>
              <h4 className="text-xl font-medium mb-2">{renderTitle(showcaseProducts[2].title)}</h4>
              <p className="text-white/70 text-[13px] font-light leading-relaxed">{showcaseProducts[2].description}</p>
            </div>
            <div className="relative z-10 flex-1 min-h-[260px] bg-gradient-to-br from-white/[0.04] to-transparent border border-white/10 rounded-xl mt-auto overflow-hidden backdrop-blur-sm min-w-0 w-full" style={{ zoom: 0.72 }}>
              <RoadmapAnimation />
            </div>
          </SpotlightCard>

          {/* Card 4: Console */}
          <SpotlightCard className="col-span-1 md:col-span-1 lg:col-span-3">
            <div className="relative z-10 mb-4 flex-shrink-0">
              <span className="text-[#bbe2ef] text-[13px] font-medium tracking-[0.2em] mb-2 block uppercase" style={{ fontFamily: "'Doto', 'Courier New', monospace" }}>{showcaseProducts[3].step}</span>
              <h4 className="text-xl font-medium mb-2">{renderTitle(showcaseProducts[3].title)}</h4>
              <p className="text-white/70 text-[13px] font-light leading-relaxed max-w-md">{showcaseProducts[3].description}</p>
            </div>
            <div className="relative z-10 flex-1 min-h-[280px] bg-gradient-to-br from-white/[0.04] to-transparent border border-white/10 rounded-xl mt-auto overflow-hidden backdrop-blur-sm min-w-0 w-full" style={{ zoom: 0.82 }}>
              <ConsoleAnimation />
            </div>
          </SpotlightCard>

          {/* Card 5: Workflow */}
          <SpotlightCard className="col-span-1 md:col-span-1 lg:col-span-3">
            <div className="relative z-10 mb-4 flex-shrink-0">
              <span className="text-[#bbe2ef] text-[13px] font-medium tracking-[0.2em] mb-2 block uppercase" style={{ fontFamily: "'Doto', 'Courier New', monospace" }}>{showcaseProducts[4].step}</span>
              <h4 className="text-xl font-medium mb-2">{renderTitle(showcaseProducts[4].title)}</h4>
              <p className="text-white/70 text-[13px] font-light leading-relaxed max-w-md">{showcaseProducts[4].description}</p>
            </div>
            <div className="relative z-10 flex-1 min-h-[280px] bg-gradient-to-br from-white/[0.04] to-transparent border border-white/10 rounded-xl mt-auto overflow-hidden backdrop-blur-sm min-w-0 w-full" style={{ zoom: 0.82 }}>
              <WorkflowAnimation />
            </div>
          </SpotlightCard>

        </div>
      </div>
    </section>
  );
}
