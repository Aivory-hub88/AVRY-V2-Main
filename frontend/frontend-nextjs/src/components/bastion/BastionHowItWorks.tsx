'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { 
  Target, Network, Radar, Shield, BrainCircuit, Layers,
  CheckCircle2, AlertTriangle, XCircle, Database, Cpu
} from 'lucide-react';

/* ── Original Data ─────────────────────────────────────────────────── */
const steps1 = [
  { id: 'observe', title: 'OBSERVE', icon: Target },
  { id: 'analyze', title: 'ANALYSE', icon: Network },
  { id: 'classify', title: 'CLASSIFY', icon: Radar },
];

const steps2 = [
  { num: '04', title: 'RESPOND', desc: 'Contains & neutralizes threats.' },
  { num: '05', title: 'LEARN', desc: 'Operational intelligence.' },
  { num: '06', title: 'STRENGTHEN', desc: 'Policy updates & posture.' },
];

const classifications = [
  { label: 'LEGITIMATE', icon: CheckCircle2 },
  { label: 'SUSPICIOUS', icon: AlertTriangle },
  { label: 'MALICIOUS', icon: XCircle },
];

const sources = ['WEB TRAFFIC', 'API REQUESTS', 'USERS', 'DEVICES', 'SYSTEMS', 'IOT / OT'];

/* ── HUD Typwriter Text Data ── */
const hudData = [
  { title: "Continuous Observation", desc: "AI-powered monitoring captures and normalizes all interactions across systems in real time." },
  { title: "Adaptive Engine", desc: "Behavioural analysis and correlation classify traffic based on risk scores and threat confidence." },
  { title: "Autonomous Defence", desc: "Adaptive response engine neutralizes threats while intelligence drives policy evolution." },
  { title: "Full System Active", desc: "All layers operating synchronously to provide complete enterprise protection." }
];

/* ── Components ── */
const PathLine = ({ path, active = false }: { path: string, active?: boolean }) => (
  <>
    {/* Base faint line */}
    <path d={path} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
    {/* Animated dash line */}
    <motion.path 
      d={path} fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeDasharray="4 8"
      initial={false}
      animate={{ opacity: active ? 1 : 0, strokeDashoffset: [24, 0] }}
      transition={{ opacity: { duration: 0.5 }, strokeDashoffset: { duration: 1, repeat: Infinity, ease: 'linear' } }}
    />
  </>
);

