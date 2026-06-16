'use client';

import { useState, useEffect, useRef, MouseEvent } from 'react';

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
    description: 'Orchestrate operations visually. Link trigger conditions, processing layers, and applications. The builder maps commands into executable flows.',
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
const QUESTIONS = [
  { q: 'Define your business goals', a: 'Scale operations without headcount growth.' },
  { q: 'Identify potential risks', a: 'Data privacy compliance, change management.' },
  { q: 'Assess data infrastructure', a: 'Fragmented databases, manual reporting.' },
];
const DIMS = [
  { label: 'Strategy', val: 80, delay: 0.2 },
  { label: 'Data Readiness', val: 75, delay: 0.5 },
  { label: 'Process Audit', val: 90, delay: 0.8 },
];

function DiagnosticAnimation() {
  const [phase, setPhase] = useState<'qa' | 'thinking' | 'score'>('qa');
  const [visibleQ, setVisibleQ] = useState(0);
  const [dots, setDots] = useState('');
  const [scoreVal, setScoreVal] = useState(0);
  const [barsVisible, setBarsVisible] = useState(false);
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearAll = () => { timerRefs.current.forEach(clearTimeout); timerRefs.current = []; };
  const t = (fn: () => void, s: number) => timerRefs.current.push(setTimeout(fn, s * 1000));

  useEffect(() => {
    const run = () => {
      setPhase('qa'); setVisibleQ(0); setScoreVal(0); setBarsVisible(false);
      QUESTIONS.forEach((_, i) => t(() => setVisibleQ(i + 1), 0.6 + i * 1.5));
      t(() => setPhase('thinking'), 5.1);
      t(() => {
        setPhase('score');
        let v = 0;
        const step = () => { v += 2; setScoreVal(v); if (v < 78) timerRefs.current.push(setTimeout(step, 20)); };
        step();
        timerRefs.current.push(setTimeout(() => setBarsVisible(true), 300));
      }, 7.0);
      t(run, 11.5);
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

  return (
    <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
      {/* QA & Thinking */}
      <div className={`absolute inset-0 flex flex-col justify-center p-2 transition-all duration-500 ${phase === 'score' ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
        <div className="flex flex-col gap-3">
          {QUESTIONS.slice(0, visibleQ).map((item, i) => (
            <div key={i} className="flex flex-col gap-1 animate-fade-in-up">
              <span className="text-[10px] text-white/50">Q: {item.q}</span>
              <div className="bg-[#1E1E1E] border border-white/5 rounded-md px-2 py-1.5 w-fit max-w-[90%]">
                <p className="text-[10px] text-white/80">{item.a}</p>
              </div>
            </div>
          ))}
          {phase === 'thinking' && (
            <div className="flex items-center gap-2 mt-2 animate-fade-in-up">
               <span className="text-[10px] text-[#aec99d]">Analyzing{dots}</span>
            </div>
          )}
        </div>
      </div>

      {/* Score */}
      <div className={`absolute inset-0 flex flex-col justify-center items-center p-2 transition-all duration-500 delay-200 ${phase === 'score' ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'}`}>
        <div className="relative w-16 h-16 flex items-center justify-center mb-4">
           <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
             <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
             <circle cx="50" cy="50" r="42" fill="none" stroke="#aec99d" strokeWidth="8" strokeDasharray={264} strokeDashoffset={barsVisible ? 264 - (264 * 0.78) : 264} className="transition-all duration-1000 ease-out" />
           </svg>
           <div className="absolute flex flex-col items-center">
             <span className="text-xl font-light text-white" style={{ fontFamily: "'Doto', 'Courier New', monospace" }}>{scoreVal}</span>
           </div>
        </div>
        <div className="w-full space-y-2.5 px-4">
          {DIMS.map((dim) => (
            <div key={dim.label} className={`text-[9px] space-y-1 transition-all duration-500 ${barsVisible ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: `${dim.delay}s` }}>
              <div className="flex justify-between text-white/70"><span>{dim.label}</span><span className="text-[#aec99d]">{dim.val}%</span></div>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden relative">
                <div className="absolute left-0 top-0 h-full bg-[#aec99d] rounded-full transition-all duration-700 ease-out" style={{ width: barsVisible ? `${dim.val}%` : '0%', transitionDelay: `${dim.delay}s` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 02. Blueprint ──
function BlueprintAnimation() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-2">
      <div className="text-[9px] text-[#c4c9b8] uppercase tracking-widest font-light mb-6 text-center w-full font-manrope">Architecture Pipeline</div>
      <div className="flex justify-between items-center relative w-full px-4 mt-2">
        <div className="absolute top-[16px] left-[15%] right-[15%] h-[1px] bg-white/10 -z-10" />
        <div className="absolute top-[16px] left-[15%] right-[15%] h-[1px] bg-[#aec99d] -z-10 origin-left animate-[scale-x_3s_ease-in-out_infinite]" />
        {[
          { name: 'Ingest', active: true, delay: '0s' },
          { name: 'Process', active: true, delay: '0.2s' },
          { name: 'Engine', active: true, delay: '0.4s' },
          { name: 'Action', active: true, delay: '0.6s' }
        ].map((node, i) => (
          <div key={node.name} className="flex flex-col items-center gap-2 animate-fade-in-up" style={{ animationDelay: node.delay }}>
            <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-[10px] shadow-[0_0_10px_rgba(174,201,157,0.15)] bg-[#111111] ${node.active ? 'border-[#aec99d] text-[#aec99d] font-semibold scale-110' : 'border-white/10 text-white/40 scale-100'}`} style={{ fontFamily: "'Doto', 'Courier New', monospace" }}>
              0{i + 1}
            </div>
            <span className={`text-[8px] font-medium tracking-wide ${node.active ? 'text-white/80' : 'text-white/40'}`}>{node.name}</span>
          </div>
        ))}
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

        {waves.map((wave) => {
          const isActive = step >= wave.activeStep;
          return (
            <div key={wave.name} className="flex flex-col items-center gap-1 transition-all duration-500">
              <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-[10px] transition-all duration-500 relative z-10 ${isActive ? 'border-[#aec99d] bg-[#111111] text-[#aec99d] font-semibold scale-110 shadow-[0_0_10px_rgba(174,201,157,0.3)]' : 'border-white/10 bg-[#111111] text-white/40 scale-100'}`} style={{ fontFamily: "'Doto', 'Courier New', monospace" }}>
                {wave.num}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="bg-[#111111] border border-white/5 rounded-xl p-4 mx-auto w-full max-w-[90%] space-y-3 shadow-lg transition-all duration-500">
        <div className="text-[9px] text-[#c4c9b8] uppercase tracking-[0.15em] font-medium font-manrope">
          {currentData.title}
        </div>
        <div className="flex flex-col gap-2">
          {currentData.tasks.map((task, idx) => {
            const isChecked = idx < checkedCount;
            return (
              <div key={idx} className="flex items-center gap-2.5 transition-all duration-300">
                <div className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border transition-colors duration-300 ${isChecked ? 'bg-[#aec99d]/20 border-[#aec99d] text-[#aec99d]' : 'border-white/10 text-transparent'}`}>
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <span className={`text-[10px] transition-all duration-300 font-light ${isChecked ? 'text-white/30 line-through' : 'text-white/80'}`}>
                  {task}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── 04. Console ──
function ConsoleAnimation() {
  const [phase, setPhase] = useState<'typing' | 'sent' | 'thinking' | 'response'>('typing');
  const [typedText, setTypedText] = useState('');
  const [dots, setDots] = useState('');
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  const fullText = "Analyze current lead generation process.";

  const clearAll = () => { timerRefs.current.forEach(clearTimeout); timerRefs.current = []; };
  const t = (fn: () => void, s: number) => timerRefs.current.push(setTimeout(fn, s * 1000));

  useEffect(() => {
    const run = () => {
      setPhase('typing');
      setTypedText('');
      let currentText = '';
      const typeChar = (i: number) => {
        if (i < fullText.length) {
          currentText += fullText[i];
          setTypedText(currentText);
          timerRefs.current.push(setTimeout(() => typeChar(i + 1), 40));
        } else {
          t(() => setPhase('sent'), 0.4);
          t(() => setPhase('thinking'), 0.8);
          t(() => setPhase('response'), 2.8);
          t(run, 10.0);
        }
      };
      t(() => typeChar(0), 0.5);
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

  return (
    <div className="w-full h-full flex flex-col justify-end px-6 pb-8 pt-4 font-light relative">
      <div className="flex flex-col gap-4 w-full max-w-[100%] mx-auto mb-2">
        {/* User Message */}
        <div className={`flex justify-end transition-all duration-300 ease-out ${phase !== 'typing' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="bg-[#2A2A2A] rounded-2xl rounded-tr-sm px-4 py-2 text-white/90 text-[12px] max-w-[90%] shadow-md">
            {fullText}
          </div>
        </div>
        
        {/* AI Thinking & Response */}
        <div className={`flex flex-col gap-3 transition-all duration-300 ${phase === 'thinking' || phase === 'response' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 hidden'}`}>
          {phase === 'thinking' && (
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1.5 opacity-80">
                <div className="w-3.5 h-3.5 rounded-full bg-[#556B2F] border border-[#181818] relative z-30" />
                <div className="w-3.5 h-3.5 rounded-full bg-[#6B8E23] border border-[#181818] relative z-20" />
                <div className="w-3.5 h-3.5 rounded-full bg-[#9ACD32] border border-[#181818] relative z-10" />
              </div>
              <div className="text-white/50 text-[11px] font-medium">Thinking{dots}</div>
            </div>
          )}

          {phase === 'response' && (
            <div className="flex flex-col gap-2 pl-1 animate-fade-in-up">
              {[
                { source: 'Queried CRM', query: 'lead response time operations data', results: '520 records', delay: '0s' },
                { source: 'Analyzed Logs', query: 'email triage flow delay analysis', results: '12 bottlenecks', delay: '0.4s' },
              ].map((item, i) => (
                <div key={i} className="flex flex-col gap-1 opacity-0 animate-fade-in-up" style={{ animationDelay: item.delay }}>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <svg className="w-3.5 h-3.5 text-[#aec99d]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      <span className="text-white/70">{item.source}</span>
                    </div>
                    <div className="text-white/40 text-[9px]">{item.results}</div>
                  </div>
                  <div className="ml-5 font-mono text-[9px] text-white/60 bg-white/5 w-fit max-w-[calc(100%-1rem)] px-2.5 py-1 rounded border border-white/5 truncate">
                    {item.query}
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
            <span className="text-white/30">Ask Aivory anything...</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 05. Workflow ──
function WorkflowAnimation() {
  const [phase, setPhase] = useState<'typing' | 'sent' | 'generating' | 'generated' | 'buttons'>('typing');
  const [typedText, setTypedText] = useState('');
  const [dots, setDots] = useState('');
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  const fullText = "Create workflow to extract email leads and send them to Slack.";

  const clearAll = () => { timerRefs.current.forEach(clearTimeout); timerRefs.current = []; };
  const t = (fn: () => void, s: number) => timerRefs.current.push(setTimeout(fn, s * 1000));

  useEffect(() => {
    const run = () => {
      setPhase('typing');
      setTypedText('');
      
      let currentText = '';
      const typeChar = (i: number) => {
        if (i < fullText.length) {
          currentText += fullText[i];
          setTypedText(currentText);
          timerRefs.current.push(setTimeout(() => typeChar(i + 1), 30));
        } else {
          t(() => setPhase('sent'), 0.4);
          t(() => setPhase('generating'), 0.8);
          t(() => setPhase('generated'), 2.8);
          t(() => setPhase('buttons'), 4.0);
          t(run, 11.0);
        }
      };
      t(() => typeChar(0), 0.5);
    };
    run();
    return clearAll;
  }, []);

  useEffect(() => {
    if (phase !== 'generating') return;
    let i = 0;
    const id = setInterval(() => { i = (i + 1) % 4; setDots('.'.repeat(i)); }, 400);
    return () => clearInterval(id);
  }, [phase]);

  return (
    <div className="w-full flex flex-col gap-4 h-full justify-end relative px-6 pb-8 pt-4 font-light">
      <div className="flex flex-col gap-4 sm:gap-6 w-full max-w-[100%] mx-auto mb-4">
        {/* User Message */}
        <div className={`flex justify-end transition-all duration-300 ease-out ${phase !== 'typing' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
           <div className="bg-[#2A2A2A] rounded-3xl rounded-tr-md px-4 py-2 sm:px-5 sm:py-3 text-white/90 text-[12px] sm:text-[14px] max-w-[95%] sm:max-w-[90%] leading-relaxed shadow-md">
             {fullText}
           </div>
        </div>

        {/* Generating Indicator */}
        <div className={`flex items-center gap-2.5 transition-all duration-300 ${phase === 'generating' || phase === 'generated' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 hidden'}`}>
           {phase === 'generating' ? (
             <>
               <div className="w-4 h-4 rounded-full border-2 border-white/10 border-t-[#c1ccc8] animate-spin shrink-0" />
               <span className="text-white/50 text-[12px] sm:text-[13px] font-medium">Aivory is generating workflow<span className="animate-pulse">{dots}</span></span>
             </>
           ) : null}
        </div>

        {/* Generated Flow */}
        {(phase === 'generated' || phase === 'buttons') && (
          <div className="w-full bg-[#111111] border border-white/5 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 sm:gap-5 relative overflow-hidden shadow-2xl animate-fade-in-up">
            <div className="text-[9px] sm:text-[10px] text-white uppercase tracking-widest text-center font-light z-10" style={{ fontFamily: "'Doto', 'Courier New', monospace" }}>
              Workflow Generated
            </div>

            <div className="flex items-center justify-between w-full max-w-[320px] mx-auto z-10 relative">
              {/* Connecting Lines */}
              <div className="absolute top-1/2 left-[15%] right-[15%] h-[1px] bg-white/10 -translate-y-1/2 -z-10" />
              <div className="absolute top-1/2 left-[15%] right-[50%] h-[1px] bg-[#c1ccc8] -translate-y-1/2 -z-10 origin-left animate-scale-x" />
              <div className="absolute top-1/2 left-[50%] right-[15%] h-[1px] bg-[#c1ccc8] -translate-y-1/2 -z-10 origin-left animate-scale-x" style={{ animationDelay: '0.4s' }} />

              {/* Node 1: Trigger */}
              <div className="flex flex-col rounded-[12px] sm:rounded-[14px] border border-white/10 shadow-lg flex-shrink-0 w-[70px] sm:w-[90px] h-[70px] sm:h-[85px] overflow-hidden bg-[#2A2A2A] relative z-10">
                <div className="h-[24px] sm:h-[28px] flex items-center justify-center bg-[#2A2A2A] border-b border-[#111]/50">
                  <span className="text-[7px] sm:text-[8px] text-white/60 uppercase tracking-widest font-medium">Trigger</span>
                </div>
                <div className="flex-1 bg-[#c1ccc8] flex flex-col items-center justify-center gap-1.5">
                  <img src="/integrations/icons/gmail.svg" alt="Gmail" className="w-3.5 h-3.5 sm:w-4 sm:h-4 drop-shadow-sm" />
                  <span className="text-[9px] sm:text-[11px] font-semibold text-[#111111]">Gmail</span>
                </div>
              </div>
              
              {/* Node 2: Agent */}
              <div className="relative flex-shrink-0 animate-fade-in-up z-20" style={{ animationDelay: '0.2s' }}>
                <div className="absolute top-[-3px] right-[-3px] w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white/40 animate-ping z-30" />
                <div className="absolute top-[-3px] right-[-3px] w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white/60 z-30 border border-[#111]" />
                
                <div className="flex flex-col rounded-[12px] sm:rounded-[14px] border border-white/10 shadow-lg w-[70px] sm:w-[90px] h-[70px] sm:h-[85px] overflow-hidden bg-[#2A2A2A]">
                  <div className="h-[24px] sm:h-[28px] flex items-center justify-center bg-[#2A2A2A] border-b border-[#111]">
                    <span className="text-[7px] sm:text-[8px] text-white/60 uppercase tracking-widest font-medium">AI Agent</span>
                  </div>
                  <div className="flex-1 bg-[#111111] flex flex-col items-center justify-center">
                    <span className="text-[9px] sm:text-[11px] font-medium text-white/60">Extract</span>
                  </div>
                </div>
              </div>

              {/* Node 3: Action */}
              <div className="flex flex-col rounded-[12px] sm:rounded-[14px] border border-white/10 shadow-lg flex-shrink-0 w-[70px] sm:w-[90px] h-[70px] sm:h-[85px] overflow-hidden bg-[#2A2A2A] relative z-10 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
                <div className="h-[24px] sm:h-[28px] flex items-center justify-center bg-[#2A2A2A] border-b border-[#111]/50">
                  <span className="text-[7px] sm:text-[8px] text-white/60 uppercase tracking-widest font-medium">Action</span>
                </div>
                <div className="flex-1 bg-[#c1ccc8] flex flex-col items-center justify-center gap-1.5">
                  <img src="/integrations/icons/slack.svg" alt="Slack" className="w-3.5 h-3.5 sm:w-4 sm:h-4 drop-shadow-sm" />
                  <span className="text-[9px] sm:text-[11px] font-semibold text-[#111111]">Slack</span>
                </div>
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
            <span className="text-white/30">Ask Aivory anything...</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Layout ──
export function InteractiveGridShowcase() {
  return (
    <section id="framework" className="relative bg-black text-white py-24 md:py-32 overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        
        {/* Header */}
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <h2 className="text-[#c4c9b8] uppercase tracking-widest text-xs font-manrope font-light mb-3">
            Operational Framework
          </h2>
          <h3 className="text-4xl md:text-5xl font-light tracking-tight mb-6 leading-tight">
            From Assessment <br className="hidden md:block" />to Staged Autonomy
          </h3>
          <p className="text-white/60 font-light leading-relaxed">
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
              <p className="text-white/50 text-[13px] font-light leading-relaxed">{showcaseProducts[0].description}</p>
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
              <p className="text-white/50 text-[13px] font-light leading-relaxed">{showcaseProducts[1].description}</p>
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
              <p className="text-white/50 text-[13px] font-light leading-relaxed">{showcaseProducts[2].description}</p>
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
              <p className="text-white/50 text-[13px] font-light leading-relaxed max-w-md">{showcaseProducts[3].description}</p>
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
              <p className="text-white/50 text-[13px] font-light leading-relaxed max-w-md">{showcaseProducts[4].description}</p>
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
