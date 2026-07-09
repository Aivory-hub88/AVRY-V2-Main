'use client';

import { useState, useEffect, useRef, MouseEvent } from 'react';
import dynamic from 'next/dynamic';

const LabFlaskCanvas = dynamic(
  () => import('./LabFlask3D').then((mod) => mod.LabFlaskCanvas),
  { ssr: false }
);

// Product context text
const showcaseProducts = [
  {
    step: '01. DISCOVER', title: 'Deep Diagnostic',
    description: 'We audit your current operations, constraints, and data accessibility. We map out a customized assessment to establish a realistic readiness baseline.',
  },
  {
    step: '02. DESIGN', title: 'AI System Blueprint',
    description: 'Aivory maps your diagnostic results into a recommended system architecture, defining how data, processing layers, and automation models interface.',
  },
  {
    step: '03. PLAN', title: 'Implementation Roadmap',
    description: 'A sequenced, phased plan designed to target your high-impact bottlenecks first. We split the implementation into manageable deployment waves.',
  },
  {
    step: '04. CONTROL', title: 'AI Console',
    description: 'A unified strategic interface. Query your systems, review diagnostic assessments, track operational telemetry, and instruct automated agents.',
  },
  {
    step: '05. BUILD', title: 'Workflow Builder',
    description: 'Say it, and it builds. Plain language becomes executable automation — no code, no complexity, just intent turned into action across your entire stack.',
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
      className={`spotlight-card rounded-2xl border border-white/5 bg-zinc-950/65 shadow-lg flex flex-col p-6 ${className}`}
    >
      {children}
    </div>
  );
}

// ── 01. Diagnostic ──
const DIAGNOSTIC_STEPS = [
  {
    phase: '1/3 Business Objective',
    q: 'What is your primary business objective?',
    options: [
      'Reduce operational costs',
      'Scale without headcount growth',
      'Improve customer experience'
    ]
  },
  {
    phase: '2/3 Data Readiness',
    q: 'How centralized is your data?',
    options: [
      'Fully centralized',
      'Partially centralized',
      'Siloed across departments'
    ]
  },
  {
    phase: '3/3 Risk & Constraints',
    q: 'What is your risk tolerance?',
    options: [
      'High - willing to experiment',
      'Moderate - balanced approach',
      'Low - prefer proven solutions'
    ]
  }
];

const DIMS = [
  { label: 'Strategy', val: 65, delay: 0.2 },
  { label: 'Data Readiness', val: 45, delay: 0.5 },
  { label: 'Process Audit', val: 30, delay: 0.8 },
];