/* ── Main Component ── */
export default function BastionHowItWorks() {
  const [stage, setStage] = useState(0);
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, margin: '-20% 0px' });

  useEffect(() => {
    if (isInView) {
      const interval = setInterval(() => {
        setStage(s => (s + 1) % 4);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isInView]);

  // Stage Boolean Helpers
  const s0 = stage === 0 || stage === 3;
  const s1 = stage === 1 || stage === 3;
  const s2 = stage === 2 || stage === 3;

  return (
    <section ref={containerRef} className="relative bg-transparent text-white py-32 overflow-hidden flex flex-col items-center">
      
      {/* ── Fixed Typography ── */}
      <div className="z-50 text-center w-full px-6 mb-12">
        <h2 className="text-3xl md:text-5xl font-manrope font-light uppercase tracking-widest mb-4">HOW BASTION WORKS</h2>
        <p className="text-sm font-mono text-white/50 tracking-widest uppercase">Adaptive Defence That Evolves</p>
      </div>

      <div className="w-full flex flex-col items-center md:scale-[0.8] md:origin-top md:-mb-[160px]">
        {/* ── Fixed HUD (Screen Space) ── */}
        <div className="z-50 w-full max-w-2xl px-6 mb-8 pointer-events-none">
          <div className="relative border border-white/20 bg-white/5 backdrop-blur-md p-4 flex flex-col items-center text-center">
            {/* Decorative HUD corners */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/60" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/60" />
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-white/60" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/60" />
            
            <AnimatePresence mode="wait">
              <motion.div
                key={stage}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center justify-center gap-3 mb-2">
                  <span className="px-2 py-0.5 border border-white/30 text-white/80 font-mono text-[10px] uppercase">
                    STAGE 0{stage === 3 ? '1-03' : stage + 1}
                  </span>
                  <h3 className="text-lg font-manrope font-medium text-white tracking-wider uppercase">{hudData[stage].title}</h3>
                </div>
                <p className="text-xs font-mono text-white/60 leading-relaxed max-w-lg mx-auto">{hudData[stage].desc}</p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* ── 2D Schematic Viewport (Desktop) ── */}
        <div className="relative w-full max-w-[1000px] h-[700px] hidden md:block mt-8 font-mono">
          
          {/* SVG Connections */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
             {/* Source -> Engine */}
             <PathLine path="M 150 500 C 150 440, 300 440, 300 380" active={s0} />
             <PathLine path="M 200 500 C 200 440, 350 440, 350 380" active={s0} />
             <PathLine path="M 250 500 C 250 440, 400 440, 400 380" active={s0} />
             
             {/* Engine -> Classifications */}
             <PathLine path="M 600 380 C 600 440, 720 440, 720 500" active={s1} />
             <PathLine path="M 650 380 C 650 440, 770 440, 770 500" active={s1} />
             <PathLine path="M 700 380 C 700 440, 820 440, 820 500" active={s1} />

             {/* Engine -> Outcomes */}
             <PathLine path="M 450 260 L 450 160" active={s2} />
             <PathLine path="M 500 260 L 500 160" active={s2} />
             <PathLine path="M 550 260 L 550 160" active={s2} />
          </svg>

          {/* 1. SOURCES (Bottom Left) */}
          <motion.div 
            className={`absolute left-[50px] top-[500px] w-[300px] border p-5 transition-all duration-500 z-10 ${s0 ? 'border-white/60 bg-white/5 backdrop-blur-md shadow-[0_0_20px_rgba(255,255,255,0.05)]' : 'border-white/10 bg-transparent'}`}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          >
            <div className="flex items-center gap-2 border-b border-white/20 pb-2 mb-4">
              <Database className={`w-4 h-4 ${s0 ? 'text-white' : 'text-white/40'}`} />
              <h4 className={`text-[11px] tracking-widest ${s0 ? 'text-white' : 'text-white/40'}`}>DATA SOURCES</h4>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {sources.map((src, i) => (
                <div key={i} className={`border p-2 text-[10px] text-center transition-colors ${s0 ? 'border-white/40 text-white/90' : 'border-white/10 text-white/30'}`}>
                  {src}
                </div>
              ))}
            </div>
          </motion.div>

          {/* 2. BASTION ENGINE (Middle Center) */}
          <motion.div 
            className={`absolute left-[250px] top-[260px] w-[500px] h-[120px] border transition-all duration-500 z-10 flex flex-col justify-center ${s1||s0 ? 'border-white/60 bg-white/5 backdrop-blur-md shadow-[0_0_30px_rgba(255,255,255,0.05)]' : 'border-white/10 bg-transparent'}`}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          >
            <div className={`absolute -top-3 left-4 px-2 text-[10px] border bg-[#050505] ${s1||s0 ? 'border-white/40 text-white/90' : 'border-white/20 text-white/40'}`}>
              BASTION ENGINE
            </div>
            
            <div className="flex w-full justify-center items-center gap-6 px-4 relative">
               {steps1.map((step, i) => {
                 const active = (s0 && step.id === 'observe') || (s1 && step.id !== 'observe') || stage === 3;
                 return (
                   <React.Fragment key={i}>
                     <div className={`relative z-10 flex flex-col items-center bg-[#050505] border p-4 transition-colors ${active ? 'border-white/60' : 'border-white/10'}`}>
                       <div className={`p-3 mb-2 transition-colors ${active ? 'text-white' : 'text-white/30'}`}>
                         <step.icon className="w-6 h-6" />
                       </div>
                       <span className={`text-[10px] tracking-widest transition-colors ${active ? 'text-white' : 'text-white/40'}`}>{step.title}</span>
                     </div>
                     {i < steps1.length - 1 && (
                       <div className="flex gap-1 overflow-hidden">
                         {[0, 1, 2].map((arrowIndex) => (
                           <motion.div
                             key={arrowIndex}
                             initial={{ opacity: 0.1, x: -5 }}
                             animate={{ 
                               opacity: active ? [0.1, 1, 0.1] : 0.1,
                               x: active ? [0, 5, 0] : 0
                             }}
                             transition={{
                               duration: 1.5,
                               repeat: Infinity,
                               delay: arrowIndex * 0.2,
                               ease: "linear"
                             }}
                           >
                             <svg className={`w-5 h-5 ${active ? 'text-white/80' : 'text-white/20'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                               <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                             </svg>
                           </motion.div>
                         ))}
                       </div>
                     )}
                   </React.Fragment>
                 );
               })}
            </div>
          </motion.div>

          {/* 3. CLASSIFICATIONS (Bottom Right) */}
          <motion.div 
            className={`absolute right-[50px] top-[500px] w-[280px] border p-5 transition-all duration-500 z-10 ${s1 ? 'border-white/60 bg-white/5 backdrop-blur-md shadow-[0_0_20px_rgba(255,255,255,0.05)]' : 'border-white/10 bg-transparent'}`}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          >
            <div className="flex items-center gap-2 border-b border-white/20 pb-2 mb-4">
              <Cpu className={`w-4 h-4 ${s1 ? 'text-white' : 'text-white/40'}`} />
              <h4 className={`text-[11px] tracking-widest ${s1 ? 'text-white' : 'text-white/40'}`}>RISK CLASSIFICATION</h4>
            </div>
            <div className="flex flex-col gap-3">
              {classifications.map((c, i) => (
                <div key={i} className={`flex items-center gap-4 border p-2 transition-colors ${s1 ? 'border-white/40 bg-white/10' : 'border-white/10'}`}>
                  <c.icon className={`w-4 h-4 ${s1 ? 'text-white' : 'text-white/30'}`} />
                  <span className={`text-[10px] ${s1 ? 'text-white/90' : 'text-white/40'}`}>{c.label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* 4. OUTCOMES (Top Center) */}
          <motion.div 
            className={`absolute left-[200px] top-[40px] w-[600px] h-[120px] border transition-all duration-500 z-10 flex flex-col justify-center ${s2 ? 'border-white/60 bg-white/5 backdrop-blur-md shadow-[0_0_30px_rgba(255,255,255,0.05)]' : 'border-white/10 bg-transparent'}`}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          >
            <div className={`absolute -top-3 right-4 px-2 text-[10px] border bg-[#050505] ${s2 ? 'border-white/40 text-white/90' : 'border-white/20 text-white/40'}`}>
              OUTCOMES & ACTIONS
            </div>
            <div className="flex w-full justify-around items-center px-4">
               {steps2.map((s, i) => (
                 <div key={i} className={`flex flex-col border p-4 w-[30%] transition-colors ${s2 ? 'border-white/40 bg-white/5' : 'border-white/10'}`}>
                    <span className={`text-[10px] mb-1 ${s2 ? 'text-white/90' : 'text-white/40'}`}>{s.num}. {s.title}</span>
                    <p className={`text-[9px] leading-relaxed ${s2 ? 'text-white/60' : 'text-white/30'}`}>{s.desc}</p>
                 </div>
               ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Mobile Fallback (Flat Layout) ── */}
      <div className="md:hidden w-full max-w-sm mx-auto space-y-6 px-6 mt-8 relative z-10 font-mono">
        
        {/* Simplified mobile blocks matching schematic style */}
        <div className={`p-5 border transition-colors ${s2 ? 'border-white/60 bg-white/5' : 'border-white/20'}`}>
          <span className={`text-[10px] tracking-widest mb-3 block ${s2 ? 'text-white' : 'text-white/40'}`}>OUTCOMES & ACTIONS</span>
          <div className="space-y-3">
             {steps2.map((s,i) => (
               <div key={i} className="text-xs">
                 <span className={s2 ? 'text-white' : 'text-white/40'}>{s.num}. {s.title}</span>
               </div>
             ))}
          </div>
        </div>
        
        <div className={`p-5 border transition-colors ${s1||s0 ? 'border-white/60 bg-white/5' : 'border-white/20'}`}>
          <span className={`text-[10px] tracking-widest mb-3 block ${s1||s0 ? 'text-white' : 'text-white/40'}`}>BASTION ENGINE</span>
          <div className="flex gap-4">
             {steps1.map((s,i) => (
               <div key={i} className="flex flex-col items-center gap-1">
                 <span className={`text-[9px] ${((s0 && s.id==='observe')||(s1 && s.id!=='observe')||stage===3) ? 'text-white' : 'text-white/40'}`}>{s.title}</span>
               </div>
             ))}
          </div>
        </div>
        
        <div className={`p-5 border transition-colors ${s0 ? 'border-white/60 bg-white/5' : 'border-white/20'}`}>
          <span className={`text-[10px] tracking-widest mb-3 block ${s0 ? 'text-white' : 'text-white/40'}`}>DATA SOURCES</span>
          <p className={`text-[10px] leading-relaxed ${s0 ? 'text-white/70' : 'text-white/40'}`}>{sources.join(', ')}</p>
        </div>
      </div>

    </section>
  );
}