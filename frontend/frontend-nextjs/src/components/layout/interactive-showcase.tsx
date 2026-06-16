'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

interface Product {
  id: string;
  step: string;
  title: string;
  desc: string;
  features: string[];
}

const products: Product[] = [
  {
    id: 'diagnostic',
    step: '01. DISCOVER',
    title: 'Deep Diagnostic',
    desc: 'We audit your current operations, constraints, and data accessibility. Rather than offering templates, we map out a customized assessment to establish a realistic readiness baseline before you write code or deploy models.',
    features: ['Operational Gaps Audit', 'Infrastructure Readiness', 'Constraint & Risk Check'],
  },
  {
    id: 'blueprint',
    step: '02. DESIGN',
    title: 'AI System Blueprint',
    desc: 'Aivory maps your diagnostic results into a recommended system architecture. This blueprint defines how data, processing layers, and automation models interface, creating a clear architectural blueprint tailored to your bottlenecks.',
    features: ['Data Pipeline Mapping', 'Integration Layers', 'Orchestration Blueprint'],
  },
  {
    id: 'roadmap',
    step: '03. PLAN',
    title: 'Implementation Roadmap',
    desc: 'A sequenced, phased plan designed to target your high-impact bottlenecks first. We split the implementation into manageable waves, ensuring each deployment phase reaches specific, measurable milestones.',
    features: ['Phased Deployment Waves', 'Milestone Checkpoints', 'Actionable Targets'],
  },
  {
    id: 'console',
    step: '04. CONTROL',
    title: 'AI Console',
    desc: 'A unified strategic interface. Query your systems, review diagnostic assessments, track operational telemetry, and instruct automated agents, keeping you in complete control from start to finish.',
    features: ['Conversational Consultation', 'System Telemetry', 'Agent Dispatch Control'],
  },
  {
    id: 'workflow',
    step: '05. BUILD',
    title: 'Workflow Builder',
    desc: 'Orchestrate operations visually. Link trigger conditions, processing layers, and applications together. The builder maps language commands into executable flows, automating tasks across your software stack.',
    features: ['Visual Flow Canvas', 'Multi-app Connections', 'Natural Language Translation'],
  },
];

/* ─── Demo Panel Sub-components ─── */

function IntroDemo() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 animate-fade-in">
      <h3
        className="!text-white text-center text-2xl md:text-3xl font-bold tracking-tight leading-tight"
        style={{ fontFamily: "'Doto', sans-serif" }}
      >
        YOUR AI<br />TRANSFORMATION<br />STARTS HERE
      </h3>
      <div className="flex gap-2 animate-fade-in-up">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="animate-bounce">
          <path d="M12 4v16m0 0l-6-6m6 6l6-6" stroke="#0ae8af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="animate-bounce [animation-delay:150ms]">
          <path d="M12 4v16m0 0l-6-6m6 6l6-6" stroke="#0ae8af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="animate-bounce [animation-delay:300ms]">
          <path d="M12 4v16m0 0l-6-6m6 6l6-6" stroke="#0ae8af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