function DiagnosticAnimation() {
  const [phase, setPhase] = useState<'form' | 'thinking' | 'score' | 'improvements' | 'results'>('form');
  const [stepIdx, setStepIdx] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [dots, setDots] = useState('');
  const [scoreVal, setScoreVal] = useState(0);
  const [barsVisible, setBarsVisible] = useState(false);
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearAll = () => { timerRefs.current.forEach(clearTimeout); timerRefs.current = []; };
  const t = (fn: () => void, s: number) => timerRefs.current.push(setTimeout(fn, s * 1000));

  useEffect(() => {
    const run = () => {
      setPhase('form'); 
      setStepIdx(0); 
      setSelectedIdx(null);
      setScoreVal(0); 
      setBarsVisible(false);
      
      // Step 0
      t(() => setSelectedIdx(1), 0.8);
      
      // Step 1
      t(() => { setStepIdx(1); setSelectedIdx(null); }, 1.6);
      t(() => setSelectedIdx(1), 2.4);
      
      // Step 2
      t(() => { setStepIdx(2); setSelectedIdx(null); }, 3.2);
      t(() => setSelectedIdx(1), 4.0);
      
      // Thinking
      t(() => setPhase('thinking'), 4.8);
      
      // Score
      t(() => {
        setPhase('score');
        let v = 0;
        const step = () => { v += 2; setScoreVal(v); if (v < 42) timerRefs.current.push(setTimeout(step, 20)); else setScoreVal(42); };
        step();
        timerRefs.current.push(setTimeout(() => setBarsVisible(true), 300));
      }, 7.0);
      
      // Improvements
      t(() => setPhase('improvements'), 10.5);
      
      // Results
      t(() => setPhase('results'), 14.5);
      
      t(run, 19.5);
    };
    run();
    return clearAll;
  }, []);

  useEffect(() => {
    if (phase !== 'thinking') return;
    let i = 0;
    const id = setInterval(() => { i = (i + 1) % 4; setDots('.'.repeat(i)); }, 400);
    return () => clearInterval(id);
  }, [phase]);

  const currentStep = DIAGNOSTIC_STEPS[stepIdx];

  return (
    <div className="w-full flex-1 relative overflow-hidden grid place-items-center p-4">
      {/* Form & Thinking */}
      <div className={`col-start-1 row-start-1 flex flex-col justify-center w-full h-full transition-all duration-500 ${phase === 'score' || phase === 'improvements' ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
        
        {phase === 'form' && (
          <div className="flex flex-col gap-3 w-full max-w-[220px] mx-auto animate-fade-in-up">
            <div className="flex items-center justify-between">
               <span className="text-[9px] text-[#aec99d] font-medium tracking-wider uppercase">{currentStep.phase}</span>
            </div>
            <span className="text-[12px] text-white/90 leading-snug">{currentStep.q}</span>
            
            <div className="flex flex-col gap-1.5 mt-1">
              {currentStep.options.map((opt, i) => (
                <div 
                  key={i} 
                  className={`flex items-center gap-2 rounded-md px-2.5 py-2 border transition-all duration-300 ${
                    selectedIdx === i 
                      ? 'bg-[#aec99d]/10 border-[#aec99d]/30' 
                      : 'bg-white/5 border-white/5'
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full border flex items-center justify-center transition-colors shrink-0 ${
                    selectedIdx === i ? 'border-[#aec99d]' : 'border-white/30'
                  }`}>
                    {selectedIdx === i && <div className="w-1.5 h-1.5 bg-[#aec99d] rounded-full" />}
                  </div>
                  <span className={`text-[10px] ${selectedIdx === i ? 'text-[#aec99d]' : 'text-white/75'}`}>
                    {opt}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {phase === 'thinking' && (
          <div className="flex flex-col items-center justify-center gap-3 animate-fade-in-up">
            <div className="relative w-8 h-8 sm:w-10 sm:h-10 mb-1">
              {[
                { top: '5%', left: '50%', delay: 0 },
                { top: '27.5%', left: '89%', delay: 150 },
                { top: '72.5%', left: '89%', delay: 300 },
                { top: '95%', left: '50%', delay: 450 },
                { top: '72.5%', left: '11%', delay: 600 },
                { top: '27.5%', left: '11%', delay: 750 },
                { top: '50%', left: '50%', delay: 900 }
              ].map((pos, i) => (
                <div 
                  key={i}
                  className="absolute w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#aec99d] animate-loader-wave"
                  style={{
                    top: pos.top,
                    left: pos.left,
                    animationDelay: `${pos.delay}ms`
                  }}
                />
              ))}
            </div>
            <span className="text-[11px] text-[#aec99d]">Analyzing responses{dots}</span>
          </div>
        )}
      </div>

      {/* Score */}
      <div className={`col-start-1 row-start-1 flex flex-col justify-center items-center p-2 w-full h-full transition-all duration-500 delay-200 ${phase === 'score' ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
        <div className="relative w-16 h-16 flex items-center justify-center mb-4">
           <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
             <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
             <circle cx="50" cy="50" r="42" fill="none" stroke="#aec99d" strokeWidth="8" strokeDasharray={264} strokeDashoffset={barsVisible ? 264 - (264 * 0.42) : 264} className="transition-all duration-1000 ease-out" />
           </svg>
           <div className="absolute flex flex-col items-center">
             <span className="text-xl font-light text-white" style={{ fontFamily: "'Doto', 'Courier New', monospace" }}>{scoreVal}</span>
           </div>
        </div>
        <div className="w-full space-y-2.5 px-4">
          {DIMS.map((dim) => (
            <div key={dim.label} className={`text-[9px] space-y-1 transition-all duration-500 ${barsVisible ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: `${dim.delay}s` }}>
              <div className="flex justify-between text-white/85"><span>{dim.label}</span><span className="text-[#aec99d]">{dim.val}%</span></div>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden relative">
                <div className="absolute left-0 top-0 h-full bg-[#aec99d] rounded-full transition-all duration-700 ease-out" style={{ width: barsVisible ? `${dim.val}%` : '0%', transitionDelay: `${dim.delay}s` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Improvements */}
      <div className={`col-start-1 row-start-1 flex flex-col justify-center items-center p-4 w-full h-full transition-all duration-500 delay-200 ${phase === 'improvements' ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'}`}>
         <div className="w-full max-w-[220px] flex flex-col gap-3">
           <div className="text-center mb-1">
             <span className="text-[10px] text-[#ff7a7a] font-medium tracking-wider uppercase block mb-0.5">Critical Bottlenecks</span>
           </div>
           {[
             { title: 'Manual Data Entry', desc: 'Siloed data causing sync delays' },
             { title: 'Workflow Inefficiency', desc: 'High overhead to scale ops' }
           ].map((item, i) => (
             <div key={i} className="flex gap-2 items-start bg-red-500/5 border border-red-500/10 rounded-md p-2 animate-fade-in-up" style={{ animationDelay: `${i * 0.3}s` }}>
               <div className="w-1.5 h-1.5 mt-1 rounded-full bg-[#ff7a7a] shrink-0 animate-pulse" />
               <div className="flex flex-col">
                 <span className="text-[10px] text-white/90 font-medium">{item.title}</span>
                 <span className="text-[8px] text-white/70">{item.desc}</span>
               </div>
             </div>
           ))}
         </div>
      </div>

      {/* Results */}
      <div className={`col-start-1 row-start-1 flex flex-col justify-center items-center p-4 w-full h-full transition-all duration-500 delay-200 ${phase === 'results' ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'}`}>
        <div className="flex flex-col items-center gap-3 animate-fade-in-up">
          <div className="relative w-32 h-24 bg-[#0d0d0d] border border-white/10 rounded-lg shadow-xl overflow-hidden flex flex-col scale-110">
            <div className="absolute inset-0 bg-gradient-to-br from-[#aec99d]/10 to-transparent opacity-30" />
            <div className="h-4 border-b border-white/5 flex items-center px-2 bg-white/[0.02]">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
                <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
              </div>
            </div>
            <div className="p-2.5 flex items-center gap-2 relative">
              <div className="w-5 h-5 rounded flex items-center justify-center border border-[#aec99d]/30 bg-[#aec99d]/10 shrink-0">
                <svg className="w-3 h-3 text-[#aec99d]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              </div>
              <div className="flex flex-col gap-1.5 flex-1">
                <div className="h-[3px] w-[80%] rounded-full bg-[#aec99d]/60" />
                <div className="h-[3px] w-[40%] rounded-full bg-white/20 mt-0.5" />
              </div>
            </div>
            <div className="px-2.5 pb-2.5 pt-0.5 space-y-1.5">
              <div className="h-[3px] w-full rounded-full bg-white/12" />
              <div className="h-[3px] w-[86%] rounded-full bg-white/10" />
              <div className="h-[3px] w-[68%] rounded-full bg-white/10" />
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[7px] leading-none font-semibold text-[#aec99d] bg-[#aec99d]/12 border border-[#aec99d]/30 rounded px-1 py-[2px]">42%</span>
                <div className="flex-1 rounded-full bg-white/10 overflow-hidden h-[3px]">
                  <div className="h-full w-[42%] rounded-full bg-[#aec99d]/70" />
                </div>
              </div>
            </div>
            <div className="absolute inset-x-0 h-6 pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent, rgba(174,201,157,0.28), transparent)', animation: 'doc-scan 2.4s ease-in-out infinite' }} />
          </div>
          
          <div className="flex flex-col items-center mt-4 gap-1.5">
            <span className="text-[10px] text-[#aec99d]/90 uppercase tracking-[0.2em] font-medium px-4 py-1.5 bg-[#0d0d0d]/80 border border-[#aec99d]/20 rounded-full whitespace-nowrap backdrop-blur-sm shadow-[0_4px_12px_rgba(0,0,0,0.5)]">Deep Diagnostic Results</span>
            <span className="text-[18px] text-white/50 font-medium tracking-wide mt-1 animate-pulse">Blueprints are ready to generate</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 02. Blueprint ──
function BlueprintAnimation() {
  const [phase, setPhase] = useState<'import' | 'generate' | 'blueprint'>('import');
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearAll = () => { timerRefs.current.forEach(clearTimeout); timerRefs.current = []; };
  const t = (fn: () => void, s: number) => timerRefs.current.push(setTimeout(fn, s * 1000));

  useEffect(() => {
    const run = () => {
      setPhase('import');
      t(() => setPhase('generate'), 4.5);
      t(() => setPhase('blueprint'), 8.0);
      t(run, 16.0);
    };
    run();
    return clearAll;
  }, []);

  return (
    <div className="w-full flex-1 relative overflow-hidden grid place-items-center p-4">
      <style>{`
        @keyframes doc-ingest {
          0%   { transform: translate(-50%, -40px) scale(0.9) rotateX(-14deg); opacity: 0; filter: blur(4px); }
          12%  { transform: translate(-50%, 0px) scale(1) rotateX(0deg); opacity: 1; filter: blur(0px); }
          65%  { transform: translate(-50%, 0px) scale(1) rotateX(0deg); opacity: 1; filter: blur(0px); }
          78%  { transform: translate(-50%, 15px) scale(0.95); opacity: 1; filter: blur(0px); }
          86%  { transform: translate(-50%, 25px) scale(1.15); opacity: 0.9; filter: blur(2px); }
          92%  { transform: translate(-50%, 30px) scale(0.4); opacity: 0; filter: blur(8px); }
          100% { transform: translate(-50%, 30px) scale(0); opacity: 0; filter: blur(8px); }
        }
        @keyframes doc-float {
          0%, 100% { transform: translateY(0) rotate(-0.6deg); }
          50% { transform: translateY(-3px) rotate(0.6deg); }
        }
        @keyframes particle-shatter {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
          20% { transform: translate(calc(-50% + (var(--tx) * 0.4)), calc(-50% + (var(--ty) * 0.4))) scale(1.5); opacity: 1; }
          100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0); opacity: 0; }
        }
        @keyframes pulse-ring {
          0%, 82% { opacity: 0; transform: scale(0.4); }
          87% { opacity: 0.7; transform: scale(0.6); }
          100% { opacity: 0; transform: scale(1.75); }
        }
        @keyframes doc-scan {
          0% { transform: translateY(-24px); opacity: 0; }
          25% { opacity: 1; }
          75% { opacity: 1; }
          100% { transform: translateY(84px); opacity: 0; }
        }
        @keyframes fade-in-text {
          0%, 65% { opacity: 0; transform: translateY(15px); }
          75%, 100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes pop-in-pill {
          0% { opacity: 0; transform: translateY(20px) scale(0.9); }
          60% { opacity: 1; transform: translateY(-3px) scale(1.02); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes loading-bar {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        @keyframes blueprint-card-enter {
          0% { opacity: 0; transform: translateY(30px) scale(0.95); filter: blur(4px); }
          60% { opacity: 1; transform: translateY(-4px) scale(1.02); filter: blur(0px); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0px); }
        }
        @keyframes blueprint-header-enter {
          0% { opacity: 0; transform: translateY(-20px); letter-spacing: -2px; }
          100% { opacity: 1; transform: translateY(0); letter-spacing: 0.1em; }
        }
      `}</style>
      

      {/* Import & Generate Phases */}
      <div className={`col-start-1 row-start-1 flex flex-col items-center justify-center transition-all duration-500 w-full h-full z-10 ${phase === 'blueprint' ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
        
        {phase === 'import' && (
          <div className="flex flex-col items-center justify-center w-full">

            {/* Ingest stage: document glides down and shatters */}
            <div className="relative flex items-center justify-center w-full" style={{ height: '175px', perspective: '600px' }}>

              {/* Falling document */}
              <div
                className="absolute left-1/2 top-[10px] z-20 flex flex-col items-center gap-2"
                style={{ animation: 'doc-ingest 4.0s cubic-bezier(0.45,0,0.2,1) forwards', willChange: 'transform, opacity, filter' }}
              >
                {/* Diagnostic report card */}
                <div
                  className="relative w-[128px] rounded-lg overflow-hidden bg-gradient-to-b from-[#171b16] to-[#0c0e0b] border border-[#aec99d]/25"
                  style={{
                    boxShadow: '0 12px 28px -10px rgba(0,0,0,0.75), 0 0 18px rgba(174,201,157,0.14), inset 0 1px 0 rgba(255,255,255,0.06)',
                    animation: 'doc-float 3.2s ease-in-out infinite',
                  }}
                >
                  <div className="h-[3px] w-full bg-gradient-to-r from-[#aec99d]/40 via-[#aec99d] to-[#aec99d]/40" />
                  <div className="flex items-center gap-1.5 px-2.5 pt-2 pb-1">
                    <div className="w-5 h-5 rounded-md bg-[#aec99d]/12 border border-[#aec99d]/40 flex items-center justify-center text-[#aec99d] shrink-0">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="h-[5px] w-[64%] rounded-full bg-[#aec99d]/70" />
                      <div className="h-[3px] w-[40%] rounded-full bg-white/20 mt-1" />
                    </div>
                  </div>
                  <div className="px-2.5 pb-2.5 pt-0.5 space-y-[6px]">
                    <div className="h-[3px] w-full rounded-full bg-white/12" />
                    <div className="h-[3px] w-[86%] rounded-full bg-white/10" />
                    <div className="h-[3px] w-[68%] rounded-full bg-white/10" />
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <span className="text-[6px] leading-none font-semibold text-[#aec99d] bg-[#aec99d]/12 border border-[#aec99d]/30 rounded px-1 py-[2px]">42%</span>
                      <div className="h-[3px] flex-1 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full w-[42%] rounded-full bg-[#aec99d]/70" />
                      </div>
                    </div>
                  </div>
                  <div
                    className="absolute inset-x-0 h-6 pointer-events-none"
                    style={{ background: 'linear-gradient(to bottom, transparent, rgba(174,201,157,0.28), transparent)', animation: 'doc-scan 2.4s ease-in-out infinite' }}
                  />
                </div>
                <span className="text-[9px] text-[#aec99d]/90 uppercase tracking-[0.2em] font-medium px-2.5 py-0.5 bg-[#0d0d0d]/80 border border-white/5 rounded whitespace-nowrap backdrop-blur-sm shadow-[0_4px_12px_rgba(0,0,0,0.5)]">Deep Diagnostic Results</span>
              </div>

              {/* Shatter Particles */}
              {Array.from({ length: 24 }).map((_, i) => {
                const angle = (i * 137.5) * (Math.PI / 180); 
                const dist = 30 + (i % 5) * 20;
                const x = Math.cos(angle) * dist;
                const y = Math.sin(angle) * dist + (i % 3) * 25;
                return (
                  <div
                    key={`particle-${i}`}
                    className="absolute w-[3px] h-[3px] rounded-full bg-[#aec99d] z-30"
                    style={{
                      left: '50%',
                      top: 'calc(50% + 20px)',
                      '--tx': `${x}px`,
                      '--ty': `${y + 40}px`,
                      animation: `particle-shatter 1.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards`,
                      animationDelay: `${3.3 + (i % 4) * 0.04}s`,
                      opacity: 0,
                      boxShadow: '0 0 8px 1.5px rgba(174,201,157,0.8)'
                    } as React.CSSProperties}
                  />
                )
              })}

              {/* Ethereal Glow left behind */}
              <div 
                className="absolute left-1/2 top-[calc(50%+20px)] -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-[#aec99d] rounded-full blur-[40px] z-10 pointer-events-none"
                style={{ 
                  animation: 'pulse-ring 1.8s ease-out forwards',
                  animationDelay: '3.3s',
                  opacity: 0 
                }}
              />
            </div>

            <div className="flex flex-col items-center gap-3 z-10 relative mt-1 w-full">
              <span className="text-[10px] text-white/70 bg-[#111111]/80 px-3 py-1 rounded-full backdrop-blur-sm opacity-0 animate-[fade-in-text_4.5s_ease-out_forwards]">Engine processing from deep diagnostic result</span>
              <div className="flex flex-wrap justify-center gap-3 max-w-[240px]">
                <div className="bg-white/5 border border-white/10 rounded px-3 py-1.5 text-[10px] text-white/80 whitespace-nowrap opacity-0 animate-[pop-in-pill_0.6s_ease-out_forwards]" style={{ animationDelay: '3.6s' }}>Goal: Scale Ops</div>
                <div className="bg-white/5 border border-white/10 rounded px-3 py-1.5 text-[10px] text-white/80 whitespace-nowrap opacity-0 animate-[pop-in-pill_0.6s_ease-out_forwards]" style={{ animationDelay: '3.75s' }}>Data: Partially Centralized</div>
                <div className="bg-[#aec99d]/10 border border-[#aec99d]/30 rounded px-3 py-1.5 text-[10px] text-[#aec99d] shadow-[0_0_15px_rgba(174,201,157,0.15)] font-medium whitespace-nowrap opacity-0 animate-[pop-in-pill_0.6s_ease-out_forwards]" style={{ animationDelay: '3.9s' }}>Score: 42%</div>
              </div>
            </div>
          </div>
        )}

        {phase === 'generate' && (
          <div className="flex flex-col items-center justify-center gap-4 animate-fade-in-up mt-2">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <div className="absolute inset-[-10px] border border-[#aec99d]/20 rounded-full animate-ping opacity-20" />
              <div className="absolute inset-0 bg-[#aec99d]/5 rounded-full blur-xl" />
              <div className="w-full h-full flex items-center justify-center z-10">
                <LabFlaskCanvas />
              </div>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[11px] text-[#aec99d] uppercase tracking-widest font-medium">Brewing Blueprint</span>
              <div className="w-24 h-1 bg-white/10 rounded-full mt-3 overflow-hidden relative">
                <div className="h-full bg-[#aec99d] rounded-full animate-[loading-bar_3.5s_ease-in-out_forwards]" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Blueprint Layout */}
      <div className={`col-start-1 row-start-1 flex flex-col justify-center w-full h-full z-10 transition-opacity duration-300 ${phase === 'blueprint' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className={`flex flex-col items-center mb-6 ${phase === 'blueprint' ? 'animate-[blueprint-header-enter_0.8s_ease-out_forwards]' : 'opacity-0'}`}>
          <span className="text-[10px] text-[#aec99d] uppercase tracking-[0.1em] font-medium mb-1 drop-shadow-[0_0_8px_rgba(174,201,157,0.5)]">Tailored Blueprint</span>
          <span className="text-sm text-white font-light text-center">Ops Scaling Architecture</span>
        </div>

        {/* Contextual Mapping */}
        <div className="flex flex-col gap-3.5 w-full max-w-[300px] mx-auto">
           <style>{`
             @keyframes bp-flow { 0%{left:0%;opacity:0} 20%{opacity:1} 80%{opacity:1} 100%{left:100%;opacity:0} }
             @keyframes bp-chev { 0%,100%{opacity:0.4;transform:translateX(0)} 50%{opacity:1;transform:translateX(2px)} }
           `}</style>

           {/* Card 1 */}
           <div className={`group relative flex items-center gap-2 rounded-2xl p-3 border border-white/10 overflow-hidden bg-gradient-to-br from-white/[0.055] to-white/[0.015] ${phase === 'blueprint' ? 'animate-[blueprint-card-enter_0.7s_ease-out_forwards]' : 'opacity-0'}`} style={{ boxShadow: '0 10px 26px -14px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.06)', animationDelay: phase === 'blueprint' ? '0.2s' : '0s' }}>
              <div className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-full bg-white/20" />
              <div className="flex items-center gap-2 flex-1 min-w-0 pr-2 relative z-10">
                 <div className="w-6 h-6 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center text-white/70 shrink-0">
                   <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.86L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.86a2 2 0 00-3.4 0z"/></svg>
                 </div>
                 <div className="flex flex-col min-w-0">
                    <span className="text-[8px] text-white/65 uppercase tracking-wider mb-0.5">Constraint</span>
                    <span className="text-[11px] text-white/90 font-medium leading-snug truncate">Centralized Data</span>
                 </div>
              </div>
              <div className="relative w-[30px] sm:w-[40px] shrink-0 h-3 z-10 flex items-center mx-1 sm:mx-2">
                  <div className="relative h-[1px] w-full bg-white/20">
                     {/* Premium Node Connector (Mini) */}
                     <div className="absolute left-1/2 top-[0.5px] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                       <div className="absolute w-[18px] h-[18px] rounded-full border border-[#b2cca2]/40 animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite] opacity-60" />
                       <div className="absolute w-[10px] h-[10px] rounded-full border border-[#b2cca2]/60 bg-[#1c1c22]/80 backdrop-blur-md shadow-[0_0_6px_rgba(178,204,162,0.3)]" />
                       <div className="w-[4px] h-[4px] rounded-full bg-[#b2cca2] shadow-[0_0_8px_1px_rgba(178,204,162,1)] z-10" />
                     </div>
                  </div>
              </div>
              <div className="flex items-center gap-2 flex-1 min-w-0 pl-2 justify-end text-right relative z-10">
                 <div className="flex flex-col w-full text-right min-w-0">
                    <span className="text-[8px] text-[#aec99d]/80 uppercase tracking-wider mb-0.5">Resolution</span>
                    <span className="text-[11px] text-white/90 font-medium leading-snug truncate">Data Sync</span>
                 </div>
                 <div className="w-6 h-6 rounded-lg bg-[#aec99d]/12 border border-[#aec99d]/35 flex items-center justify-center text-[#aec99d] shrink-0">
                   <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5"/></svg>
                 </div>
              </div>
           </div>

           {/* Card 2 */}
           <div className={`group relative flex items-center gap-2 rounded-2xl p-3 border border-white/10 overflow-hidden bg-gradient-to-br from-white/[0.055] to-white/[0.015] ${phase === 'blueprint' ? 'animate-[blueprint-card-enter_0.7s_ease-out_forwards]' : 'opacity-0'}`} style={{ boxShadow: '0 10px 26px -14px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.06)', animationDelay: phase === 'blueprint' ? '0.4s' : '0s' }}>
              <div className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-full bg-white/20" />
              <div className="flex items-center gap-2 flex-1 min-w-0 pr-4 relative z-10">
                 <div className="w-6 h-6 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center text-white/70 shrink-0">
                   <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.2"/></svg>
                 </div>
                 <div className="flex flex-col min-w-0">
                    <span className="text-[8px] text-white/65 uppercase tracking-wider mb-0.5">Objective</span>
                    <span className="text-[11px] text-white/90 font-medium leading-snug truncate">Scale Ops</span>
                 </div>
              </div>
              <div className="relative w-[30px] sm:w-[40px] shrink-0 h-3 z-10 flex items-center mx-1 sm:mx-2">
                  <div className="relative h-[1px] w-full bg-white/20">
                     {/* Premium Node Connector (Mini) */}
                     <div className="absolute left-1/2 top-[0.5px] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                       <div className="absolute w-[18px] h-[18px] rounded-full border border-[#b2cca2]/40 animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite] opacity-60" style={{ animationDelay: '0.4s' }} />
                       <div className="absolute w-[10px] h-[10px] rounded-full border border-[#b2cca2]/60 bg-[#1c1c22]/80 backdrop-blur-md shadow-[0_0_6px_rgba(178,204,162,0.3)]" />
                       <div className="w-[4px] h-[4px] rounded-full bg-[#b2cca2] shadow-[0_0_8px_1px_rgba(178,204,162,1)] z-10" />
                     </div>
                  </div>
              </div>
              <div className="flex items-center gap-2 flex-1 min-w-0 pl-4 justify-end text-right relative z-10">
                 <div className="flex flex-col w-full text-right min-w-0">
                    <span className="text-[8px] text-[#aec99d]/80 uppercase tracking-wider mb-0.5">Deployment</span>
                    <span className="text-[11px] text-white/90 font-medium leading-snug truncate">Automated Triage Flow</span>
                 </div>
                 <div className="w-6 h-6 rounded-lg bg-[#aec99d]/12 border border-[#aec99d]/35 flex items-center justify-center text-[#aec99d] shrink-0">
                   <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5"/></svg>
                 </div>
              </div>
           </div>
        </div>
        
        <div className={`mt-6 text-center ${phase === 'blueprint' ? 'animate-[blueprint-card-enter_0.7s_ease-out_forwards]' : 'opacity-0'}`} style={{ animationDelay: phase === 'blueprint' ? '0.6s' : '0s' }}>
           <span className="text-[8px] sm:text-[9px] text-[#aec99d]/60 uppercase tracking-[0.15em] font-medium drop-shadow-sm">Aivory Engine Processing Capacity: 98% Efficiency</span>
        </div>
      </div>
    </div>
  );
}

// ── 03. Roadmap ──
function RoadmapAnimation() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const nextStep = () => setStep(s => (s >= 13 ? 0 : s + 1));
    const delays = [500, 1000, 800, 800, 1200, 1000, 800, 800, 1200, 1000, 800, 800, 2500, 500];
    timer = setTimeout(nextStep, delays[step] || 1000);
    return () => clearTimeout(timer);
  }, [step]);

  const waves = [
    { num: 'W1', name: 'Setup', activeStep: 1 },
    { num: 'W2', name: 'Automations', activeStep: 5 },
    { num: 'W3', name: 'Scale', activeStep: 9 },
  ];

  const waveData = [
    {
      title: 'Wave 1 Milestones',
      tasks: ['Diagnostic Baseline', 'Storage Schema', 'App Links']
    },
    {
      title: 'Wave 2 Milestones',
      tasks: ['Core Agent Logic', 'CRM Integration', 'Sandbox Deploy']
    },
    {
      title: 'Wave 3 Milestones',
      tasks: ['Prod Rollout', 'Monitor Workflows', 'Expand Depts']
    }
  ];

  let currentWaveIdx = 0;
  if (step >= 9) currentWaveIdx = 2;
  else if (step >= 5) currentWaveIdx = 1;
  const currentData = waveData[currentWaveIdx];

  let checkedCount = 0;
  if (step === 2 || step === 6 || step === 10) checkedCount = 1;
  if (step === 3 || step === 7 || step === 11) checkedCount = 2;
  if (step >= 4 && step < 5) checkedCount = 3;
  if (step >= 8 && step < 9) checkedCount = 3;
  if (step >= 12) checkedCount = 3;

  return (
    <div className="w-full h-full flex flex-col justify-center gap-4 p-4">
      <div className="flex items-center justify-between w-full relative px-6">
        <div className="absolute top-1/2 left-[36px] right-[36px] h-[1px] bg-white/10 -translate-y-1/2 -z-10" />
        <div className={`absolute top-1/2 left-[36px] right-1/2 h-[1px] bg-[#aec99d] -translate-y-1/2 -z-10 origin-left transition-all duration-700 ${step >= 5 ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'}`} />
        <div className={`absolute top-1/2 left-1/2 right-[36px] h-[1px] bg-[#aec99d] -translate-y-1/2 -z-10 origin-left transition-all duration-700 ${step >= 9 ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'}`} />

        {step >= 5 && (
          <span className="absolute top-1/2 left-[36px] right-1/2 -translate-y-1/2 h-[3px] overflow-hidden pointer-events-none">
            <span className="roadmap-comet" />
          </span>
        )}
        {step >= 9 && (
          <span className="absolute top-1/2 left-1/2 right-[36px] -translate-y-1/2 h-[3px] overflow-hidden pointer-events-none">
            <span className="roadmap-comet" />
          </span>
        )}

        {waves.map((wave, wi) => {
          const isActive = step >= wave.activeStep;
          const isCurrent = wi === currentWaveIdx && isActive;
          return (
            <div key={wave.name} className="flex flex-col items-center gap-1 transition-all duration-500">
              <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-[10px] transition-all duration-500 relative z-10 ${isActive ? 'border-[#aec99d] bg-[#111111] text-[#aec99d] font-semibold scale-110 shadow-[0_0_10px_rgba(174,201,157,0.3)]' : 'border-white/10 bg-[#111111] text-white/60 scale-100'}`} style={{ fontFamily: "'Doto', 'Courier New', monospace" }}>
                {isCurrent && <span className="roadmap-ping" />}
                {wave.num}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="relative mx-auto w-full max-w-[90%]">
        <div aria-hidden className="roadmap-glow absolute -inset-3 -z-10 rounded-2xl blur-lg" style={{ background: 'radial-gradient(circle at 50% 38%, rgba(174,201,157,0.16), transparent 70%)' }} />
        <div className="bg-[#111111] border border-white/5 rounded-xl p-4 w-full space-y-3 shadow-lg transition-all duration-500">
          <div key={currentWaveIdx} className="roadmap-title-in text-[9px] text-[#dfe2d8] uppercase tracking-[0.15em] font-medium font-manrope">
            {currentData.title}
          </div>
          <div className="flex flex-col gap-2">
            {currentData.tasks.map((task, idx) => {
              const isChecked = idx < checkedCount;
              return (
                <div key={idx} className="flex items-center gap-2.5 transition-all duration-300">
                  <div className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border transition-colors duration-300 ${isChecked ? 'bg-[#aec99d]/20 border-[#aec99d]' : 'border-white/10'}`}>
                    {isChecked && (
                      <svg key={`gchk-${currentWaveIdx}-${idx}`} className="roadmap-check-draw" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#aec99d" strokeWidth="3"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    )}
                  </div>
                  <span className={`text-[10px] transition-all duration-300 font-light ${isChecked ? 'text-white/50 line-through' : 'text-white/80'}`}>
                    {task}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 04. Console ──
function ConsoleAnimation() {
  const [phase, setPhase] = useState<
    'typing' | 'sent' | 'ai_typing' | 'ai_confirm' | 'user_typing_yes' | 'user_yes' | 'thinking' | 'response'
  >('typing');
  const [typedText, setTypedText] = useState('');
  const [typedYes, setTypedYes] = useState('');
  const [dots, setDots] = useState('');
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  const fullText = "Can you analyze my current lead generation process?";
  const yesText = "Run a full end-to-end audit please.";

  const clearAll = () => { timerRefs.current.forEach(clearTimeout); timerRefs.current = []; };
  const t = (fn: () => void, s: number) => timerRefs.current.push(setTimeout(fn, s * 1000));

  useEffect(() => {
    const run = () => {
      setPhase('typing');
      setTypedText('');
      setTypedYes('');
      let currentText = '';
      const typeChar = (i: number) => {
        if (i < fullText.length) {
          currentText += fullText[i];
          setTypedText(currentText);
          timerRefs.current.push(setTimeout(() => typeChar(i + 1), 30));
        } else {
          t(() => setPhase('sent'), 0.4);
          t(() => setPhase('ai_typing'), 0.8);
          t(() => setPhase('ai_confirm'), 2.0);
          
          let currentYes = '';
          const typeYes = (j: number) => {
            if (j < yesText.length) {
              currentYes += yesText[j];
              setTypedYes(currentYes);
              timerRefs.current.push(setTimeout(() => typeYes(j + 1), 40));
            } else {
              t(() => setPhase('user_yes'), 0.4);
              t(() => setPhase('thinking'), 0.8);
              t(() => setPhase('response'), 2.8);
              t(run, 14.0);
            }
          };
          
          t(() => { setPhase('user_typing_yes'); typeYes(0); }, 4.0);
        }
      };
      t(() => typeChar(0), 0.5);
    };
    run();
    return clearAll;
  }, []);

  useEffect(() => {
    if (phase !== 'thinking' && phase !== 'ai_typing') return;
    let i = 0;
    const id = setInterval(() => { i = (i + 1) % 4; setDots('.'.repeat(i)); }, 400);
    return () => clearInterval(id);
  }, [phase]);

  return (
    <div className="w-full h-full flex flex-col justify-end px-6 pb-8 pt-4 font-light relative">
      <div className="flex flex-col gap-3 w-full max-w-[100%] mx-auto mb-2">
        {/* User Message 1 */}
        <div className={`flex justify-end transition-all duration-300 ease-out ${phase !== 'typing' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="bg-[#2A2A2A] rounded-2xl rounded-tr-sm px-4 py-2 text-white/90 text-[12px] max-w-[90%] shadow-md">
            {fullText}
          </div>
        </div>

        {/* AI Typing Indicator */}
        <div className={`flex items-center gap-2 transition-all duration-300 ease-out ${phase === 'ai_typing' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 hidden'}`}>
           <div className="bg-[#111111] border border-white/5 rounded-2xl rounded-tl-sm px-4 py-2 sm:px-4 sm:py-2.5 shadow-sm flex items-center justify-center">
             <div className="relative w-5 h-5 opacity-80">
               {[
                 { top: '5%', left: '50%', delay: 0 },
                 { top: '27.5%', left: '89%', delay: 150 },
                 { top: '72.5%', left: '89%', delay: 300 },
                 { top: '95%', left: '50%', delay: 450 },
                 { top: '72.5%', left: '11%', delay: 600 },
                 { top: '27.5%', left: '11%', delay: 750 },
                 { top: '50%', left: '50%', delay: 900 }
               ].map((pos, i) => (
                 <div 
                   key={i}
                   className="absolute w-1 h-1 rounded-full bg-[#aec99d] animate-loader-wave"
                   style={{
                     top: pos.top,
                     left: pos.left,
                     animationDelay: `${pos.delay}ms`
                   }}
                 />
               ))}
             </div>
           </div>
        </div>

        {/* AI Confirmation */}
        <div className={`flex justify-start transition-all duration-300 ease-out ${['ai_confirm', 'user_typing_yes', 'user_yes', 'thinking', 'response'].includes(phase) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 hidden'}`}>
           <div className="bg-[#111111] border border-white/5 rounded-2xl rounded-tl-sm px-4 py-2 sm:px-4 sm:py-2.5 text-white/80 text-[12px] max-w-[90%] leading-relaxed shadow-md">
             Sure. Should I focus on a specific pipeline, or run a comprehensive end-to-end audit?
           </div>
        </div>

        {/* User Message 2 (Yes) */}
        <div className={`flex justify-end transition-all duration-300 ease-out ${['user_yes', 'thinking', 'response'].includes(phase) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 hidden'}`}>
           <div className="bg-[#2A2A2A] rounded-2xl rounded-tr-sm px-4 py-2 text-white/90 text-[12px] max-w-[90%] shadow-md">
             {yesText}
           </div>
        </div>
        
        {/* AI Thinking & Response */}
        <div className={`flex flex-col gap-3 transition-all duration-300 ${phase === 'thinking' || phase === 'response' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 hidden'}`}>
          {phase === 'thinking' && (
            <div className="flex items-center gap-3 mt-1">
              <div className="relative w-5 h-5 opacity-80">
                {[
                  { top: '5%', left: '50%', delay: 0 },
                  { top: '27.5%', left: '89%', delay: 150 },
                  { top: '72.5%', left: '89%', delay: 300 },
                  { top: '95%', left: '50%', delay: 450 },
                  { top: '72.5%', left: '11%', delay: 600 },
                  { top: '27.5%', left: '11%', delay: 750 },
                  { top: '50%', left: '50%', delay: 900 }
                ].map((pos, i) => (
                  <div 
                    key={i}
                    className="absolute w-1 h-1 rounded-full bg-[#aec99d] animate-loader-wave"
                    style={{
                      top: pos.top,
                      left: pos.left,
                      animationDelay: `${pos.delay}ms`
                    }}
                  />
                ))}
              </div>
              <div className="text-white/70 text-[11px] font-medium">Analyzing systems{dots}</div>
            </div>
          )}

          {phase === 'response' && (
            <div className="flex flex-col gap-2.5 pl-1 animate-fade-in-up mt-1">
              <div className="text-white/90 text-[11px] font-medium">Comprehensive audit complete:</div>
              {[
                { title: 'CRM Sync', desc: '520 leads analyzed. 45 entries delayed by >2hrs.', delay: '0s' },
                { title: 'Triage Flow', desc: '12 bottlenecks detected in manual validation step.', delay: '0.4s' },
                { title: 'Conversion', desc: 'Drop-off rate at stage 3 is 18% higher than benchmark.', delay: '0.8s' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2 opacity-0 animate-fade-in-up" style={{ animationDelay: item.delay }}>
                  <div className="w-1 h-1 rounded-full bg-[#aec99d] mt-1.5 shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-white/80 text-[11px] leading-snug">{item.title}: <span className="text-white/75">{item.desc}</span></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Chat Input Bar */}
      <div className="w-full bg-[#1A1A1A] rounded-xl border border-white/10 px-4 py-2.5 flex items-center shadow-lg mt-4 z-20 shrink-0">
        <div className="text-white/80 text-[12px] font-light min-h-[18px] flex items-center">
          {phase === 'typing' ? (
            <>
              {typedText}
              <span className="animate-pulse ml-0.5 inline-block w-[2px] h-3.5 bg-[#aec99d] translate-y-px"></span>
            </>
          ) : (
            <span className="text-white/50">Ask Aivory anything...</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 05. Workflow ──
function WorkflowAnimation() {
  const [phase, setPhase] = useState<
    'typing' | 'sent' | 'ai_typing' | 'ai_confirm' | 'user_typing_yes' | 'user_yes' | 'generating' | 'generated' | 'buttons'
  >('typing');
  const [typedText, setTypedText] = useState('');
  const [typedYes, setTypedYes] = useState('');
  const [dots, setDots] = useState('');
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  const fullText = "Create workflow to extract email leads and send them to Slack.";
  const yesText = "Yes, please.";

  const clearAll = () => { timerRefs.current.forEach(clearTimeout); timerRefs.current = []; };
  const t = (fn: () => void, s: number) => timerRefs.current.push(setTimeout(fn, s * 1000));

  useEffect(() => {
    const run = () => {
      setPhase('typing');
      setTypedText('');
      setTypedYes('');
      
      let currentText = '';
      const typeChar = (i: number) => {
        if (i < fullText.length) {
          currentText += fullText[i];
          setTypedText(currentText);
          timerRefs.current.push(setTimeout(() => typeChar(i + 1), 30));
        } else {
          t(() => setPhase('sent'), 0.4);
          t(() => setPhase('ai_typing'), 0.8);
          t(() => setPhase('ai_confirm'), 2.0);
          
          let currentYes = '';
          const typeYes = (j: number) => {
            if (j < yesText.length) {
              currentYes += yesText[j];
              setTypedYes(currentYes);
              timerRefs.current.push(setTimeout(() => typeYes(j + 1), 40));
            } else {
              t(() => setPhase('user_yes'), 0.4);
              t(() => setPhase('generating'), 0.8);
              t(() => setPhase('generated'), 2.8);
              t(() => setPhase('buttons'), 3.5);
              t(run, 9.0);
            }
          };
          
          t(() => { setPhase('user_typing_yes'); typeYes(0); }, 3.5);
        }
      };
      t(() => typeChar(0), 0.5);
    };
    run();
    return clearAll;
  }, []);

  useEffect(() => {
    if (phase !== 'generating' && phase !== 'ai_typing') return;
    let i = 0;
    const id = setInterval(() => { i = (i + 1) % 4; setDots('.'.repeat(i)); }, 400);
    return () => clearInterval(id);
  }, [phase]);

  return (
    <div className="w-full flex flex-col gap-4 h-full justify-end relative px-6 pb-8 pt-4 font-light">
      <div className="flex flex-col gap-3 sm:gap-4 w-full max-w-[100%] mx-auto mb-4">
        
        {/* User Message 1 */}
        <div className={`flex justify-end transition-all duration-300 ease-out ${phase !== 'typing' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
           <div className="bg-[#2A2A2A] rounded-3xl rounded-tr-md px-4 py-2 sm:px-5 sm:py-3 text-white/90 text-[12px] sm:text-[14px] max-w-[95%] sm:max-w-[90%] leading-relaxed shadow-md">
             {fullText}
           </div>
        </div>
        
        {/* AI Typing Indicator */}
        <div className={`flex items-center gap-2 transition-all duration-300 ease-out ${phase === 'ai_typing' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 hidden'}`}>
           <div className="bg-[#111111] border border-white/5 rounded-2xl rounded-tl-sm px-4 py-2 sm:px-4 sm:py-2.5 shadow-sm flex items-center justify-center">
             <div className="relative w-5 h-5 opacity-80">
               {[
                 { top: '5%', left: '50%', delay: 0 },
                 { top: '27.5%', left: '89%', delay: 150 },
                 { top: '72.5%', left: '89%', delay: 300 },
                 { top: '95%', left: '50%', delay: 450 },
                 { top: '72.5%', left: '11%', delay: 600 },
                 { top: '27.5%', left: '11%', delay: 750 },
                 { top: '50%', left: '50%', delay: 900 }
               ].map((pos, i) => (
                 <div 
                   key={i}
                   className="absolute w-1 h-1 rounded-full bg-[#aec99d] animate-loader-wave"
                   style={{
                     top: pos.top,
                     left: pos.left,
                     animationDelay: `${pos.delay}ms`
                   }}
                 />
               ))}
             </div>
           </div>
        </div>

        {/* AI Confirmation */}
        <div className={`flex justify-start transition-all duration-300 ease-out ${['ai_confirm', 'user_typing_yes', 'user_yes', 'generating', 'generated', 'buttons'].includes(phase) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 hidden'}`}>
           <div className="bg-[#111111] border border-white/5 rounded-3xl rounded-tl-md px-4 py-2 sm:px-5 sm:py-3 text-white/80 text-[12px] sm:text-[14px] max-w-[95%] sm:max-w-[90%] leading-relaxed shadow-md">
             I can help with that. I will configure a <b>Gmail</b> trigger, an AI extractor agent, and a <b>Slack</b> action. Proceed?
           </div>
        </div>

        {/* User Message 2 (Yes) */}
        <div className={`flex justify-end transition-all duration-300 ease-out ${['user_yes', 'generating', 'generated', 'buttons'].includes(phase) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 hidden'}`}>
           <div className="bg-[#2A2A2A] rounded-3xl rounded-tr-md px-4 py-2 sm:px-5 sm:py-3 text-white/90 text-[12px] sm:text-[14px] max-w-[95%] sm:max-w-[90%] leading-relaxed shadow-md">
             {yesText}
           </div>
        </div>

        {/* Generating Indicator */}
        <div className={`flex items-center gap-2.5 transition-all duration-300 ${phase === 'generating' || phase === 'generated' || phase === 'buttons' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 hidden'}`}>
           {phase === 'generating' ? (
             <>
               <div className="relative w-5 h-5 opacity-80 shrink-0">
                 {[
                   { top: '5%', left: '50%', delay: 0 },
                   { top: '27.5%', left: '89%', delay: 150 },
                   { top: '72.5%', left: '89%', delay: 300 },
                   { top: '95%', left: '50%', delay: 450 },
                   { top: '72.5%', left: '11%', delay: 600 },
                   { top: '27.5%', left: '11%', delay: 750 },
                   { top: '50%', left: '50%', delay: 900 }
                 ].map((pos, i) => (
                   <div 
                     key={i}
                     className="absolute w-1 h-1 rounded-full bg-[#aec99d] animate-loader-wave"
                     style={{
                       top: pos.top,
                       left: pos.left,
                       animationDelay: `${pos.delay}ms`
                     }}
                   />
                 ))}
               </div>
               <span className="text-white/70 text-[12px] sm:text-[13px] font-medium">Aivory is generating workflow<span className="animate-pulse">{dots}</span></span>
             </>
           ) : null}
        </div>

        {/* Generated Flow */}
        {(phase === 'generated' || phase === 'buttons') && (
          <div className="w-full bg-[#111111] border border-white/5 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 sm:gap-5 relative overflow-hidden shadow-2xl animate-fade-in-up">
            <div className="text-[9px] sm:text-[10px] text-white uppercase tracking-widest text-center font-light z-10" style={{ fontFamily: "'Doto', 'Courier New', monospace" }}>
              Workflow Generated
            </div>

            <div className="flex items-center justify-between w-full max-w-[330px] mx-auto z-10 relative">
              <style>{`
                @keyframes node-flow-a { 0%{left:22%;opacity:0} 12%{opacity:1} 88%{opacity:1} 100%{left:50%;opacity:0} }
                @keyframes node-flow-b { 0%{left:50%;opacity:0} 12%{opacity:1} 88%{opacity:1} 100%{left:78%;opacity:0} }
                @keyframes node-pop { 0%{opacity:0;transform:translateY(10px) scale(0.94)} 60%{opacity:1;transform:translateY(-2px) scale(1.015)} 100%{opacity:1;transform:translateY(0) scale(1)} }
              `}</style>

              {/* Connecting rail */}
              <div className="absolute top-1/2 left-[16%] right-[16%] h-[2px] bg-white/8 -translate-y-1/2 -z-10 rounded-full" />
              <div className="absolute top-1/2 left-[16%] right-[52%] h-[2px] -translate-y-1/2 -z-10 origin-left animate-scale-x rounded-full" style={{ background: 'linear-gradient(to right, rgba(174,201,157,0.15), rgba(174,201,157,0.9))' }} />
              <div className="absolute top-1/2 left-[50%] right-[16%] h-[2px] -translate-y-1/2 -z-10 origin-left animate-scale-x rounded-full" style={{ background: 'linear-gradient(to right, rgba(174,201,157,0.9), rgba(193,204,200,0.15))', animationDelay: '0.4s' }} />
              <span className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#aec99d] -z-10" style={{ boxShadow: '0 0 8px #aec99d', animation: 'node-flow-a 2.6s ease-in-out infinite' }} />
              <span className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#c1ccc8] -z-10" style={{ boxShadow: '0 0 8px #c1ccc8', animation: 'node-flow-b 2.6s ease-in-out infinite', animationDelay: '0.5s' }} />

              {/* Node 1: Trigger (Gmail) */}
              <div className="relative flex flex-col items-center w-[82px] sm:w-[96px] rounded-2xl pt-2 pb-2.5 px-2 bg-gradient-to-b from-[#23262b] to-[#15171b] border border-white/10 z-10" style={{ boxShadow: '0 10px 24px -8px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.06)', animation: 'node-pop 0.6s ease-out both' }}>
                <span className="absolute top-1/2 -translate-y-1/2 -right-[6px] w-3 h-3 rounded-full bg-[#0c0d0f] border-2 border-[#aec99d] z-20" />
                <div className="flex items-center gap-1 mb-1.5">
                  <span className="w-1 h-1 rounded-full bg-[#aec99d]" />
                  <span className="text-[6.5px] sm:text-[8px] uppercase tracking-[0.14em] text-white/65 font-semibold">Trigger</span>
                </div>
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center bg-white shadow-[0_2px_6px_rgba(0,0,0,0.35)] mb-1.5">
                  <img src="/integrations/icons/gmail.svg" alt="Gmail" className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
                </div>
                <span className="text-[10px] sm:text-[12px] font-semibold text-white leading-none">Gmail</span>
              </div>

              {/* Node 2: AI Agent (Extract) */}
              <div className="relative flex flex-col items-center w-[82px] sm:w-[96px] rounded-2xl pt-2 pb-2.5 px-2 z-20 border border-[#aec99d]/30 bg-gradient-to-b from-[#23262b] to-[#15171b]" style={{ boxShadow: '0 10px 26px -8px rgba(0,0,0,0.7), 0 0 20px rgba(174,201,157,0.16), inset 0 1px 0 rgba(255,255,255,0.06)', animation: 'node-pop 0.6s ease-out 0.2s both' }}>
                <span className="absolute top-[-4px] right-[-4px] w-3 h-3 rounded-full bg-[#aec99d] animate-ping z-30" />
                <span className="absolute top-[-4px] right-[-4px] w-3 h-3 rounded-full bg-[#aec99d] border border-[#0c0d0f] z-30" />
                <span className="absolute top-1/2 -translate-y-1/2 -left-[6px] w-3 h-3 rounded-full bg-[#0c0d0f] border-2 border-[#aec99d] z-20" />
                <span className="absolute top-1/2 -translate-y-1/2 -right-[6px] w-3 h-3 rounded-full bg-[#0c0d0f] border-2 border-[#c1ccc8] z-20" />
                <div className="flex items-center gap-1 mb-1.5">
                  <span className="w-1 h-1 rounded-full bg-[#aec99d]" />
                  <span className="text-[6.5px] sm:text-[8px] uppercase tracking-[0.14em] text-[#aec99d]/80 font-semibold">AI Agent</span>
                </div>
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#aec99d] to-[#7f9a6e] shadow-[0_2px_6px_rgba(0,0,0,0.35)] mb-1.5">
                  <svg className="w-[18px] h-[18px] text-[#111]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.6 4.6L18 8.2l-4.4 1.6L12 14l-1.6-4.2L6 8.2l4.4-1.6L12 2zm6 10l.9 2.5L21 15.4l-2.1.9L18 19l-.9-2.7L15 15.4l2.1-.9L18 12zM6 13l.8 2.2L9 16l-2.2.8L6 19l-.8-2.2L3 16l2.2-.8L6 13z"/></svg>
                </div>
                <span className="text-[10px] sm:text-[12px] font-semibold text-white leading-none">Extract</span>
              </div>

              {/* Node 3: Action (Slack) */}
              <div className="relative flex flex-col items-center w-[82px] sm:w-[96px] rounded-2xl pt-2 pb-2.5 px-2 bg-gradient-to-b from-[#23262b] to-[#15171b] border border-white/10 z-10" style={{ boxShadow: '0 10px 24px -8px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.06)', animation: 'node-pop 0.6s ease-out 0.6s both' }}>
                <span className="absolute top-1/2 -translate-y-1/2 -left-[6px] w-3 h-3 rounded-full bg-[#0c0d0f] border-2 border-[#c1ccc8] z-20" />
                <div className="flex items-center gap-1 mb-1.5">
                  <span className="w-1 h-1 rounded-full bg-[#c1ccc8]" />
                  <span className="text-[6.5px] sm:text-[8px] uppercase tracking-[0.14em] text-white/65 font-semibold">Action</span>
                </div>
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center bg-white shadow-[0_2px_6px_rgba(0,0,0,0.35)] mb-1.5">
                  <img src="/integrations/icons/slack.svg" alt="Slack" className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
                </div>
                <span className="text-[10px] sm:text-[12px] font-semibold text-white leading-none">Slack</span>
              </div>
            </div>

            {/* Buttons sequence */}
            {(phase === 'buttons' || phase === 'generated') && (
              <div className={`flex items-center justify-center gap-3 mt-1 opacity-0 ${phase === 'buttons' ? 'animate-fade-in-up opacity-100' : ''}`} style={{ animationFillMode: 'forwards' }}>
                <button className="bg-transparent border border-white/20 hover:bg-white/10 text-white/80 text-[10px] sm:text-xs py-1.5 px-4 sm:px-5 rounded-full transition-colors font-medium">
                  Download JSON
                </button>
                <button className="bg-[#c1ccc8] hover:bg-[#aab5b1] text-black text-[10px] sm:text-xs py-1.5 px-4 sm:px-5 rounded-full transition-colors font-semibold shadow-[0_0_10px_rgba(193,204,200,0.3)]">
                  Deploy to n8n
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chat Input Bar */}
      <div className="w-full bg-[#1A1A1A] rounded-xl border border-white/10 px-4 py-2.5 flex items-center shadow-lg mt-auto z-20 shrink-0">
        <div className="text-white/80 text-[12px] sm:text-[13px] font-light min-h-[18px] flex items-center">
          {phase === 'typing' ? (
            <>
              {typedText}
              <span className="animate-pulse ml-0.5 inline-block w-[2px] h-3.5 sm:h-4 bg-[#aec99d] translate-y-px"></span>
            </>
          ) : (
            <span className="text-white/50">Ask Aivory anything...</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Layout ──
export function InteractiveGridShowcase() {
  return (
    <section id="framework" className="relative text-white py-24 md:py-32 overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        
        {/* Header */}
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <h2 className="text-[#dfe2d8] uppercase tracking-widest text-xs font-manrope font-light mb-3">
            Operational Framework
          </h2>
          <h3 className="text-4xl md:text-5xl font-light tracking-tight mb-6 leading-tight">
            From Assessment <br className="hidden md:block" />to Staged Autonomy
          </h3>
          <p className="text-white/75 font-light leading-relaxed">
            We take you step-by-step from auditing bottlenecks to running customized, automated system workflows. Explore the core product layers.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
          
          {/* Card 1: Diagnostic */}
          <SpotlightCard className="col-span-1 md:col-span-1 lg:col-span-2">
            <div className="relative z-10 mb-4 flex-shrink-0">
              <span className="text-[#b2cca2] text-[13px] font-medium tracking-[0.2em] mb-2 block uppercase" style={{ fontFamily: "'Doto', 'Courier New', monospace" }}>{showcaseProducts[0].step}</span>
              <h4 className="text-xl font-medium text-white mb-2">{showcaseProducts[0].title}</h4>
              <p className="text-white/70 text-[13px] font-light leading-relaxed">{showcaseProducts[0].description}</p>
            </div>
            <div className="relative z-10 flex-1 min-h-[260px] bg-[#0A0A0A] border border-white/5 rounded-xl mt-auto overflow-hidden">
              <DiagnosticAnimation />
            </div>
          </SpotlightCard>

          {/* Card 2: Blueprint */}
          <SpotlightCard className="col-span-1 md:col-span-1 lg:col-span-2">
            <div className="relative z-10 mb-4 flex-shrink-0">
              <span className="text-[#b2cca2] text-[13px] font-medium tracking-[0.2em] mb-2 block uppercase" style={{ fontFamily: "'Doto', 'Courier New', monospace" }}>{showcaseProducts[1].step}</span>
              <h4 className="text-xl font-medium text-white mb-2">{showcaseProducts[1].title}</h4>
              <p className="text-white/70 text-[13px] font-light leading-relaxed">{showcaseProducts[1].description}</p>
            </div>
            <div className="relative z-10 flex-1 min-h-[260px] bg-[#0A0A0A] border border-white/5 rounded-xl mt-auto overflow-hidden">
              <BlueprintAnimation />
            </div>
          </SpotlightCard>

          {/* Card 3: Roadmap */}
          <SpotlightCard className="col-span-1 md:col-span-2 lg:col-span-2">
            <div className="relative z-10 mb-4 flex-shrink-0">
              <span className="text-[#b2cca2] text-[13px] font-medium tracking-[0.2em] mb-2 block uppercase" style={{ fontFamily: "'Doto', 'Courier New', monospace" }}>{showcaseProducts[2].step}</span>
              <h4 className="text-xl font-medium text-white mb-2">{showcaseProducts[2].title}</h4>
              <p className="text-white/70 text-[13px] font-light leading-relaxed">{showcaseProducts[2].description}</p>
            </div>
            <div className="relative z-10 flex-1 min-h-[260px] bg-[#0A0A0A] border border-white/5 rounded-xl mt-auto overflow-hidden">
              <RoadmapAnimation />
            </div>
          </SpotlightCard>

          {/* Card 4: Console */}
          <SpotlightCard className="col-span-1 md:col-span-1 lg:col-span-3">
            <div className="relative z-10 mb-4 flex-shrink-0">
              <span className="text-[#b2cca2] text-[13px] font-medium tracking-[0.2em] mb-2 block uppercase" style={{ fontFamily: "'Doto', 'Courier New', monospace" }}>{showcaseProducts[3].step}</span>
              <h4 className="text-xl font-medium text-white mb-2">{showcaseProducts[3].title}</h4>
              <p className="text-white/70 text-[13px] font-light leading-relaxed max-w-md">{showcaseProducts[3].description}</p>
            </div>
            <div className="relative z-10 flex-1 min-h-[280px] bg-[#0A0A0A] border border-white/5 rounded-xl mt-auto overflow-hidden">
              <ConsoleAnimation />
            </div>
          </SpotlightCard>

          {/* Card 5: Workflow */}
          <SpotlightCard className="col-span-1 md:col-span-1 lg:col-span-3">
            <div className="relative z-10 mb-4 flex-shrink-0">
              <span className="text-[#b2cca2] text-[13px] font-medium tracking-[0.2em] mb-2 block uppercase" style={{ fontFamily: "'Doto', 'Courier New', monospace" }}>{showcaseProducts[4].step}</span>
              <h4 className="text-xl font-medium text-white mb-2">{showcaseProducts[4].title}</h4>
              <p className="text-white/70 text-[13px] font-light leading-relaxed max-w-md">{showcaseProducts[4].description}</p>
            </div>
            <div className="relative z-10 flex-1 min-h-[280px] bg-[#0A0A0A] border border-white/5 rounded-xl mt-auto overflow-hidden">
              <WorkflowAnimation />
            </div>
          </SpotlightCard>

        </div>
      </div>
    </section>
  );
}
