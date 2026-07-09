'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

const LabFlaskCanvas = dynamic(
  () => import('./LabFlask3D').then((mod) => mod.LabFlaskCanvas),
  { ssr: false }
);

function SpotlightCard({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
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
      className={`relative spotlight-card border-t border-l border-white/10 border-b border-r border-black/20 shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden rounded-[24px] ${className}`}
      style={{
        backgroundColor: 'var(--card-bg, rgba(28, 28, 34, 0.45))',
        backdropFilter: 'var(--card-frost, blur(2.5px))',
        WebkitBackdropFilter: 'var(--card-frost, blur(2.5px))',
        ...style
      }}
    >
      {children}
    </div>
  );
}

// Product data with simplified context
const showcaseProducts = [
  {
    id: 'diagnostic',
    step: '01. DISCOVER',
    title: 'Deep Diagnostic',
    description: (
      <>
        In this stage, Aivory runs a deep diagnostic across your current operations, constraints, and data environment to understand where AI can create the most impact. <span className="font-semibold text-white">Using a high-intelligence deterministic engine</span>, it maps readiness, surfaces execution gaps, and identifies the conditions needed to move forward faster without relying on long traditional consulting cycles.
      </>
    ),
    features: ['Operational Gaps Audit', 'Infrastructure Readiness', 'Constraint & Risk Check'],
  },
  {
    id: 'blueprint',
    step: '02. DESIGN',
    title: 'AI System Blueprint',
    description:
      'Aivory maps your diagnostic results into a recommended system architecture. This blueprint defines how data, processing layers, and automation models interface, creating a clear architectural blueprint tailored to your bottlenecks.',
    features: ['Data Pipeline Mapping', 'Integration Layers', 'Orchestration Blueprint'],
  },
  {
    id: 'roadmap',
    step: '03. PLAN',
    title: 'Implementation Roadmap',
    description:
      'A sequenced, phased plan designed to target your high-impact bottlenecks first. We split the implementation into manageable waves, ensuring each deployment phase reaches specific, measurable milestones.',
    features: ['Phased Deployment Waves', 'Milestone Checkpoints', 'Actionable Targets'],
  },
  {
    id: 'console',
    step: '04. CONTROL',
    title: 'AI Console',
    description:
      'A unified strategic interface. Query your systems, review diagnostic assessments, track operational telemetry, and instruct automated agents, keeping you in complete control from start to finish.',
    features: ['Conversational Consultation', 'System Telemetry', 'Agent Dispatch Control'],
  },
  {
    id: 'workflow',
    step: '05. BUILD',
    title: 'Workflow Builder',
    description:
      'Say it, and it builds. Plain language becomes executable automation — no code, no complexity, just intent turned into action across your entire stack.',
    features: ['Natural Language → Live Workflow', 'No Code, No Setup Friction', 'Connects Your Entire Stack'],
  },
];

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
    <div className="flex-1 w-full min-h-[320px] relative overflow-hidden grid place-items-center p-4">
      {/* Form & Thinking */}
      <div className={`col-start-1 row-start-1 flex flex-col justify-center w-full h-full transition-all duration-500 ${phase === 'score' || phase === 'improvements' ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
        
        {phase === 'form' && (
          <div className="flex flex-col gap-4 w-full max-w-[320px] mx-auto animate-fade-in-up">
            <div className="flex items-center justify-between">
               <span className="text-[10px] sm:text-xs text-[#aec99d] font-medium tracking-wider uppercase">{currentStep.phase}</span>
            </div>
            <span className="text-sm sm:text-base text-white/90 font-medium leading-snug">{currentStep.q}</span>
            
            <div className="flex flex-col gap-2 mt-2">
              {currentStep.options.map((opt, i) => (
                <div 
                  key={i} 
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 border transition-all duration-300 ${
                    selectedIdx === i 
                      ? 'bg-[#aec99d]/10 border-[#aec99d]/30 shadow-[0_0_10px_rgba(174,201,157,0.1)]' 
                      : 'bg-white/5 border-white/5'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors shrink-0 ${
                    selectedIdx === i ? 'border-[#aec99d]' : 'border-white/30'
                  }`}>
                    {selectedIdx === i && <div className="w-2 h-2 bg-[#aec99d] rounded-full" />}
                  </div>
                  <span className={`text-xs sm:text-sm ${selectedIdx === i ? 'text-[#aec99d]' : 'text-white/75'}`}>
                    {opt}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {phase === 'thinking' && (
          <div className="flex flex-col items-center justify-center gap-4 animate-fade-in-up">
            <div className="relative w-12 h-12 sm:w-16 sm:h-16 mb-2">
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
                  className="absolute w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full bg-[#aec99d] animate-loader-wave"
                  style={{
                    top: pos.top,
                    left: pos.left,
                    animationDelay: `${pos.delay}ms`
                  }}
                />
              ))}
            </div>
            <span className="text-sm sm:text-base text-[#aec99d] font-medium tracking-wide">Aivory is analyzing responses{dots}</span>
          </div>
        )}
      </div>

      {/* Score */}
      <div className={`col-start-1 row-start-1 flex flex-col justify-center items-center p-2 w-full h-full transition-all duration-500 delay-200 ${phase === 'score' ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
        <div className="relative w-28 h-28 flex items-center justify-center mb-8">
           <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
             <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
             <circle cx="50" cy="50" r="42" fill="none" stroke="#aec99d" strokeWidth="6" strokeDasharray={264} strokeDashoffset={barsVisible ? 264 - (264 * 0.42) : 264} className="transition-all duration-1000 ease-out drop-shadow-[0_0_8px_rgba(174,201,157,0.4)]" />
           </svg>
           <div className="absolute flex flex-col items-center">
             <span className="text-3xl font-light text-white" style={{ fontFamily: "'Doto', 'Courier New', monospace" }}>{scoreVal}</span>
           </div>
        </div>
        <div className="w-full space-y-4 px-6 max-w-[80%] md:max-w-sm">
          {DIMS.map((dim) => (
            <div key={dim.label} className={`text-xs space-y-1.5 transition-all duration-500 ${barsVisible ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: `${dim.delay}s` }}>
              <div className="flex justify-between text-white/85 font-light"><span>{dim.label}</span><span className="text-[#aec99d]">{dim.val}%</span></div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden relative">
                <div className="absolute left-0 top-0 h-full bg-[#aec99d] rounded-full transition-all duration-700 ease-out" style={{ width: barsVisible ? `${dim.val}%` : '0%', transitionDelay: `${dim.delay}s` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Improvements */}
      <div className={`col-start-1 row-start-1 flex flex-col justify-center items-center p-4 w-full h-full transition-all duration-500 delay-200 ${phase === 'improvements' ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'}`}>
         <div className="w-full max-w-[80%] md:max-w-sm flex flex-col gap-4">
           <div className="text-center mb-2">
             <span className="text-sm sm:text-base text-[#ff7a7a] font-medium tracking-wider uppercase mb-1 block">Critical Bottlenecks</span>
             <span className="text-xs text-white/70">Immediate action recommended</span>
           </div>
           {[
             { title: 'Manual Data Entry', desc: 'Siloed data causing sync delays' },
             { title: 'Workflow Inefficiency', desc: 'High overhead to scale ops' }
           ].map((item, i) => (
             <div key={i} className="flex gap-3 items-start bg-red-500/5 border border-red-500/10 rounded-lg p-3 animate-fade-in-up" style={{ animationDelay: `${i * 0.3}s` }}>
               <div className="w-2 h-2 mt-1.5 rounded-full bg-[#ff7a7a] shrink-0 animate-pulse" />
               <div className="flex flex-col gap-0.5">
                 <span className="text-sm text-white/90 font-medium">{item.title}</span>
                 <span className="text-xs text-white/70">{item.desc}</span>
               </div>
             </div>
           ))}
         </div>
      </div>

      {/* Results */}
      <div className={`col-start-1 row-start-1 flex flex-col justify-center items-center p-4 w-full h-full transition-all duration-500 delay-200 ${phase === 'results' ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'}`}>
        <div className="flex flex-col items-center gap-3 animate-fade-in-up">
          <div className="relative flex flex-col items-center gap-3 z-20">
            <div 
              className="relative w-36 h-[104px] bg-[#111111] border border-white/10 rounded-xl overflow-hidden flex flex-col"
              style={{
                boxShadow: '0 14px 34px -10px rgba(0,0,0,0.75), 0 0 22px rgba(174,201,157,0.14), inset 0 1px 0 rgba(255,255,255,0.06)',
                animation: 'doc-float 3.2s ease-in-out infinite',
              }}
            >
              {/* top accent bar */}
              <div className="h-[3px] w-full bg-gradient-to-r from-[#aec99d]/40 via-[#aec99d] to-[#aec99d]/40" />
              {/* header */}
              <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5">
                <div className="w-6 h-6 rounded-md bg-[#aec99d]/12 border border-[#aec99d]/40 flex items-center justify-center text-[#aec99d] shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="h-[6px] w-[64%] rounded-full bg-[#aec99d]/70" />
                  <div className="h-[4px] w-[40%] rounded-full bg-white/20 mt-1.5" />
                </div>
              </div>
              {/* content skeleton lines */}
              <div className="px-3 pb-3 pt-1 space-y-[7px]">
                <div className="h-[4px] w-full rounded-full bg-white/12" />
                <div className="h-[4px] w-[86%] rounded-full bg-white/10" />
                <div className="h-[4px] w-[68%] rounded-full bg-white/10" />
                {/* mini score row */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[7px] leading-none font-semibold text-[#aec99d] bg-[#aec99d]/12 border border-[#aec99d]/30 rounded px-1.5 py-[3px]">42%</span>
                  <div className="h-[4px] flex-1 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full w-[42%] rounded-full bg-[#aec99d]/70" />
                  </div>
                </div>
              </div>
              {/* scanning light */}
              <div
                className="absolute inset-x-0 h-7 pointer-events-none"
                style={{ background: 'linear-gradient(to bottom, transparent, rgba(174,201,157,0.28), transparent)', animation: 'doc-scan 2.4s ease-in-out infinite' }}
              />
            </div>
            <span className="text-[10px] sm:text-[11px] text-[#aec99d]/90 uppercase tracking-[0.22em] font-medium px-4 py-1.5 bg-[#0d0d0d]/80 border border-white/5 rounded-full whitespace-nowrap backdrop-blur-sm shadow-[0_4px_12px_rgba(0,0,0,0.5)]">Deep Diagnostic Results</span>
            <span className="text-[19px] text-white/50 font-medium tracking-wide mt-1 animate-pulse">Blueprints are ready to generate</span>
          </div>
        </div>
      </div>
    </div>
  );
}

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
    <div className="w-full h-full flex flex-col justify-end pb-6 sm:pb-20 p-4 font-light relative">
      <div className="flex flex-col gap-3 w-full max-w-[100%] mx-auto mb-2">
        {/* User Message 1 */}
        <div className={`flex justify-end transition-all duration-300 ease-out ${phase !== 'typing' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="bg-[#2A2A2A] rounded-2xl rounded-tr-sm px-4 py-2 sm:px-5 sm:py-2.5 text-white/90 text-[12px] sm:text-[14px] max-w-[90%] shadow-md">
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
           <div className="bg-[#111111] border border-white/5 rounded-2xl rounded-tl-sm px-4 py-2 sm:px-4 sm:py-3 text-white/80 text-[12px] sm:text-[14px] max-w-[90%] leading-relaxed shadow-md">
             Sure. Should I focus on a specific pipeline, or run a comprehensive end-to-end audit?
           </div>
        </div>

        {/* User Message 2 (Yes) */}
        <div className={`flex justify-end transition-all duration-300 ease-out ${['user_yes', 'thinking', 'response'].includes(phase) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 hidden'}`}>
           <div className="bg-[#2A2A2A] rounded-2xl rounded-tr-sm px-4 py-2 sm:px-5 sm:py-2.5 text-white/90 text-[12px] sm:text-[14px] max-w-[90%] shadow-md">
             {yesText}
           </div>
        </div>

        {/* AI Thinking & Response */}
        <div className={`flex flex-col gap-3 transition-all duration-300 ${phase === 'thinking' || phase === 'response' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 hidden'}`}>
          {phase === 'thinking' && (
            <div className="flex items-center gap-2 mt-1">
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
              <div className="text-white/70 text-[11px] sm:text-[12px] font-medium">Analyzing systems{dots}</div>
            </div>
          )}

          {phase === 'response' && (
            <div className="flex flex-col gap-2.5 pl-1 animate-fade-in-up mt-1">
              <div className="text-white/90 text-[12px] sm:text-[13px] font-medium">Comprehensive audit complete:</div>
              {[
                { title: 'CRM Sync', desc: '520 leads analyzed. 45 entries delayed by >2hrs.', delay: '0s' },
                { title: 'Triage Flow', desc: '12 bottlenecks detected in manual validation step.', delay: '0.4s' },
                { title: 'Conversion', desc: 'Drop-off rate at stage 3 is 18% higher than benchmark.', delay: '0.8s' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2 opacity-0 animate-fade-in-up" style={{ animationDelay: item.delay }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-[#aec99d] mt-1.5 shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-white/80 text-[12px] sm:text-[13px] leading-snug">{item.title}: <span className="text-white/75">{item.desc}</span></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-4 left-4 right-4 bg-[#222222] border border-white/5 rounded-full pl-3 pr-2 py-2 flex items-center gap-3 shadow-lg">
        <button className="w-7 h-7 rounded-full flex items-center justify-center text-white/60 hover:text-white/85 transition-colors shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14m-7-7h14" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div className="flex-1 text-[14px] truncate flex items-center transition-colors">
          {phase === 'typing' ? (
            <span className="text-white/90">{typedText}<span className="ml-[2px] w-[2px] h-3.5 bg-white/60 animate-pulse inline-block align-middle" /></span>
          ) : (
            <span className="text-white/50">What do you want to know?</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button className="w-7 h-7 flex items-center justify-center text-white/70 hover:text-white/80 transition-colors hidden sm:flex">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <button className="w-8 h-8 rounded-full bg-[#a3aa96] flex items-center justify-center text-[#494949] hover:bg-[#8f9681] transition-colors">
            {phase === 'typing' || phase === 'thinking' ? (
              <div className="w-3 h-3 bg-black rounded-[2px]" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
            )}
          </button>
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
    <div className="w-full flex flex-col gap-4 h-full justify-end relative pb-6 sm:pb-20 p-4 font-light">
      <div className="flex flex-col gap-3 sm:gap-4 w-full max-w-[100%] mx-auto mb-4">
        {/* User Message 1 */}
        <div className={`flex justify-end transition-all duration-300 ease-out ${phase !== 'typing' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
           <div className="bg-[#2A2A2A] rounded-3xl rounded-tr-md px-4 py-2 sm:px-5 sm:py-3 text-white/90 text-[12px] sm:text-[14px] max-w-[95%] sm:max-w-[90%] leading-relaxed shadow-md">
             {fullText}
           </div>
        </div>

        {/* AI Typing Indicator */}
        <div className={`flex items-center gap-2 transition-all duration-300 ease-out ${phase === 'ai_typing' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 hidden'}`}>
           <div className="bg-[#111111] border border-white/5 rounded-3xl rounded-tl-md px-4 py-2 sm:px-4 sm:py-2.5 shadow-sm flex items-center justify-center">
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
          <SpotlightCard className="w-full p-4 sm:p-5 flex flex-col gap-4 sm:gap-5 relative shadow-2xl animate-fade-in-up">
            <div className="text-[9px] sm:text-[10px] text-white uppercase tracking-widest text-center font-light z-10" style={{ fontFamily: "'Doto', 'Courier New', monospace" }}>
              Workflow Generated
            </div>

            <div className="flex items-center justify-between w-full max-w-[400px] mx-auto z-10 relative">
              <style>{`
                @keyframes node-flow-continuous { 0%{left:10%;opacity:0} 10%{opacity:1} 90%{opacity:1} 100%{left:90%;opacity:0} }
                @keyframes node-pop { 0%{opacity:0;transform:translateY(10px) scale(0.94)} 60%{opacity:1;transform:translateY(-2px) scale(1.015)} 100%{opacity:1;transform:translateY(0) scale(1)} }
              `}</style>

              {/* Connecting rail */}
              <div className="absolute top-1/2 left-[10%] right-[10%] h-[1px] bg-white/10 -translate-y-1/2 -z-10 rounded-full" />
              
              {/* Glowing continuous line */}
              <div className="absolute top-1/2 left-[10%] right-[10%] h-[2px] -translate-y-1/2 -z-10 origin-left animate-scale-x rounded-full" style={{ background: 'linear-gradient(to right, rgba(174,201,157,0.1), rgba(174,201,157,0.8), rgba(193,204,200,0.1))', animationDuration: '0.8s' }} />
              
              {/* flowing data dots */}
              <span className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#aec99d] -z-10" style={{ boxShadow: '0 0 12px 2px #aec99d', animation: 'node-flow-continuous 1.2s ease-in-out infinite' }} />
              <span className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#c1ccc8] -z-10" style={{ boxShadow: '0 0 12px 2px #c1ccc8', animation: 'node-flow-continuous 1.2s ease-in-out infinite', animationDelay: '0.6s' }} />

              {/* Node 1: Trigger (Gmail) */}
              <div className="relative flex flex-col items-center w-[86px] sm:w-[100px] rounded-2xl pt-2 pb-2.5 px-2 bg-gradient-to-b from-[#23262b] to-[#15171b] border border-white/10 z-10" style={{ boxShadow: '0 10px 24px -8px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.06)', animation: 'node-pop 0.6s ease-out both' }}>
                {/* output handle */}
                <span className="absolute top-1/2 -translate-y-1/2 -right-[6px] w-3 h-3 rounded-full bg-[#0c0d0f] border-2 border-[#aec99d] z-20" />
                <div className="flex items-center gap-1 mb-1.5">
                  <span className="w-1 h-1 rounded-full bg-[#aec99d]" />
                  <span className="text-[6.5px] sm:text-[8px] uppercase tracking-[0.14em] text-white/65 font-semibold">Trigger</span>
                </div>
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center bg-white shadow-[0_2px_6px_rgba(0,0,0,0.35)] mb-1.5">
                  <img src="/integrations/icons/gmail.svg" alt="Gmail" className="w-5 h-5 sm:w-[22px] sm:h-[22px]" />
                </div>
                <span className="text-[10px] sm:text-[12px] font-semibold text-white leading-none">Gmail</span>
              </div>

              {/* Node 2: AI Agent (Extract) */}
              <div className="relative flex flex-col items-center w-[86px] sm:w-[100px] rounded-2xl pt-2 pb-2.5 px-2 z-20 border border-[#aec99d]/30 bg-gradient-to-b from-[#23262b] to-[#15171b]" style={{ boxShadow: '0 10px 26px -8px rgba(0,0,0,0.7), 0 0 20px rgba(174,201,157,0.16), inset 0 1px 0 rgba(255,255,255,0.06)', animation: 'node-pop 0.6s ease-out 0.2s both' }}>
                {/* live indicator */}
                <span className="absolute top-[-4px] right-[-4px] w-3 h-3 rounded-full bg-[#aec99d] animate-ping z-30" />
                <span className="absolute top-[-4px] right-[-4px] w-3 h-3 rounded-full bg-[#aec99d] border border-[#0c0d0f] z-30" />
                {/* handles both sides */}
                <span className="absolute top-1/2 -translate-y-1/2 -left-[6px] w-3 h-3 rounded-full bg-[#0c0d0f] border-2 border-[#aec99d] z-20" />
                <span className="absolute top-1/2 -translate-y-1/2 -right-[6px] w-3 h-3 rounded-full bg-[#0c0d0f] border-2 border-[#c1ccc8] z-20" />
                <div className="flex items-center gap-1 mb-1.5">
                  <span className="w-1 h-1 rounded-full bg-[#aec99d]" />
                  <span className="text-[6.5px] sm:text-[8px] uppercase tracking-[0.14em] text-[#aec99d]/80 font-semibold">AI Agent</span>
                </div>
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#aec99d] to-[#7f9a6e] shadow-[0_2px_6px_rgba(0,0,0,0.35)] mb-1.5">
                  <svg className="w-5 h-5 text-[#111]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.6 4.6L18 8.2l-4.4 1.6L12 14l-1.6-4.2L6 8.2l4.4-1.6L12 2zm6 10l.9 2.5L21 15.4l-2.1.9L18 19l-.9-2.7L15 15.4l2.1-.9L18 12zM6 13l.8 2.2L9 16l-2.2.8L6 19l-.8-2.2L3 16l2.2-.8L6 13z"/></svg>
                </div>
                <span className="text-[10px] sm:text-[12px] font-semibold text-white leading-none">Extract</span>
              </div>

              {/* Node 3: Action (Slack) */}
              <div className="relative flex flex-col items-center w-[86px] sm:w-[100px] rounded-2xl pt-2 pb-2.5 px-2 bg-gradient-to-b from-[#23262b] to-[#15171b] border border-white/10 z-10" style={{ boxShadow: '0 10px 24px -8px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.06)', animation: 'node-pop 0.6s ease-out 0.6s both' }}>
                {/* input handle */}
                <span className="absolute top-1/2 -translate-y-1/2 -left-[6px] w-3 h-3 rounded-full bg-[#0c0d0f] border-2 border-[#c1ccc8] z-20" />
                <div className="flex items-center gap-1 mb-1.5">
                  <span className="w-1 h-1 rounded-full bg-[#c1ccc8]" />
                  <span className="text-[6.5px] sm:text-[8px] uppercase tracking-[0.14em] text-white/65 font-semibold">Action</span>
                </div>
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center bg-white shadow-[0_2px_6px_rgba(0,0,0,0.35)] mb-1.5">
                  <img src="/integrations/icons/slack.svg" alt="Slack" className="w-5 h-5 sm:w-[22px] sm:h-[22px]" />
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
          </SpotlightCard>
        )}
      </div>

      <div className="absolute bottom-4 left-4 right-4 bg-[#222222] border border-white/5 rounded-full pl-3 pr-2 py-2 flex items-center gap-3 shadow-lg">
        <button className="w-7 h-7 rounded-full flex items-center justify-center text-white/60 hover:text-white/85 transition-colors shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14m-7-7h14" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div className="flex-1 text-[14px] truncate flex items-center transition-colors">
          {phase === 'typing' ? (
            <span className="text-white/90">{typedText}<span className="ml-[2px] w-[2px] h-3.5 bg-white/60 animate-pulse inline-block align-middle" /></span>
          ) : (
            <span className="text-white/50">What do you want to automate?</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button className="w-8 h-8 rounded-full bg-[#a3aa96] flex items-center justify-center text-[#494949] hover:bg-[#8f9681] transition-colors">
            {phase === 'typing' || phase === 'generating' ? (
              <div className="w-3 h-3 bg-black rounded-[2px]" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function RoadmapAnimation() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const nextStep = () => setStep(s => (s >= 13 ? 0 : s + 1));
    
    const delays = [
      500,  // 0 -> 1: W1
      1000, // 1 -> 2: Task 1
      800,  // 2 -> 3: Task 2
      800,  // 3 -> 4: Task 3
      1200, // 4 -> 5: W2
      1000, // 5 -> 6: Task 1
      800,  // 6 -> 7: Task 2
      800,  // 7 -> 8: Task 3
      1200, // 8 -> 9: W3
      1000, // 9 -> 10: Task 1
      800,  // 10 -> 11: Task 2
      800,  // 11 -> 12: Task 3
      2500, // 12 -> 13: Hold
      500,  // 13 -> 0: Reset
    ];

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
      title: 'Wave 1 Milestone Action List',
      tasks: [
        'Finalize Diagnostic Baseline Parameters',
        'Map Centralized Data Storage Schema',
        'Establish Slack / Email Communication Links'
      ]
    },
    {
      title: 'Wave 2 Milestone Action List',
      tasks: [
        'Implement Core Agent Logic',
        'Connect CRM and Internal Tools',
        'Deploy Sandbox Environment'
      ]
    },
    {
      title: 'Wave 3 Milestone Action List',
      tasks: [
        'Rollout to Production',
        'Monitor and Optimize Workflows',
        'Expand to Additional Departments'
      ]
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
    <div className="flex-1 flex flex-col justify-center space-y-8 w-full h-full relative z-10">
      {/* Top nodes */}
      <div className="flex items-center justify-between w-full mx-auto relative px-8">
        <div className="absolute top-1/2 left-[52px] right-[52px] h-[1px] bg-white/10 -translate-y-1/2 -z-10" />
        
        {/* Progress Line W1 to W2 */}
        <div className={`absolute top-1/2 left-[52px] right-1/2 h-[1px] bg-[#aec99d] -translate-y-1/2 -z-10 origin-left transition-all duration-700 ${step >= 5 ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'}`} />
        
        {/* Progress Line W2 to W3 */}
        <div className={`absolute top-1/2 left-1/2 right-[52px] h-[1px] bg-[#aec99d] -translate-y-1/2 -z-10 origin-left transition-all duration-700 ${step >= 9 ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'}`} />

        {/* Traveling light pulses that ride the connectors as each wave unlocks */}
        {step >= 5 && (
          <span className="absolute top-1/2 left-[52px] right-1/2 -translate-y-1/2 h-[3px] overflow-hidden pointer-events-none">
            <span className="roadmap-comet" />
          </span>
        )}
        {step >= 9 && (
          <span className="absolute top-1/2 left-1/2 right-[52px] -translate-y-1/2 h-[3px] overflow-hidden pointer-events-none">
            <span className="roadmap-comet" />
          </span>
        )}

        {waves.map((wave, wi) => {
          const isActive = step >= wave.activeStep;
          const isCurrent = wi === currentWaveIdx && isActive;
          return (
            <div key={wave.name} className="flex flex-col items-center gap-2 transition-all duration-500">
              <div className={`w-10 h-10 rounded-full border flex items-center justify-center text-xs transition-all duration-500 relative z-10 ${
                isActive ? 'border-[#aec99d] bg-[#111111] text-[#aec99d] font-semibold scale-110 shadow-[0_0_15px_rgba(174,201,157,0.3)]' : 'border-white/10 bg-[#111111] text-white/60 scale-100'
              }`} style={{ fontFamily: "'Doto', 'Courier New', monospace" }}>
                {isCurrent && <span className="roadmap-ping" />}
                {wave.num}
              </div>
              <span className={`text-[10px] font-light transition-colors duration-500 ${isActive ? 'text-white/80' : 'text-white/70'}`}>{wave.name}</span>
            </div>
          );
        })}
      </div>

      {/* Deliverables list */}
      <div className="relative mx-auto w-full max-w-md">
        <div aria-hidden className="roadmap-glow absolute -inset-4 -z-10 rounded-3xl blur-xl" style={{ background: 'radial-gradient(circle at 50% 38%, rgba(174,201,157,0.18), transparent 70%)' }} />
        <SpotlightCard className="p-6 w-full space-y-4 shadow-lg transition-all duration-500">
          <div key={currentWaveIdx} className="roadmap-title-in text-[13.5px] text-white uppercase tracking-widest font-light" style={{ fontFamily: "'Doto', 'Courier New', monospace" }}>
            {currentData.title}
          </div>
          <div className="space-y-3 relative overflow-hidden">
            {currentData.tasks.map((text, i) => {
              const isDone = i < checkedCount;
              return (
                <div key={`${currentWaveIdx}-${i}`} className="flex items-center gap-4 text-xs font-light transition-all duration-500 animate-fade-in-up" style={{ animationDelay: `${i * 0.1}s` }}>
                  <span className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors duration-500 ${
                    isDone ? 'border-[#aec99d] bg-[#aec99d]/10' : 'border-white/10'
                  }`}>
                    {isDone && (
                      <svg key={`chk-${currentWaveIdx}-${i}`} className="roadmap-check-draw" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#aec99d" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  <span className={`transition-all duration-500 ${isDone ? 'line-through text-white/60' : 'text-white/80'}`}>{text}</span>
                </div>
              );
            })}
          </div>
        </SpotlightCard>
      </div>
    </div>
  );
}

function IntroAnimation() {
  const [step, setStep] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && step === 0) {
          let timers: NodeJS.Timeout[] = [];
          timers.push(setTimeout(() => setStep(1), 300));
          timers.push(setTimeout(() => setStep(2), 800));
          timers.push(setTimeout(() => setStep(3), 1600));
          timers.push(setTimeout(() => setStep(4), 2600));
          timers.push(setTimeout(() => setStep(5), 3800));
          timers.push(setTimeout(() => setStep(6), 4800));
        }
      },
      { threshold: 0.5 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [step]);

  const getLineClasses = (lineStep: number) => {
    if (step < lineStep) return 'opacity-0 translate-y-4';
    if (step === lineStep) return 'opacity-100 translate-y-0';
    return 'opacity-0 -translate-y-4'; // Exit upwards
  };

  return (
    <div ref={containerRef} className="w-full h-full relative flex flex-col justify-center items-center text-center p-8">
      {/* Agent Label */}
      <div className={`transition-all duration-1000 ease-out absolute top-12 ${step >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <img src="/aivory-logo.svg" alt="Aivory Agent" className="h-6 w-auto opacity-80 mx-auto" />
      </div>

      {/* Rotating Lines Container */}
      <div className="relative h-24 w-full flex items-center justify-center">
        <div className={`absolute inset-0 flex items-center justify-center text-xl md:text-2xl font-light text-white transition-all duration-700 ease-in-out ${getLineClasses(2)}`}>
          Hi.
        </div>

        <div className={`absolute inset-0 flex items-center justify-center text-xl md:text-2xl font-light text-white transition-all duration-700 ease-in-out ${getLineClasses(3)}`}>
          Good to have you here.
        </div>
        
        <div className={`absolute inset-0 flex items-center justify-center text-xl md:text-2xl font-medium text-white transition-all duration-700 ease-in-out ${getLineClasses(4)}`}>
          Let's find where AI fits in your business.
        </div>
        
        <div className={`absolute inset-0 flex items-center justify-center text-xl md:text-2xl font-light text-white transition-all duration-700 ease-in-out ${getLineClasses(5)}`}>
          We'll take it one step at a time.
        </div>

        {/* Scroll indicator (replaces the text) */}
        <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-1000 ease-out ${step >= 6 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="text-[12px] text-[#dfe2d8] uppercase tracking-widest font-medium mb-3 mt-4 animate-text-bounce">
            SCROLL TO EXPLORE
          </div>
          <style>{`
            @keyframes text-bounce {
              0%, 100% { transform: translateY(-3px); }
              50% { transform: translateY(0); }
            }
            .animate-text-bounce { animation: text-bounce 2s infinite ease-in-out; }
            @keyframes chevron-sequence {
              0%, 100% { opacity: 0.15; }
              50% { opacity: 1; filter: drop-shadow(0 0 6px rgba(196, 201, 184, 0.6)); }
            }
            .animate-chevron-1 { animation: chevron-sequence 1.2s infinite ease-in-out 0s; }
            .animate-chevron-2 { animation: chevron-sequence 1.2s infinite ease-in-out 0.2s; }
            .animate-chevron-3 { animation: chevron-sequence 1.2s infinite ease-in-out 0.4s; }
          `}</style>
          <div className="flex flex-col items-center space-y-[-14px]">
            <svg className="w-12 h-6 text-[#dfe2d8] animate-chevron-1" viewBox="0 0 48 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 9l20 6 20-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <svg className="w-12 h-6 text-[#dfe2d8] animate-chevron-2" viewBox="0 0 48 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 9l20 6 20-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <svg className="w-12 h-6 text-[#dfe2d8] animate-chevron-3" viewBox="0 0 48 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 9l20 6 20-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        </div>
      </div>
    </div>
  );
}

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
    <div className="flex-1 flex flex-col justify-center w-full opacity-0 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
      <style>{`
        @keyframes doc-ingest {
          0%   { transform: translate(-50%, -46px) scale(0.9) rotateX(-14deg); opacity: 0; filter: blur(4px); }
          12%  { transform: translate(-50%, 0px) scale(1) rotateX(0deg); opacity: 1; filter: blur(0px); }
          65%  { transform: translate(-50%, 0px) scale(1) rotateX(0deg); opacity: 1; filter: blur(0px); }
          78%  { transform: translate(-50%, 15px) scale(0.95); opacity: 1; filter: blur(0px); }
          86%  { transform: translate(-50%, 25px) scale(1.15); opacity: 0.9; filter: blur(2px); }
          92%  { transform: translate(-50%, 30px) scale(0.4); opacity: 0; filter: blur(8px); }
          100% { transform: translate(-50%, 30px) scale(0); opacity: 0; filter: blur(8px); }
        }
        @keyframes doc-float {
          0%, 100% { transform: translateY(0) rotate(-0.6deg); }
          50% { transform: translateY(-4px) rotate(0.6deg); }
        }
        @keyframes particle-shatter {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
          20% { transform: translate(calc(-50% + (var(--tx) * 0.4)), calc(-50% + (var(--ty) * 0.4))) scale(1.5); opacity: 1; }
          100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0); opacity: 0; }
        }
        @keyframes data-stream-flow {
          0% { transform: translate(-50%, -40px) scaleY(0); opacity: 0; }
          15% { opacity: 1; transform: translate(-50%, -10px) scaleY(1); }
          85% { opacity: 1; transform: translate(-50%, 40px) scaleY(1); }
          100% { transform: translate(-50%, 60px) scaleY(0); opacity: 0; }
        }
        @keyframes pulse-ring {
          0%, 82% { opacity: 0; transform: scale(0.4); }
          87% { opacity: 0.7; transform: scale(0.6); }
          100% { opacity: 0; transform: scale(1.75); }
        }
        @keyframes doc-scan {
          0% { transform: translateY(-28px); opacity: 0; }
          25% { opacity: 1; }
          75% { opacity: 1; }
          100% { transform: translateY(96px); opacity: 0; }
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
      <SpotlightCard className="w-full p-6 sm:p-8 relative shadow-lg min-h-[320px] grid overflow-hidden">
        

        {/* Import & Generate Phases */}
        <div className={`col-start-1 row-start-1 flex flex-col items-center justify-center transition-all duration-500 w-full h-full z-10 ${phase === 'blueprint' ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
          
          {phase === 'import' && (
            <div className="flex flex-col items-center justify-center w-full">

              {/* Ingest stage: document glides down and shatters */}
              <div className="relative flex items-center justify-center w-full" style={{ height: '215px', perspective: '600px' }}>

                {/* Falling document */}
                <div
                  className="absolute left-1/2 top-[10px] z-20 flex flex-col items-center gap-2.5"
                  style={{ animation: 'doc-ingest 4.0s cubic-bezier(0.45,0,0.2,1) forwards', willChange: 'transform, opacity, filter' }}
                >
                  {/* Diagnostic report card */}
                  <div
                    className="relative w-[150px] sm:w-[164px] rounded-xl overflow-hidden bg-gradient-to-b from-[#171b16] to-[#0c0e0b] border border-[#aec99d]/25"
                    style={{
                      boxShadow: '0 14px 34px -10px rgba(0,0,0,0.75), 0 0 22px rgba(174,201,157,0.14), inset 0 1px 0 rgba(255,255,255,0.06)',
                      animation: 'doc-float 3.2s ease-in-out infinite',
                    }}
                  >
                    {/* top accent bar */}
                    <div className="h-[3px] w-full bg-gradient-to-r from-[#aec99d]/40 via-[#aec99d] to-[#aec99d]/40" />
                    {/* header */}
                    <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5">
                      <div className="w-6 h-6 rounded-md bg-[#aec99d]/12 border border-[#aec99d]/40 flex items-center justify-center text-[#aec99d] shrink-0">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="h-[6px] w-[64%] rounded-full bg-[#aec99d]/70" />
                        <div className="h-[4px] w-[40%] rounded-full bg-white/20 mt-1.5" />
                      </div>
                    </div>
                    {/* content skeleton lines */}
                    <div className="px-3 pb-3 pt-1 space-y-[7px]">
                      <div className="h-[4px] w-full rounded-full bg-white/12" />
                      <div className="h-[4px] w-[86%] rounded-full bg-white/10" />
                      <div className="h-[4px] w-[68%] rounded-full bg-white/10" />
                      {/* mini score row */}
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[7px] leading-none font-semibold text-[#aec99d] bg-[#aec99d]/12 border border-[#aec99d]/30 rounded px-1.5 py-[3px]">42%</span>
                        <div className="h-[4px] flex-1 rounded-full bg-white/10 overflow-hidden">
                          <div className="h-full w-[42%] rounded-full bg-[#aec99d]/70" />
                        </div>
                      </div>
                    </div>
                    {/* scanning light */}
                    <div
                      className="absolute inset-x-0 h-7 pointer-events-none"
                      style={{ background: 'linear-gradient(to bottom, transparent, rgba(174,201,157,0.28), transparent)', animation: 'doc-scan 2.4s ease-in-out infinite' }}
                    />
                  </div>
                  <span className="text-[10px] sm:text-[11px] text-[#aec99d]/90 uppercase tracking-[0.22em] font-medium px-3 py-1 bg-[#0d0d0d]/80 border border-white/5 rounded-md whitespace-nowrap backdrop-blur-sm shadow-[0_4px_12px_rgba(0,0,0,0.5)]">Deep Diagnostic Results</span>
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
                      className="absolute w-[3.5px] h-[3.5px] sm:w-[4px] sm:h-[4px] rounded-full bg-[#aec99d] z-30"
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
                  className="absolute left-1/2 top-[calc(50%+20px)] -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-[#aec99d] rounded-full blur-[40px] z-10 pointer-events-none"
                  style={{ 
                    animation: 'pulse-ring 1.8s ease-out forwards',
                    animationDelay: '3.3s',
                    opacity: 0 
                  }}
                />

                {/* Data Flowing Line into pills */}
                <div 
                  className="absolute left-1/2 bottom-[20px] w-[4px] h-[50px] rounded-full z-0 pointer-events-none"
                  style={{ 
                    background: 'linear-gradient(to bottom, rgba(174,201,157,0), #aec99d, #aec99d, rgba(174,201,157,0))',
                    boxShadow: '0 0 20px 4px rgba(174,201,157,0.8), 0 0 40px rgba(174,201,157,0.4)',
                    animation: 'data-stream-flow 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards',
                    animationDelay: '3.25s',
                    opacity: 0,
                    transformOrigin: 'top'
                  }}
                />
              </div>

              {/* Engine Context */}
              <div className="flex flex-col items-center gap-4 z-10 relative mt-2 w-full max-w-[420px]">
                <span className="text-xs sm:text-sm text-white/70 bg-[#111111]/80 px-4 py-1 rounded-full backdrop-blur-sm opacity-0 animate-[fade-in-text_4.5s_ease-out_forwards]">Engine processing from deep diagnostic result</span>
                <div className="flex flex-wrap justify-center gap-3 sm:gap-4 w-full">
                  <div className="bg-white/5 border border-white/10 rounded-md px-3 py-1.5 sm:px-4 sm:py-2 text-[10px] sm:text-sm text-white/80 whitespace-nowrap opacity-0 animate-[pop-in-pill_0.6s_ease-out_forwards]" style={{ animationDelay: '3.6s' }}>Goal: Scale Ops</div>
                  <div className="bg-white/5 border border-white/10 rounded-md px-3 py-1.5 sm:px-4 sm:py-2 text-[10px] sm:text-sm text-white/80 whitespace-nowrap opacity-0 animate-[pop-in-pill_0.6s_ease-out_forwards]" style={{ animationDelay: '3.75s' }}>Data: Partially Centralized</div>
                  <div className="bg-[#aec99d]/10 border border-[#aec99d]/30 rounded-md px-3 py-1.5 sm:px-4 sm:py-2 text-[10px] sm:text-sm text-[#aec99d] shadow-[0_0_15px_rgba(174,201,157,0.15)] font-medium whitespace-nowrap opacity-0 animate-[pop-in-pill_0.6s_ease-out_forwards]" style={{ animationDelay: '3.9s' }}>Score: 42%</div>
                </div>
              </div>
            </div>
          )}
          {phase === 'generate' && (
            <div className="flex flex-col items-center justify-center gap-6 animate-fade-in-up">
              <div className="relative w-28 h-28 sm:w-36 sm:h-36 flex items-center justify-center">
                <div className="absolute inset-[-10px] border border-[#aec99d]/20 rounded-full animate-ping opacity-20" />
                <div className="absolute inset-0 bg-[#aec99d]/5 rounded-full blur-2xl" />
                <div className="w-full h-full flex items-center justify-center z-10">
                  <LabFlaskCanvas />
                </div>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-sm sm:text-base text-[#aec99d] uppercase tracking-widest font-medium">Brewing Blueprint</span>
                <div className="w-32 sm:w-48 h-1 bg-white/10 rounded-full mt-4 overflow-hidden relative">
                  <div className="h-full bg-[#aec99d] rounded-full animate-[loading-bar_3.5s_ease-in-out_forwards]" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Blueprint Layout */}
        <div className={`col-start-1 row-start-1 flex flex-col justify-center w-full h-full z-10 transition-opacity duration-300 ${phase === 'blueprint' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          <div className={`flex flex-col items-center mb-8 ${phase === 'blueprint' ? 'animate-[blueprint-header-enter_0.8s_ease-out_forwards]' : 'opacity-0'}`}>
            <span className="text-[10px] sm:text-xs text-[#aec99d] uppercase tracking-[0.1em] font-medium mb-1 drop-shadow-[0_0_8px_rgba(174,201,157,0.5)]">Tailored Blueprint</span>
            <span className="text-lg sm:text-xl text-white font-light text-center">Ops Scaling Architecture</span>
          </div>

          {/* Contextual Mapping */}
          <div className="flex flex-col gap-4 w-full max-w-[440px] mx-auto">
             <style>{`
               @keyframes bp-flow { 0%{left:0%;opacity:0} 20%{opacity:1} 80%{opacity:1} 100%{left:100%;opacity:0} }
               @keyframes bp-chev { 0%,100%{opacity:0.4;transform:translateX(0)} 50%{opacity:1;transform:translateX(2px)} }
             `}</style>

             {/* Card 1: Constraint → Resolution */}
             <div className={`group relative flex items-center gap-3 rounded-2xl p-3.5 sm:p-4 border border-white/10 overflow-hidden bg-gradient-to-br from-white/[0.055] to-white/[0.015] ${phase === 'blueprint' ? 'animate-[blueprint-card-enter_0.7s_ease-out_forwards]' : 'opacity-0'}`} style={{ boxShadow: '0 12px 30px -14px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.06)', animationDelay: phase === 'blueprint' ? '0.2s' : '0s' }}>
                <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-white/20" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#aec99d]/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                {/* left */}
                <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-4 relative z-10">
                   <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center text-white/70 shrink-0">
                     <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.86L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.86a2 2 0 00-3.4 0z"/></svg>
                   </div>
                   <div className="flex flex-col min-w-0">
                      <span className="text-[9px] sm:text-[10px] text-white/65 uppercase tracking-wider mb-0.5">Constraint Detected</span>
                      <span className="text-xs sm:text-sm text-white/90 font-medium leading-snug truncate">Partially Centralized Data</span>
                   </div>
                </div>
                {/* connector */}
                <div className="w-[40px] sm:w-[50px] shrink-0 h-3 z-10 flex items-center mx-1 sm:mx-2">
                   <div className="relative h-[1px] w-full bg-white/20">
                      {/* Premium Node Connector (Mini) */}
                      <div className="absolute left-1/2 top-[0.5px] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                        <div className="absolute w-[18px] h-[18px] rounded-full border border-[#b2cca2]/40 animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite] opacity-60" />
                        <div className="absolute w-[10px] h-[10px] rounded-full border border-[#b2cca2]/60 bg-[#1c1c22]/80 backdrop-blur-md shadow-[0_0_6px_rgba(178,204,162,0.3)]" />
                        <div className="w-[4px] h-[4px] rounded-full bg-[#b2cca2] shadow-[0_0_8px_1px_rgba(178,204,162,1)] z-10" />
                      </div>
                   </div>
                </div>
                {/* right */}
                <div className="flex items-center gap-2.5 flex-1 min-w-0 pl-4 justify-end text-right relative z-10">
                   <div className="flex flex-col min-w-0 w-full text-right">
                      <span className="text-[9px] sm:text-[10px] text-[#aec99d]/80 uppercase tracking-wider mb-0.5">Resolution Layer</span>
                      <span className="text-xs sm:text-sm text-white/90 font-medium leading-snug truncate">Autonomous Data Sync</span>
                   </div>
                   <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#aec99d]/12 border border-[#aec99d]/35 flex items-center justify-center text-[#aec99d] shrink-0">
                     <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5"/></svg>
                   </div>
                </div>
             </div>

             {/* Card 2: Objective → Action */}
             <div className={`group relative flex items-center gap-3 rounded-2xl p-3.5 sm:p-4 border border-white/10 overflow-hidden bg-gradient-to-br from-white/[0.055] to-white/[0.015] ${phase === 'blueprint' ? 'animate-[blueprint-card-enter_0.7s_ease-out_forwards]' : 'opacity-0'}`} style={{ boxShadow: '0 12px 30px -14px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.06)', animationDelay: phase === 'blueprint' ? '0.4s' : '0s' }}>
                <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-white/20" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#aec99d]/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-4 relative z-10">
                   <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center text-white/70 shrink-0">
                     <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.2"/></svg>
                   </div>
                   <div className="flex flex-col min-w-0">
                      <span className="text-[9px] sm:text-[10px] text-white/65 uppercase tracking-wider mb-0.5">Objective Targeted</span>
                      <span className="text-xs sm:text-sm text-white/90 font-medium leading-snug truncate">Scale Ops (No Headcount)</span>
                   </div>
                </div>
                <div className="w-[40px] sm:w-[50px] shrink-0 h-3 z-10 flex items-center mx-1 sm:mx-2">
                   <div className="relative h-[1px] w-full bg-white/20">
                      {/* Premium Node Connector (Mini) */}
                      <div className="absolute left-1/2 top-[0.5px] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                        <div className="absolute w-[18px] h-[18px] rounded-full border border-[#b2cca2]/40 animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite] opacity-60" style={{ animationDelay: '0.4s' }} />
                        <div className="absolute w-[10px] h-[10px] rounded-full border border-[#b2cca2]/60 bg-[#1c1c22]/80 backdrop-blur-md shadow-[0_0_6px_rgba(178,204,162,0.3)]" />
                        <div className="w-[4px] h-[4px] rounded-full bg-[#b2cca2] shadow-[0_0_8px_1px_rgba(178,204,162,1)] z-10" />
                      </div>
                   </div>
                </div>
                <div className="flex items-center gap-2.5 flex-1 min-w-0 pl-4 justify-end text-right relative z-10">
                   <div className="flex flex-col min-w-0 w-full text-right">
                      <span className="text-[9px] sm:text-[10px] text-[#aec99d]/80 uppercase tracking-wider mb-0.5">Action Engine</span>
                      <span className="text-xs sm:text-sm text-white/90 font-medium leading-snug truncate">Automated Triage Flow</span>
                   </div>
                   <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#aec99d]/12 border border-[#aec99d]/35 flex items-center justify-center text-[#aec99d] shrink-0">
                     <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/></svg>
                   </div>
                </div>
             </div>
          </div>
          
          <div className={`mt-8 text-center ${phase === 'blueprint' ? 'animate-[blueprint-card-enter_0.7s_ease-out_forwards]' : 'opacity-0'}`} style={{ animationDelay: phase === 'blueprint' ? '0.6s' : '0s' }}>
             <span className="text-[9px] sm:text-[10px] text-[#aec99d]/60 uppercase tracking-[0.15em] font-medium drop-shadow-sm">Aivory Engine Processing Capacity: 98% Efficiency</span>
          </div>
        </div>
      </SpotlightCard>
    </div>
  );
}

export function InteractiveShowcase() {
  const [activeIndex, setActiveIndex] = useState(-1);
  const [connectedIndex, setConnectedIndex] = useState(-1);
  
  const introRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const h4Refs = useRef<(HTMLHeadingElement | null)[]>([]);
  const stickyBoxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // 1. Intersection Observer for Active Index (content fading)
    const observerOptions = {
      root: null,
      rootMargin: '-30% 0px -40% 0px', // Trigger when section is in middle of viewport
      threshold: 0.1,
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (entry.target === introRef.current) {
            setActiveIndex(-1);
          } else {
            const index = sectionRefs.current.findIndex((ref) => ref === entry.target);
            if (index !== -1) {
              setActiveIndex(index);
            }
          }
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    if (introRef.current) observer.observe(introRef.current);
    sectionRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    // 2. Scroll Listener for Smart Connection Line
    const handleScroll = () => {
      const vh = window.innerHeight;
      let newlyConnected = -1;
      
      h4Refs.current.forEach((ref, idx) => {
        if (!ref) return;
        const rect = ref.getBoundingClientRect();
        const h4CenterY = rect.top + (rect.height / 2);
        
        // If the h4 is between 12% and 70% of the viewport height, it's considered connected
        // This ensures the line only breaks when it's about to miss the sticky box (which is at top-[12vh])
        if (h4CenterY > vh * 0.12 && h4CenterY < vh * 0.70) {
          newlyConnected = idx;
        }
      });
      
      setConnectedIndex((prev) => (prev !== newlyConnected ? newlyConnected : prev));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <section id="showcase" className="relative text-white py-16 md:py-32">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-24">
        {/* Sticky Scroll Layout Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 relative">
          
          {/* Left Column: Scrollable Description Blocks */}
          <div className="lg:col-span-5 flex flex-col gap-16 lg:gap-[30vh] lg:pb-[20vh]">
            <div ref={introRef} className="lg:min-h-[40vh] flex flex-col justify-center">
              <h2 className="text-[#dfe2d8] uppercase tracking-widest text-xs font-manrope font-light mb-3">
                Operational Framework
              </h2>
              <h3 className="text-3xl md:text-4xl lg:text-5xl font-light tracking-tight mb-6 leading-tight">
                From Assessment<br />to Staged Autonomy
              </h3>
              <p className="text-white/75 max-w-lg font-light leading-relaxed">
                We take you step-by-step from auditing bottlenecks to running customized, automated system workflows. Explore the core product layers.
              </p>
            </div>

            {showcaseProducts.map((product, idx) => (
              <div
                key={product.id}
                ref={(el) => {
                  sectionRefs.current[idx] = el;
                }}
                className={`flex flex-col justify-center min-h-[50vh] transition-all duration-500 ${
                  activeIndex === idx ? 'opacity-100 scale-100' : 'opacity-30 scale-95 lg:opacity-20'
                }`}
              >
                <span className="text-[#dfe2d8] text-[15px] font-light tracking-[0.2em] mb-4 uppercase font-manrope">
                  {product.step}
                </span>
                <div className="flex items-center mb-6 relative w-full lg:w-[calc(100%+4rem)] z-10">
                  <h4 
                    ref={(el) => {
                      h4Refs.current[idx] = el;
                    }}
                    className="text-3xl font-light text-white shrink-0 pr-8"
                  >
                    {product.title}
                  </h4>
                  
                  {/* Animated Connecting Line with Premium Node Connector */}
                  <div 
                    className={`hidden lg:flex items-center flex-grow transition-all duration-[700ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      connectedIndex === idx ? 'max-w-[1000px] opacity-100' : 'max-w-0 opacity-0'
                    }`}
                  >
                    {/* The Line */}
                    <div className="h-[1px] bg-gradient-to-r from-transparent via-[#b2cca2]/50 to-[#b2cca2]/80 flex-grow" />
                    
                    {/* Premium Node Connector */}
                    <div className="relative flex items-center justify-center shrink-0 translate-x-[1px]">
                      {/* Outer ping animation */}
                      <div className="absolute w-[24px] h-[24px] rounded-full border-[1.5px] border-[#b2cca2]/40 animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite] opacity-60" />
                      {/* Static Glass Ring */}
                      <div className="absolute w-[14px] h-[14px] rounded-full border border-[#b2cca2]/60 bg-[#1c1c22]/80 backdrop-blur-md shadow-[0_0_8px_rgba(178,204,162,0.3)]" />
                      {/* Solid glowing core */}
                      <div className="w-[6px] h-[6px] rounded-full bg-[#b2cca2] shadow-[0_0_12px_2px_rgba(178,204,162,1)] z-10" />
                    </div>
                  </div>
                </div>
                <p className="text-white/85 text-base font-light mb-8 leading-relaxed max-w-lg">
                  {product.description}
                </p>
                <ul className="space-y-3.5">
                  {product.features.map((feature, fIdx) => (
                    <li key={fIdx} className="flex items-center gap-3 text-sm font-light text-white/90">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#939393]" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* Mobile Inline Visualizer */}
                <SpotlightCard className={`flex lg:hidden w-full aspect-[4/3] sm:aspect-[16/11] mt-10`}>
                  <div className="absolute inset-0 p-4 md:p-6 flex flex-col">
                    {idx === 0 && <div className="flex-1 relative w-full h-full"><DiagnosticAnimation /></div>}
                    {idx === 1 && <BlueprintAnimation />}
                    {idx === 2 && <div className="flex-1 w-full h-full relative"><RoadmapAnimation /></div>}
                    {idx === 3 && <div className="flex-1 w-full h-full relative"><ConsoleAnimation /></div>}
                    {idx === 4 && <div className="w-full flex flex-col gap-4 h-full justify-center relative"><WorkflowAnimation /></div>}
                  </div>
                </SpotlightCard>
              </div>
            ))}
          </div>

          {/* Right Column: Sticky Mockup Visualizer Area */}
          <div className="hidden lg:col-span-7 lg:sticky lg:top-[12vh] lg:flex items-center justify-center z-20 mx-auto w-full max-w-[850px] aspect-[4/3] lg:aspect-[16/11]">
            <SpotlightCard 
              className={`w-full h-full transition-all duration-500 p-6 md:p-8 flex flex-col shadow-2xl relative overflow-hidden`}
            >
              
              {/* Showcase Screen Layers */}
              <div className="flex-1 relative w-full h-full">
                
                {/* Intro Screen */}
                <div
                  className={`absolute inset-0 flex flex-col justify-center transition-all duration-700 ease-in-out ${
                    activeIndex === -1 ? 'opacity-100 pointer-events-auto z-10' : 'opacity-0 pointer-events-none'
                  }`}
                >
                  <div className="flex-1 w-full h-full relative">
                    <IntroAnimation />
                  </div>
                </div>

                {/* 01. Diagnostic Visualizer */}
                <div
                  className={`absolute inset-0 flex flex-col justify-between transition-all duration-500 ease-in-out ${
                    activeIndex === 0 ? 'opacity-100 pointer-events-auto z-10' : 'opacity-0 pointer-events-none'
                  }`}
                >
                  <div key={`diag-${activeIndex === 0 ? 'active' : 'inactive'}`} className="flex-1 relative w-full h-full">
                    {activeIndex === 0 && <DiagnosticAnimation />}
                  </div>
                  <div className="text-[10px] text-white/50 text-center uppercase tracking-widest mt-6 pb-6 font-light">
                    * Interactive assessment evaluating operational constraints.
                  </div>
                </div>

                {/* 02. Blueprint Visualizer */}
                <div
                  className={`absolute inset-0 flex flex-col justify-between transition-all duration-500 ease-in-out ${
                    activeIndex === 1 ? 'opacity-100 pointer-events-auto z-10' : 'opacity-0 pointer-events-none'
                  }`}
                >
                  <div key={`blue-${activeIndex === 1 ? 'active' : 'inactive'}`} className="flex-1 relative w-full h-full">
                    {activeIndex === 1 && <BlueprintAnimation />}
                  </div>
                  <div className="text-[10px] text-white/50 text-center uppercase tracking-widest mt-6 pb-6 font-light">
                    * Schematic mapping how databases interface with automation layers.
                  </div>
                </div>

                {/* 03. Roadmap Visualizer */}
                <div
                  className={`absolute inset-0 flex flex-col justify-between transition-all duration-500 ease-in-out ${
                    activeIndex === 2 ? 'opacity-100 pointer-events-auto z-10' : 'opacity-0 pointer-events-none'
                  }`}
                >
                  <div key={`road-${activeIndex === 2 ? 'active' : 'inactive'}`} className="flex-1 w-full h-full relative">
                    {activeIndex === 2 && <RoadmapAnimation />}
                  </div>
                  <div className="text-[10px] text-[#dfe2d8] text-center uppercase tracking-widest mt-6 pb-6 font-manrope font-light">
                    * Phased wave system mapping out operational integrations step-by-step.
                  </div>
                </div>

                {/* 04. Conversational Consultation Visualizer */}
                <div
                  className={`absolute inset-0 flex flex-col justify-between transition-all duration-500 ease-in-out ${
                    activeIndex === 3 ? 'opacity-100 pointer-events-auto z-10' : 'opacity-0 pointer-events-none'
                  }`}
                >
                  <div key={`chat-${activeIndex === 3 ? 'active' : 'inactive'}`} className="flex-1 w-full h-full relative">
                    {activeIndex === 3 && <ConsoleAnimation />}
                  </div>
                  <div className="text-[10px] text-white/50 text-center uppercase tracking-widest mt-6 pb-6 font-light">
                    * Conversational interface for strategic operational insights.
                  </div>
                </div>

                {/* 05. Workflow Visualizer */}
                <div
                  className={`absolute inset-0 flex flex-col justify-between transition-all duration-500 ease-in-out ${
                    activeIndex === 4 ? 'opacity-100 pointer-events-auto z-10' : 'opacity-0 pointer-events-none'
                  }`}
                >
                  <div key={`wf-${activeIndex === 4 ? 'active' : 'inactive'}`} className="w-full flex flex-col gap-4 h-full justify-center relative">
                    {activeIndex === 4 && <WorkflowAnimation />}
                  </div>
                  <div className="text-[10px] text-white/50 text-center uppercase tracking-widest mt-6 pb-6 font-light">
                    * Natural language command translated into execution nodes.
                  </div>
                </div>

              </div>

            </SpotlightCard>
          </div>

        </div>
      </div>
    </section>
  );
}
