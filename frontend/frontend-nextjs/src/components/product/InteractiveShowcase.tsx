'use client';

import { useState, useEffect, useRef } from 'react';

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
      'Orchestrate operations visually. Link trigger conditions, processing layers, and applications together. The builder maps language commands into executable flows, automating tasks across your software stack.',
    features: ['Visual Flow Canvas', 'Multi-app Connections', 'Natural Language Translation'],
  },
];

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
        <div className="flex flex-col gap-4 mx-auto w-full max-w-[90%] md:max-w-[70%]">
          {QUESTIONS.slice(0, visibleQ).map((item, i) => (
            <div key={i} className="flex flex-col gap-2 animate-fade-in-up">
              <span className="text-xs text-white/50 font-medium">Q: {item.q}</span>
              <div className="bg-[#1E1E1E] border border-white/5 rounded-lg px-4 py-3 w-fit shadow-md">
                <p className="text-sm text-white/80 font-light">{item.a}</p>
              </div>
            </div>
          ))}
          {phase === 'thinking' && (
            <div className="flex items-center gap-2 mt-4 animate-fade-in-up">
               <span className="text-sm text-[#aec99d] font-medium tracking-wide">Aivory is analyzing{dots}</span>
            </div>
          )}
        </div>
      </div>

      {/* Score */}
      <div className={`absolute inset-0 flex flex-col justify-center items-center p-2 transition-all duration-500 delay-200 ${phase === 'score' ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'}`}>
        <div className="relative w-28 h-28 flex items-center justify-center mb-8">
           <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
             <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
             <circle cx="50" cy="50" r="42" fill="none" stroke="#aec99d" strokeWidth="6" strokeDasharray={264} strokeDashoffset={barsVisible ? 264 - (264 * 0.78) : 264} className="transition-all duration-1000 ease-out drop-shadow-[0_0_8px_rgba(174,201,157,0.4)]" />
           </svg>
           <div className="absolute flex flex-col items-center">
             <span className="text-3xl font-light text-white" style={{ fontFamily: "'Doto', 'Courier New', monospace" }}>{scoreVal}</span>
           </div>
        </div>
        <div className="w-full space-y-4 px-6 max-w-[80%] md:max-w-sm">
          {DIMS.map((dim) => (
            <div key={dim.label} className={`text-xs space-y-1.5 transition-all duration-500 ${barsVisible ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: `${dim.delay}s` }}>
              <div className="flex justify-between text-white/70 font-light"><span>{dim.label}</span><span className="text-[#aec99d]">{dim.val}%</span></div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden relative">
                <div className="absolute left-0 top-0 h-full bg-[#aec99d] rounded-full transition-all duration-700 ease-out" style={{ width: barsVisible ? `${dim.val}%` : '0%', transitionDelay: `${dim.delay}s` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ConsoleAnimation() {
  const [phase, setPhase] = useState<'typing' | 'sent' | 'thinking' | 'response'>('typing');
  const [typedText, setTypedText] = useState('');
  const [dots, setDots] = useState('');
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  const fullText = "Can you analyze my current lead generation process?";

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
    <div className="w-full h-full flex flex-col justify-end p-4 font-light relative pb-20">
      <div className="flex flex-col gap-6 w-full max-w-[100%] mx-auto mb-4">
        
        {/* User Message */}
        <div className={`flex justify-end transition-all duration-300 ease-out ${phase !== 'typing' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="bg-[#2A2A2A] rounded-3xl rounded-tr-md px-5 py-3 text-white/90 text-[14px] max-w-[85%] leading-relaxed shadow-md">
            {fullText}
          </div>
        </div>
        
        {/* AI Thinking & Response Area */}
        <div className={`flex flex-col gap-3 transition-all duration-300 ${phase === 'thinking' || phase === 'response' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 hidden'}`}>
          {/* Thinking Indicator */}
          {phase === 'thinking' && (
            <div className="flex items-center gap-2.5">
              <div className="flex -space-x-1.5 opacity-80">
                <div className="w-4 h-4 rounded-full bg-[#556B2F] border border-[#181818] relative z-30" />
                <div className="w-4 h-4 rounded-full bg-[#6B8E23] border border-[#181818] relative z-20" />
                <div className="w-4 h-4 rounded-full bg-[#9ACD32] border border-[#181818] relative z-10" />
              </div>
              <div className="text-white/50 text-[13px] font-medium flex items-center gap-1.5">
                Aivory is thinking <span className="animate-pulse">{dots}</span>
              </div>
            </div>
          )}

          {/* Response Text */}
          {phase === 'response' && (
            <div className="flex flex-col gap-3 pl-1 animate-fade-in-up">
              <div className="text-white/60 text-[14px] leading-relaxed">
                Analysis complete:
              </div>
              <div className="flex flex-col gap-3">
                {[
                  { text: 'Queried CRM records: 520 leads analyzed.', delay: '0s' },
                  { text: 'Flow analysis: 12 bottlenecks identified in triage.', delay: '0.4s' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5 opacity-0 animate-fade-in-up" style={{ animationDelay: item.delay }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-[#aec99d] mt-1.5 shrink-0" />
                    <span className="text-white/80 text-[14px] leading-relaxed">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-4 left-4 right-4 bg-[#222222] border border-white/5 rounded-full pl-3 pr-2 py-2 flex items-center gap-3 shadow-lg">
        <button className="w-7 h-7 rounded-full flex items-center justify-center text-white/40 hover:text-white/70 transition-colors shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14m-7-7h14" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div className="flex-1 text-[14px] truncate flex items-center transition-colors">
          {phase === 'typing' ? (
            <span className="text-white/90">{typedText}<span className="ml-[2px] w-[2px] h-3.5 bg-white/60 animate-pulse inline-block align-middle" /></span>
          ) : (
            <span className="text-white/30">What do you want to know?</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button className="w-7 h-7 flex items-center justify-center text-white/50 hover:text-white/80 transition-colors hidden sm:flex">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <button className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black hover:bg-white/90 transition-colors">
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
    <div className="w-full flex flex-col gap-4 h-full justify-end relative pb-6 sm:pb-20 p-4 font-light">
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

      <div className="absolute bottom-4 left-4 right-4 bg-[#222222] border border-white/5 rounded-full pl-3 pr-2 py-2 flex items-center gap-3 shadow-lg">
        <button className="w-7 h-7 rounded-full flex items-center justify-center text-white/40 hover:text-white/70 transition-colors shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14m-7-7h14" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div className="flex-1 text-[14px] truncate flex items-center transition-colors">
          {phase === 'typing' ? (
            <span className="text-white/90">{typedText}<span className="ml-[2px] w-[2px] h-3.5 bg-white/60 animate-pulse inline-block align-middle" /></span>
          ) : (
            <span className="text-white/30">What do you want to automate?</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black hover:bg-white/90 transition-colors">
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

        {waves.map((wave) => {
          const isActive = step >= wave.activeStep;
          return (
            <div key={wave.name} className="flex flex-col items-center gap-2 transition-all duration-500">
              <div className={`w-10 h-10 rounded-full border flex items-center justify-center text-xs transition-all duration-500 relative z-10 ${
                isActive ? 'border-[#aec99d] bg-[#111111] text-[#aec99d] font-semibold scale-110 shadow-[0_0_15px_rgba(174,201,157,0.3)]' : 'border-white/10 bg-[#111111] text-white/40 scale-100'
              }`} style={{ fontFamily: "'Doto', 'Courier New', monospace" }}>
                {wave.num}
              </div>
              <span className={`text-[10px] font-light transition-colors duration-500 ${isActive ? 'text-white/80' : 'text-white/50'}`}>{wave.name}</span>
            </div>
          );
        })}
      </div>

      {/* Deliverables list */}
      <div className="bg-[#111111] border border-white/5 rounded-2xl p-6 mx-auto w-full max-w-md space-y-4 shadow-lg transition-all duration-500">
        <div className="text-[13.5px] text-white uppercase tracking-widest font-light transition-all duration-500" style={{ fontFamily: "'Doto', 'Courier New', monospace" }}>
          {currentData.title}
        </div>
        <div className="space-y-3 relative overflow-hidden">
          {currentData.tasks.map((text, i) => {
            const isDone = i < checkedCount;
            return (
              <div key={`${currentWaveIdx}-${i}`} className="flex items-center gap-4 text-xs font-light transition-all duration-500 animate-fade-in-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <span className={`w-5 h-5 rounded border flex items-center justify-center text-[10px] transition-colors duration-500 ${
                  isDone ? 'border-[#aec99d] text-[#aec99d] bg-[#aec99d]/10' : 'border-white/10 text-transparent'
                }`}>
                  ✓
                </span>
                <span className={`transition-all duration-500 ${isDone ? 'line-through text-white/40' : 'text-white/80'}`}>{text}</span>
              </div>
            );
          })}
        </div>
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
    <div ref={containerRef} className="w-full h-full bg-[#151515] border border-white/5 rounded-3xl p-8 relative shadow-2xl flex flex-col justify-center items-center text-center">
      {/* Agent Label */}
      <div className={`transition-all duration-1000 ease-out absolute top-12 ${step >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <img src="/Aivory logo 2026.svg" alt="Aivory Agent" className="h-6 w-auto opacity-80 mx-auto" />
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
          <div className="text-[12px] text-[#c4c9b8] uppercase tracking-widest font-medium mb-3 mt-4">
            SCROLL TO EXPLORE
          </div>
          <div className="flex flex-col items-center space-y-[-14px]">
            <svg className="w-6 h-6 text-[#c4c9b8] animate-pulse" style={{ animationDelay: '0s' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <svg className="w-6 h-6 text-[#c4c9b8] animate-pulse" style={{ animationDelay: '0.2s' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <svg className="w-6 h-6 text-[#c4c9b8] animate-pulse" style={{ animationDelay: '0.4s' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function BlueprintAnimation() {
  return (
    <div className="flex-1 flex flex-col justify-center items-center w-full h-full opacity-0 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
      <div className="w-full bg-[#111111] border border-white/5 rounded-2xl p-8 relative shadow-lg">
        <div className="text-[10px] text-white uppercase tracking-widest text-center font-light mb-10 opacity-0 animate-fade-in" style={{ animationDelay: '0.6s', fontFamily: "'Doto', 'Courier New', monospace" }}>
          System Architecture Pipeline
        </div>
        
        {/* Visual pipeline stages */}
        <div className="flex justify-between items-center relative w-full px-4 mt-8 opacity-0 animate-fade-in" style={{ animationDelay: '1.2s' }}>
          <div className="absolute top-[16px] left-[15%] right-[15%] h-[1px] bg-white/10 -z-10" />
          <div className="absolute top-[16px] left-[15%] right-[15%] h-[2px] bg-[#aec99d] -z-10 origin-left opacity-0 animate-scale-x" style={{ animationDelay: '1.8s' }} />
          
          {[
            { name: 'Ingest', active: true, delay: '1.4s' },
            { name: 'Process', active: true, delay: '2.0s' },
            { name: 'Engine', active: true, delay: '2.6s', ping: true },
            { name: 'Action', active: false, delay: '3.2s' },
          ].map((node, i) => (
            <div key={node.name} className="flex flex-col items-center gap-3 opacity-0 animate-fade-in-up relative" style={{ animationDelay: node.delay }}>
              {node.ping && (
                <>
                  <div className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-[#aec99d] animate-ping opacity-60 z-20" />
                  <div className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-[#aec99d] z-20" />
                </>
              )}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs relative z-10 ${
                node.active ? 'bg-[#aec99d] text-black font-medium shadow-[0_0_15px_rgba(174,201,157,0.3)]' : 'bg-[#111111] border border-white/10 text-white/40 font-medium'
              }`} style={{ fontFamily: "'Manrope', sans-serif" }}>
                0{i + 1}
              </div>
              <span className="text-[10px] text-white/60 font-medium">{node.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function InteractiveShowcase() {
  const [activeIndex, setActiveIndex] = useState(-1);
  const [alignedIndex, setAlignedIndex] = useState<number | null>(null);
  
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

    // 2. Scroll Listener for precise Alignment (line drawing)
    const handleScroll = () => {
      if (!stickyBoxRef.current) return;
      
      const boxRect = stickyBoxRef.current.getBoundingClientRect();
      const targetY = boxRect.top + 60; 
      let newlyAligned: number | null = null;
      
      h4Refs.current.forEach((ref, idx) => {
        if (!ref) return;
        const rect = ref.getBoundingClientRect();
        const h4CenterY = rect.top + (rect.height / 2);
        
        if (Math.abs(h4CenterY - targetY) < 60) {
          newlyAligned = idx;
        }
      });
      
      setAlignedIndex((prev) => (prev !== newlyAligned ? newlyAligned : prev));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Trigger once on mount
    handleScroll();

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <section id="showcase" className="relative bg-black text-white py-16 md:py-32">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-24">
        {/* Sticky Scroll Layout Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 relative">
          
          {/* Left Column: Scrollable Description Blocks */}
          <div className="lg:col-span-5 flex flex-col gap-16 lg:gap-[30vh] lg:pb-[20vh]">
            <div ref={introRef} className="lg:min-h-[40vh] flex flex-col justify-center">
              <h2 className="text-[#c4c9b8] uppercase tracking-widest text-xs font-manrope font-light mb-3">
                Operational Framework
              </h2>
              <h3 className="text-3xl md:text-4xl lg:text-5xl font-light tracking-tight mb-6 leading-tight">
                From Assessment<br />to Staged Autonomy
              </h3>
              <p className="text-white/60 max-w-lg font-light leading-relaxed">
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
                <span className="text-[#c4c9b8] text-[15px] font-light tracking-[0.2em] mb-4 uppercase font-manrope">
                  {product.step}
                </span>
                <div className="flex items-center mb-6 relative w-full lg:w-[calc(100%+6rem)] z-10">
                  <h4 
                    ref={(el) => {
                      h4Refs.current[idx] = el;
                    }}
                    className="text-3xl font-light text-white shrink-0 pr-8"
                  >
                    {product.title}
                  </h4>
                  
                  {/* Animated Connecting Line to Right Visual Box */}
                  <div 
                    className={`hidden lg:block h-[1px] bg-[#b2cca2]/50 flex-grow transition-all duration-500 ease-out origin-left ${
                      alignedIndex === idx ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'
                    }`}
                  />
                </div>
                <p className="text-white/70 text-base font-light mb-8 leading-relaxed max-w-lg">
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
                <div className="flex lg:hidden w-full aspect-[4/3] sm:aspect-[16/11] bg-[#181818] rounded-3xl mt-10 relative overflow-hidden border border-[#b2cca2]/40 shadow-[0_0_30px_rgba(178,204,162,0.08)]">
                  <div className="absolute inset-0 p-4 md:p-6 flex flex-col">
                    {idx === 0 && <div className="flex-1 relative w-full h-full"><DiagnosticAnimation /></div>}
                    {idx === 1 && <BlueprintAnimation />}
                    {idx === 2 && <div className="flex-1 w-full h-full relative"><RoadmapAnimation /></div>}
                    {idx === 3 && <div className="flex-1 w-full h-full relative"><ConsoleAnimation /></div>}
                    {idx === 4 && <div className="w-full flex flex-col gap-4 h-full justify-center relative"><WorkflowAnimation /></div>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right Column: Sticky Mockup Visualizer Area */}
          <div className="hidden lg:col-span-7 lg:sticky lg:top-[12vh] lg:flex items-center justify-center z-20 mx-auto w-full max-w-[850px] aspect-[4/3] lg:aspect-[16/11]">
            <div 
              ref={stickyBoxRef}
              className={`w-full h-full bg-[#181818] border transition-all duration-500 rounded-3xl p-6 md:p-8 flex flex-col relative overflow-hidden shadow-2xl ${
                alignedIndex !== null ? 'border-[#b2cca2]/40 shadow-[0_0_30px_rgba(178,204,162,0.08)]' : 'border-white/5'
              }`}
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
                  <div className="text-[10px] text-white/30 text-center uppercase tracking-widest mt-6 pb-6 font-light">
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
                  <div className="text-[10px] text-white/30 text-center uppercase tracking-widest mt-6 pb-6 font-light">
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
                  <div className="text-[10px] text-[#c4c9b8] text-center uppercase tracking-widest mt-6 pb-6 font-manrope font-light">
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
                  <div className="text-[10px] text-white/30 text-center uppercase tracking-widest mt-6 pb-6 font-light">
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
                  <div className="text-[10px] text-white/30 text-center uppercase tracking-widest mt-6 pb-6 font-light">
                    * Natural language command translated into execution nodes.
                  </div>
                </div>

              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