function DiagnosticDemo() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (78 / 100) * circumference;

  const dimensions = [
    { label: 'Strategy', value: 80 },
    { label: 'Data Readiness', value: 75 },
    { label: 'Process Audit', value: 90 },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 animate-fade-in">
      {/* Score Gauge */}
      <div className="relative">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="45" fill="none" stroke="#333" strokeWidth="8" />
          <circle
            cx="60"
            cy="60"
            r="45"
            fill="none"
            stroke="#0ae8af"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={mounted ? offset : circumference}
            transform="rotate(-90 60 60)"
            style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
          />
        </svg>
        <span
          className="absolute inset-0 flex items-center justify-center !text-white text-2xl font-light"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          {mounted ? '78' : '0'}
        </span>
      </div>

      {/* Dimension Bars */}
      <div className="w-full max-w-[220px] flex flex-col gap-3">
        {dimensions.map((dim) => (
          <div key={dim.label} className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-white/50">
              <span>{dim.label}</span>
              <span>{dim.value}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#0ae8af] animate-scale-x origin-left"
                style={{ width: mounted ? `${dim.value}%` : '0%', transition: 'width 1.2s ease-out' }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BlueprintDemo() {
  const nodes = ['Ingest', 'Process', 'Engine', 'Action'];

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 animate-fade-in">
      <p className="text-xs text-white/40 uppercase tracking-widest mb-2">Pipeline Architecture</p>
      <div className="flex items-center gap-2">
        {nodes.map((node, i) => (
          <div key={node} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1 animate-fade-in-up" style={{ animationDelay: `${i * 150}ms` }}>
              <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <span className="text-[10px] !text-white font-medium">{node}</span>
              </div>
            </div>
            {i < nodes.length - 1 && (
              <div className="w-4 h-px bg-gradient-to-r from-[#0ae8af]/60 to-white/20" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function RoadmapDemo() {
  const waves = [
    { id: 'W1', label: 'Setup' },
    { id: 'W2', label: 'Automations' },
    { id: 'W3', label: 'Scale' },
  ];

  const milestones = ['Infrastructure Ready', 'First Automation Live', 'Full Scale Ops'];

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 animate-fade-in">
      {/* Wave Nodes */}
      <div className="flex items-center gap-4">
        {waves.map((wave, i) => (
          <div key={wave.id} className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-1 animate-fade-in-up" style={{ animationDelay: `${i * 200}ms` }}>
              <div className="w-12 h-12 rounded-full bg-[#0ae8af]/10 border border-[#0ae8af]/30 flex items-center justify-center">
                <span className="text-xs !text-white font-medium">{wave.id}</span>
              </div>
              <span className="text-[10px] text-white/50">{wave.label}</span>
            </div>
            {i < waves.length - 1 && (
              <div className="w-6 h-px bg-white/15" />
            )}
          </div>
        ))}
      </div>

      {/* Milestone Checklist */}
      <div className="flex flex-col gap-2 mt-2">
        {milestones.map((milestone, i) => (
          <div key={milestone} className="flex items-center gap-2 animate-fade-in-up" style={{ animationDelay: `${(i + 3) * 150}ms` }}>
            <div className="w-3 h-3 rounded-full border border-[#0ae8af]/50 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-[#0ae8af]" />
            </div>
            <span className="text-xs text-white/60">{milestone}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConsoleDemo() {
  return (
    <div className="flex flex-col justify-center h-full gap-3 px-4 animate-fade-in">
      <p className="text-xs text-white/40 uppercase tracking-widest mb-2">AI Console</p>

      {/* User message */}
      <div className="self-end max-w-[75%] rounded-2xl rounded-br-sm bg-white/10 px-3 py-2">
        <p className="text-xs !text-white">Show me current system performance metrics</p>
      </div>

      {/* Agent response */}
      <div className="self-start max-w-[80%] rounded-2xl rounded-bl-sm bg-[#0ae8af]/10 border border-[#0ae8af]/20 px-3 py-2 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
        <p className="text-[10px] text-[#0ae8af] font-medium mb-1">Agent Analysis</p>
        <p className="text-xs text-white/70">
          System load at 42%. 3 workflows active. Pipeline throughput: 1.2k events/min. No anomalies detected.
        </p>
      </div>
    </div>
  );
}

function WorkflowDemo() {
  const nodes = [
    { label: 'Trigger', color: 'bg-blue-500/20 border-blue-500/30' },
    { label: 'Process', color: 'bg-[#0ae8af]/20 border-[#0ae8af]/30' },
    { label: 'Action', color: 'bg-purple-500/20 border-purple-500/30' },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 animate-fade-in">
      <p className="text-xs text-white/40 uppercase tracking-widest mb-2">Generated Workflow</p>
      <div className="flex items-center gap-3">
        {nodes.map((node, i) => (
          <div key={node.label} className="flex items-center gap-3">
            <div className={`w-16 h-16 rounded-xl ${node.color} border flex items-center justify-center animate-fade-in-up`} style={{ animationDelay: `${i * 200}ms` }}>
              <span className="text-xs !text-white font-medium">{node.label}</span>
            </div>
            {i < nodes.length - 1 && (
              <svg width="20" height="12" viewBox="0 0 20 12" fill="none">
                <path d="M0 6h16m0 0l-4-4m4 4l-4 4" stroke="#0ae8af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Component ─── */

export function InteractiveShowcase() {
  const { ref: sectionRef, isVisible } = useScrollAnimation({ threshold: 0.05 });
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const productRefs = useRef<(HTMLDivElement | null)[]>([]);

  const setProductRef = useCallback((el: HTMLDivElement | null, index: number) => {
    productRefs.current[index] = el;
  }, []);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    productRefs.current.forEach((el, index) => {
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveIndex(index);
          }
        },
        { threshold: 0.5, rootMargin: '-20% 0px -20% 0px' }
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => {
      observers.forEach((obs) => obs.disconnect());
    };
  }, []);

  const renderDemo = () => {
    switch (activeIndex) {
      case 0:
        return <DiagnosticDemo />;
      case 1:
        return <BlueprintDemo />;
      case 2:
        return <RoadmapDemo />;
      case 3:
        return <ConsoleDemo />;
      case 4:
        return <WorkflowDemo />;
      default:
        return <IntroDemo />;
    }
  };

  return (
    <section
      ref={sectionRef}
      className="!bg-black !text-white py-16 md:py-32 border-b border-white/10"
      style={{
        fontFamily: "'Manrope', sans-serif",
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
        transition: 'opacity 0.8s ease, transform 0.8s ease',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
          {/* Left Column — Scrollable Content */}
          <div className="flex-1 lg:w-1/2">
            {/* Intro Block */}
            <div className="min-h-[40vh] flex flex-col justify-center mb-12">
              <h2
                className="text-3xl md:text-4xl lg:text-5xl font-light !text-white leading-tight mb-6"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                From Assessment to Staged Autonomy
              </h2>
              <p className="text-base md:text-lg text-white/55 font-light leading-relaxed max-w-xl">
                A complete system. Five integrated products that take you from diagnostic clarity to fully operational AI, sequenced for controlled, measurable progress.
              </p>
            </div>

            {/* Product Blocks */}
            {products.map((product, index) => (
              <div
                key={product.id}
                ref={(el) => setProductRef(el, index)}
                className="min-h-[50vh] flex flex-col justify-center py-12"
                style={{
                  opacity: activeIndex === index ? 1 : 0.3,
                  transition: 'opacity 0.5s ease',
                }}
              >
                <span className="text-xs uppercase tracking-widest text-[#c4c9b8] mb-4 block">
                  {product.step}
                </span>
                <h3
                  className="text-3xl font-light !text-white mb-4"
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                  {product.title}
                </h3>
                <p className="text-sm md:text-base text-white/55 font-light leading-relaxed mb-6 max-w-lg">
                  {product.desc}
                </p>
                <ul className="flex flex-col gap-2">
                  {product.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-white/70">
                      <span className="w-1 h-1 rounded-full bg-[#0ae8af]" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Right Column — Sticky Demo Panel (Desktop Only) */}
          <div className="hidden lg:block lg:w-1/2">
            <div className="lg:sticky lg:top-[12vh] h-[70vh]">
              <div className="bg-[#181818] border border-white/5 rounded-3xl h-full flex items-center justify-center p-8 overflow-hidden">
                {renderDemo()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
