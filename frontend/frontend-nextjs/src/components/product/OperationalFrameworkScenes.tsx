'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';

const UI = {
  page: '#353531',
  surface: '#3a3a36',
  surfaceDark: '#282827',
  composer: '#42423f',
  border: 'rgba(255,255,255,0.07)',
  text: '#f7f7f7',
  muted: '#a1a1aa',
  accent: '#c7d3b5',
  accentStrong: '#dce7cd',
  amber: '#e8d06f',
};

const panelStyle = {
  background: UI.surface,
  border: `1px solid ${UI.border}`,
  boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
};

const enter = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.32 },
};

function AivoryMark({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <img
      src="/Aivory%20icon%202026.svg"
      alt="Aivory"
      width={91}
      height={79}
      className={`${className} object-contain brightness-0 invert`}
    />
  );
}

function DashboardFrame({
  label,
  meta,
  children,
}: {
  label: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="absolute inset-0 flex min-h-0 flex-col overflow-hidden text-[#f7f7f7]"
      style={{ background: UI.page, fontFamily: "'Inter Tight', Inter, sans-serif" }}
    >
      <div
        className="flex h-9 shrink-0 items-center justify-between border-b px-3"
        style={{ borderColor: UI.border, background: '#30302d' }}
      >
        <div className="flex items-center gap-2">
          <AivoryMark className="h-4 w-4" />
          <span className="text-[10px] font-light tracking-wide text-white/85">{label}</span>
        </div>
        <span className="text-[8px] uppercase tracking-[0.12em] text-[#a1a1aa]">{meta || 'Aivory workspace'}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden p-3">{children}</div>
    </div>
  );
}

function ReadinessLoader({ label }: { label: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <div className="flex h-12 items-end gap-1.5" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((index) => (
          <motion.span
            key={index}
            className="w-1.5 rounded-full bg-[#c7d3b5]"
            animate={reduceMotion ? { height: 24, opacity: 0.75 } : { height: [10, 34, 16, 28, 10], opacity: [0.3, 1, 0.5, 0.85, 0.3] }}
            transition={{ duration: 1.8, repeat: Infinity, delay: index * 0.1, ease: 'easeInOut' }}
          />
        ))}
      </div>
      <span className="text-[10px] font-light tracking-wide text-white/80">{label}</span>
      <div className="h-px w-28 overflow-hidden bg-white/10">
        <motion.div
          className="h-full bg-[#c7d3b5]"
          initial={{ width: '10%' }}
          animate={{ width: reduceMotion ? '78%' : ['10%', '92%', '10%'] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </div>
  );
}

// Local, dependency-free interpretation of the dotm-hex-3 / Honey Gate loader.
function HoneyGateLoader({ label }: { label: string }) {
  const reduceMotion = useReducedMotion();
  const rowLengths = [3, 4, 5, 6, 5, 4, 3];

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4" role="status" aria-label={label}>
      <div className="flex flex-col items-center gap-[5px]" aria-hidden="true">
        {rowLengths.map((length, row) => (
          <div key={row} className="flex gap-[5px]">
            {Array.from({ length }).map((_, column) => (
              <motion.span
                key={`${row}-${column}`}
                className="h-[7px] w-[7px] rounded-full bg-[#dce7cd] shadow-[0_0_8px_rgba(220,231,205,0.2)]"
                animate={reduceMotion ? { opacity: 0.75, scale: 1 } : { opacity: [0.16, 1, 0.16], scale: [0.72, 1.1, 0.72] }}
                transition={{
                  duration: 1.65,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: ((row * 0.11) + (column * 0.12)) % 0.85,
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="text-center">
        <p className="text-[10px] font-light tracking-wide text-white/85">{label}</p>
        <p className="mt-1 text-[7px] uppercase tracking-[0.16em] text-[#a1a1aa]">Structuring objectives · dependencies · outcomes</p>
      </div>
    </div>
  );
}

type DiagnosticPhase = 'capture' | 'analyze' | 'result' | 'opportunity';

function OperationalHealthCard({ phase }: { phase: DiagnosticPhase }) {
  const dimensions = [
    ['Strategy', 70],
    ['Data', 42],
    ['Process', 46],
    ['People', 65],
    ['Governance', 73],
    ['Security', 51],
  ] as const;

  return (
    <motion.div key="operational-health" {...enter} className="flex h-full min-h-0 flex-col rounded-xl border border-white/[0.07] bg-[#3a3a36] p-3">
      <div className="border-b border-white/[0.07] pb-1.5">
        <h5 className="text-[13px] font-light text-[#f7f7f7]">Operational Health</h5>
      </div>

      <div className="grid grid-cols-[0.72fr_1.45fr] gap-3 border-b border-white/[0.07] py-2.5">
        <div className="flex flex-col items-center justify-center">
          <div className="relative h-[92px] w-[92px]">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle cx="50" cy="50" r="37" fill="none" stroke="rgba(255,255,255,0.045)" strokeWidth="8" />
              <motion.circle
                cx="50" cy="50" r="37" fill="none" stroke="#c7d3b5" strokeWidth="8" strokeLinecap="round"
                strokeDasharray="232.5" initial={{ strokeDashoffset: 232.5 }} animate={{ strokeDashoffset: 118.6 }} transition={{ duration: 1.5, ease: 'easeOut' }}
                style={{ filter: 'drop-shadow(0 0 7px rgba(199,211,181,.42))' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <strong className="text-[22px] font-light">49</strong>
              <span className="text-[7px] text-[#a1a1aa]">Initiating</span>
            </div>
          </div>
          <p className="mt-1 text-[8px] text-white/80">49 vs industry median 50</p>
          <p className="mt-1 text-center text-[5.5px] text-[#777773]">Directional benchmark, not a measured statistic.</p>
        </div>

        <div className="grid grid-cols-[1.15fr_.85fr] items-center gap-2">
          <svg viewBox="0 0 190 118" className="h-[112px] w-full overflow-visible">
            {[1, 0.75, 0.5, 0.25].map((scale) => (
              <polygon key={scale} points="95,13 135,36 135,82 95,105 55,82 55,36" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="0.7" transform={`translate(${95 * (1 - scale)} ${59 * (1 - scale)}) scale(${scale})`} />
            ))}
            {[[95,13],[135,36],[135,82],[95,105],[55,82],[55,36]].map(([x,y]) => <line key={`${x}-${y}`} x1="95" y1="59" x2={x} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="0.7" />)}
            <polygon points="95,36 115,47 115,71 95,82 75,71 75,47" fill="rgba(232,208,111,.025)" stroke="#e8d06f" strokeDasharray="2 2" strokeWidth="0.8" />
            <motion.polygon
              points="95,27 112,49 113,70 95,89 66,76 75,47"
              fill="rgba(199,211,181,.16)" stroke="#c7d3b5" strokeWidth="1.4"
              initial={{ opacity: 0, scale: 0.45, transformOrigin: '95px 59px' }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9 }}
            />
            {[[95,27],[112,49],[113,70],[95,89],[66,76],[75,47]].map(([x,y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="2.1" fill="#eef4e8" />)}
            {[
              ['Strategy',95,7,'middle'],['Data',146,34,'start'],['Process',146,86,'start'],
              ['People',95,116,'middle'],['Governance',44,86,'end'],['Security',44,34,'end'],
            ].map(([label,x,y,anchor]) => <text key={label} x={x} y={y} fill="#a1a1aa" fontSize="6" textAnchor={anchor as 'start' | 'middle' | 'end'}>{label}</text>)}
          </svg>
          <div className="text-[6px] text-[#a1a1aa]">
            <div className="mb-1.5 flex items-center gap-2"><span className="h-0.5 w-3 bg-[#c7d3b5]" />Your score</div>
            <div className="mb-2 flex items-center gap-2"><span className="w-3 border-t border-dashed border-[#e8d06f]" />Industry median</div>
            <p className="text-center leading-relaxed text-[#777773]">Directional benchmark — a modeled estimate from published operations-maturity research, not a measured industry statistic.</p>
          </div>
        </div>
      </div>

      <p className="border-b border-white/[0.07] py-2 text-center text-[8px] text-white/85">Data is your weakest link — it trails the average of your other five dimensions by 19 points.</p>

      <div className="grid grid-cols-[105px_1fr] items-center gap-3 border-b border-white/[0.07] py-2">
        <div><span className="text-[6px] uppercase tracking-[0.12em] text-[#a1a1aa]">Strongest</span><p className="text-[9px] font-light">Governance</p></div>
        <p className="flex items-start gap-2 text-[7px] leading-relaxed text-white/70"><span className="mt-0.5 text-[#c7d3b5]">▲</span>Your company scores 49/100, placing it at Initiating maturity. (composite blended 70% deterministic + 30% AI assessment)</p>
      </div>

      <div className="min-h-0 flex-1 pt-2">
        <p className="text-[6px] uppercase tracking-[0.1em] text-[#8b8b86]">Dimensions vs Industry Median</p>
        <p className="mb-1.5 mt-1 text-[8px] text-white/85">Below industry median in 2 of 6 dimensions — Data trails furthest, by 8 points.</p>
        <div className="space-y-1">
          {dimensions.map(([label, value], index) => (
            <div key={label} className="grid grid-cols-[62px_1fr_90px] items-center gap-2 text-[6.5px]">
              <span className="text-white/80">{label}</span>
              <div className="relative h-1 rounded-full bg-white/[0.07]">
                <motion.div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#879678] to-[#c7d3b5]" initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.75, delay: index * 0.08 }} />
                <span className="absolute left-1/2 top-1/2 h-[6px] w-[6px] -translate-x-1/2 -translate-y-1/2 rotate-45 border border-[#e8d06f] bg-[#6f765f]" />
              </div>
              <span className="text-[#a1a1aa]">{value} vs industry median 50</span>
            </div>
          ))}
        </div>
        <motion.p animate={{ opacity: phase === 'opportunity' ? 1 : 0.65 }} className="mt-1.5 text-[6px] text-white/55">Directional benchmark — modeled from published operations-maturity research.</motion.p>
      </div>
    </motion.div>
  );
}

const diagnosticTimeline = [
  [1800, 'analyze'],
  [3900, 'result'],
  [9200, 'opportunity'],
] as const;

export function DiagnosticAnimation() {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<DiagnosticPhase>(reduceMotion ? 'result' : 'capture');

  useEffect(() => {
    if (reduceMotion) {
      setPhase('result');
      return;
    }
    let timers: ReturnType<typeof setTimeout>[] = [];
    let cancelled = false;
    const run = () => {
      setPhase('capture');
      diagnosticTimeline.forEach(([delay, next]) => timers.push(setTimeout(() => setPhase(next), delay)));
      timers.push(setTimeout(() => !cancelled && run(), 13500));
    };
    run();
    return () => { cancelled = true; timers.forEach(clearTimeout); };
  }, [reduceMotion]);

  return (
    <DashboardFrame label="Business Assessment" meta="Executive view">
      <AnimatePresence mode="wait">
        {phase === 'capture' && (
          <motion.div key="capture" {...enter} className="flex h-full items-center justify-center">
            <div className="w-full max-w-[330px] rounded-xl p-4" style={panelStyle}>
              <div className="mb-3 flex items-center justify-between">
                <div><p className="text-[8px] uppercase tracking-[0.14em] text-[#c7d3b5]">Operations baseline</p><p className="mt-1 text-[12px] font-light">How does work move today?</p></div>
                <span className="rounded-full border border-white/10 px-2 py-1 text-[8px] text-[#a1a1aa]">12 / 16</span>
              </div>
              <div className="mb-4 h-1 overflow-hidden rounded-full bg-white/5"><motion.div className="h-full bg-[#c7d3b5]" initial={{ width: '48%' }} animate={{ width: '75%' }} transition={{ duration: 1.3 }} /></div>
              {['Mostly manual and fragmented', 'Documented across core teams', 'Measured and continuously improved'].map((option, index) => (
                <motion.div
                  key={option}
                  className="mb-2 flex items-center gap-2 rounded-lg border px-3 py-2 text-[9px]"
                  style={{ borderColor: index === 1 ? 'rgba(199,211,181,0.42)' : UI.border, background: index === 1 ? 'rgba(199,211,181,0.07)' : UI.page, color: index === 1 ? UI.text : UI.muted }}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.18 * index }}
                >
                  <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border" style={{ borderColor: index === 1 ? UI.accent : 'rgba(255,255,255,0.16)' }}>{index === 1 && <span className="h-1.5 w-1.5 rounded-full bg-[#c7d3b5]" />}</span>
                  {option}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
        {phase === 'analyze' && <motion.div key="analyze" {...enter} className="h-full"><ReadinessLoader label="Aivory is scoring operational readiness" /></motion.div>}
        {(phase === 'result' || phase === 'opportunity') && <OperationalHealthCard phase={phase} />}
      </AnimatePresence>
    </DashboardFrame>
  );
}

type BlueprintPhase = 'source' | 'building' | 'blueprint' | 'ready';
const blueprintTimeline = [[2200, 'building'], [5000, 'blueprint'], [10500, 'ready']] as const;

export function BlueprintAnimation() {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<BlueprintPhase>(reduceMotion ? 'blueprint' : 'source');

  useEffect(() => {
    if (reduceMotion) return;
    let timers: ReturnType<typeof setTimeout>[] = [];
    let cancelled = false;
    const run = () => {
      setPhase('source');
      blueprintTimeline.forEach(([delay, next]) => timers.push(setTimeout(() => setPhase(next), delay)));
      timers.push(setTimeout(() => !cancelled && run(), 14200));
    };
    run();
    return () => { cancelled = true; timers.forEach(clearTimeout); };
  }, [reduceMotion]);

  return (
    <DashboardFrame label="Transformation Blueprint" meta="Strategy architecture">
      <AnimatePresence mode="wait">
        {phase === 'source' && (
          <motion.div key="source" {...enter} className="flex h-full items-center justify-center">
            <div className="w-full max-w-[320px] rounded-xl p-4" style={panelStyle}>
              <div className="mb-3 flex items-center justify-between">
                <div><p className="text-[8px] uppercase text-[#a1a1aa]">Assessment input</p><p className="text-[12px]">Operational Readiness</p></div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-[4px] border-[#c7d3b5] text-[14px] font-light">64</div>
              </div>
              {['Centralise customer data', 'Standardise lead handoff', 'Automate qualification'].map((item, index) => (
                <motion.div key={item} className="mb-1.5 flex items-center gap-2 rounded-md bg-[#353531] px-2 py-1.5 text-[8px] text-white/75" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.18 }}>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#c7d3b5]" />{item}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
        {phase === 'building' && <motion.div key="building" {...enter} className="h-full"><HoneyGateLoader label="Mapping objectives into operating architecture" /></motion.div>}
        {(phase === 'blueprint' || phase === 'ready') && (
          <motion.div key="blueprint" {...enter} className="flex h-full min-h-0 flex-col gap-2">
            <div className="flex items-center justify-between">
              <div><p className="text-[8px] uppercase tracking-[0.14em] text-[#a1a1aa]">AI transformation blueprint</p><p className="text-[12px] font-light">Lead-to-Revenue Architecture</p></div>
              <span className="rounded-full border border-[#c7d3b5]/25 bg-[#c7d3b5]/10 px-2 py-1 text-[7px] text-[#dce7cd]">READY · 64%</span>
            </div>

            <div className="rounded-lg px-3 py-2" style={panelStyle}>
              <p className="text-[6px] uppercase tracking-[0.12em] text-[#c7d3b5]">Strategic objective</p>
              <p className="mt-1 text-[9px] text-white/85">Scale qualified pipeline without increasing operational headcount.</p>
              <div className="mt-2 grid grid-cols-3 gap-3 border-t border-white/[0.07] pt-2">
                {[[ 'Conversion', '+18%' ], [ 'Cycle time', '-32%' ], [ 'Manual work', '-41%' ]].map(([label, value]) => <div key={label}><p className="text-[6px] text-[#a1a1aa]">{label}</p><p className="text-[9px] font-light">{value}</p></div>)}
              </div>
            </div>

            <div className="min-h-0 flex-1 rounded-xl p-2.5" style={panelStyle}>
              <div className="mb-2 flex items-center justify-between"><span className="text-[7px] uppercase tracking-[0.12em] text-[#a1a1aa]">Target architecture</span><span className="text-[7px] text-[#c7d3b5]">4 connected layers</span></div>
              <div className="flex items-center justify-between gap-1">
                {[[ '01', 'Capture', 'CRM + Forms' ], [ '02', 'Enrich', 'Data layer' ], [ '03', 'Decide', 'AI routing' ], [ '04', 'Act', 'Sales ops' ]].map(([num, title, detail], index) => (
                  <div key={title} className="contents">
                    <motion.div className="min-w-0 flex-1 rounded-lg border border-white/[0.07] bg-[#353531] p-2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.14 }}>
                      <span className="text-[6px] text-[#c7d3b5]">{num}</span><p className="truncate text-[8px] font-light">{title}</p><p className="truncate text-[6px] text-[#a1a1aa]">{detail}</p>
                    </motion.div>
                    {index < 3 && <motion.span className="h-px w-2 shrink-0 bg-[#c7d3b5]" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.3 + index * 0.14 }} />}
                  </div>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {[[ 'Lead Intake Agent', 'Classify & enrich' ], [ 'Revenue Signal Monitor', 'Detect & escalate' ]].map(([name, detail]) => (
                  <div key={name} className="flex items-center gap-2 rounded-md border border-white/[0.05] bg-[#282827] px-2 py-1.5"><span className="flex h-4 w-4 items-center justify-center rounded bg-[#c7d3b5]/10 text-[7px] text-[#dce7cd]">AI</span><div><p className="text-[7px]">{name}</p><p className="text-[6px] text-[#a1a1aa]">{detail}</p></div></div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-white/[0.07] bg-[#3a3a36] px-3 py-2">
              <div className="flex items-center justify-between">
                {['Foundation', 'Pilot', 'Scale'].map((wave, index) => (
                  <div key={wave} className="flex items-center gap-1.5">
                    <motion.span className="flex h-4 w-4 items-center justify-center rounded-full border text-[6px]" style={{ borderColor: index === 0 || phase === 'ready' ? UI.accent : 'rgba(255,255,255,0.14)', color: index === 0 || phase === 'ready' ? UI.accentStrong : UI.muted }} animate={phase === 'ready' ? { boxShadow: ['0 0 0 rgba(199,211,181,0)', '0 0 10px rgba(199,211,181,.32)', '0 0 0 rgba(199,211,181,0)'] } : {}} transition={{ duration: 1.5, repeat: Infinity, delay: index * 0.2 }}>{index + 1}</motion.span>
                    <span className="text-[7px] text-white/75">{wave}</span>{index < 2 && <span className="mx-1 h-px w-5 bg-white/10" />}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardFrame>
  );
}

const roadmapPhases = [
  { name: 'Foundation', time: 'Weeks 1–2', milestone: 'Data baseline approved', kpi: '100%' },
  { name: 'Pilot', time: 'Weeks 3–5', milestone: 'Lead routing live', kpi: '-28%' },
  { name: 'Scale', time: 'Weeks 6–8', milestone: 'Sales team onboarded', kpi: '+18%' },
  { name: 'Optimise', time: 'Week 9+', milestone: 'Governance review', kpi: '2.4x' },
];

export function RoadmapAnimation() {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(reduceMotion ? 2 : 0);
  const [checked, setChecked] = useState(reduceMotion ? 3 : 0);

  useEffect(() => {
    if (reduceMotion) return;
    let activeIndex = 0;
    let checkIndex = 0;
    const tick = setInterval(() => {
      checkIndex += 1;
      if (checkIndex > 3) {
        checkIndex = 0;
        activeIndex = (activeIndex + 1) % roadmapPhases.length;
        setActive(activeIndex);
      }
      setChecked(checkIndex);
    }, 1150);
    return () => clearInterval(tick);
  }, [reduceMotion]);

  const current = roadmapPhases[active];
  const milestones = [current.milestone, active === 0 ? 'Ownership assigned' : 'Acceptance criteria met', active < 2 ? 'Risk controls documented' : 'Executive KPI validated'];

  return (
    <DashboardFrame label="Transformation Roadmap" meta="Delivery plan">
      <div className="flex h-full min-h-0 flex-col gap-2">
        <div className="flex items-center justify-between"><div><p className="text-[8px] uppercase tracking-[0.14em] text-[#a1a1aa]">Implementation roadmap</p><p className="text-[12px] font-light">Lead Operations Transformation</p></div><span className="rounded-full border border-white/10 bg-[#282827] px-2 py-1 text-[7px] text-white/70">9 weeks</span></div>
        <div className="rounded-xl px-3 py-3" style={panelStyle}>
          <div className="relative flex justify-between">
            <div className="absolute left-[7%] right-[7%] top-[11px] h-px bg-white/10" />
            <motion.div className="absolute left-[7%] top-[11px] h-px bg-[#c7d3b5]" animate={{ width: `${active * 28.5}%` }} transition={{ duration: 0.45 }} />
            {roadmapPhases.map((item, index) => (
              <div key={item.name} className="relative z-10 flex w-1/4 flex-col items-center">
                <motion.div className="flex h-[22px] w-[22px] items-center justify-center rounded-full border bg-[#353531] text-[7px]" animate={{ borderColor: index <= active ? UI.accent : 'rgba(255,255,255,.14)', color: index <= active ? UI.accentStrong : UI.muted, scale: index === active ? 1.12 : 1 }}>{index + 1}</motion.div>
                <p className="mt-1 text-[7px] text-white/80">{item.name}</p><p className="text-[6px] text-[#a1a1aa]">{item.time}</p>
              </div>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={active} {...enter} className="min-h-0 flex-1 overflow-hidden rounded-xl" style={panelStyle}>
            <div className="flex items-center justify-between border-b border-white/[0.07] px-3 py-2"><div><p className="text-[7px] uppercase text-[#c7d3b5]">Phase {active + 1}</p><p className="text-[10px] font-light">{current.name}</p></div><span className="text-[7px] text-[#a1a1aa]">{checked}/3 complete</span></div>
            <div className="h-0.5 bg-white/5"><motion.div className="h-full bg-[#c7d3b5]" animate={{ width: `${checked * 33.33}%` }} /></div>
            <div className="grid grid-cols-[1.4fr_.8fr] gap-2 p-3">
              <div>
                <p className="mb-1.5 text-[6px] uppercase tracking-[0.12em] text-[#a1a1aa]">Milestones</p>
                {milestones.map((milestone, index) => (
                  <div key={milestone} className="mb-1.5 flex items-center gap-2 text-[7px] text-white/75">
                    {/* 'transparent' isn't an animatable color -- Motion can't interpolate
                        to/from it and silently drops the transition, which also disrupted
                        the shared animate() call enough to leave a NaN opacity on later
                        properties. Zero-alpha rgba fades correctly instead. */}
                    <motion.span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border text-[8px]" animate={{ background: index < checked ? UI.accent : 'rgba(0,0,0,0)', borderColor: index < checked ? UI.accent : 'rgba(255,255,255,.16)', color: index < checked ? '#20201e' : 'rgba(32,32,30,0)' }}>✓</motion.span>
                    <span className={index < checked ? 'text-white/45 line-through' : ''}>{milestone}</span>
                  </div>
                ))}
                <div className="mt-2 flex flex-wrap gap-1"><span className="rounded-full border border-white/10 bg-[#282827] px-2 py-1 text-[6px] text-white/65">CRM Sync</span><span className="rounded-full border border-white/10 bg-[#282827] px-2 py-1 text-[6px] text-white/65">Lead Agent</span></div>
              </div>
              <div className="grid gap-1.5">
                <div className="rounded-lg border border-white/[0.07] bg-[#353531] p-2"><p className="text-[6px] uppercase text-[#a1a1aa]">Target KPI</p><p className="mt-1 text-[15px] font-light text-[#dce7cd]">{current.kpi}</p></div>
                <div className="rounded-lg border border-white/[0.07] bg-[#353531] p-2"><p className="text-[6px] uppercase text-[#a1a1aa]">Status</p><div className="mt-1 flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#c7d3b5]" /><span className="text-[7px]">On track</span></div></div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </DashboardFrame>
  );
}

type ConsolePhase = 'idle' | 'typing' | 'submitted' | 'thinking' | 'responding' | 'complete';
const consolePrompt = 'Review today’s operations and flag anything that needs attention.';
const consoleResponse = 'I found two items to review: lead-response time is 18% above target, and three workflow runs need approval. I’ve grouped both by owner and impact.';

function UtilityPill({ children, icon }: { children: React.ReactNode; icon: React.ReactNode }) {
  return <div className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.09] bg-[#3a3a36] px-2.5 py-1 text-[7px] text-white/65">{icon}{children}</div>;
}

const connectedApps = [
  { src: '/integrations/icons/slack.svg', alt: 'Slack' },
  { src: '/integrations/icons/openai.svg', alt: 'OpenAI' },
  { src: '/integrations/icons/microsoft-teams.svg', alt: 'Microsoft Teams' },
  { src: '/integrations/icons/notion.svg', alt: 'Notion' },
];

export function ConsoleAnimation() {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<ConsolePhase>(reduceMotion ? 'complete' : 'idle');
  const [typedPrompt, setTypedPrompt] = useState(reduceMotion ? consolePrompt : '');
  const [typedResponse, setTypedResponse] = useState(reduceMotion ? consoleResponse : '');

  useEffect(() => {
    if (reduceMotion) {
      setPhase('complete');
      setTypedPrompt(consolePrompt);
      setTypedResponse(consoleResponse);
      return;
    }

    let timers: ReturnType<typeof setTimeout>[] = [];
    let cancelled = false;
    const clear = () => { timers.forEach(clearTimeout); timers = []; };
    const run = () => {
      clear();
      setPhase('idle');
      setTypedPrompt('');
      setTypedResponse('');
      timers.push(setTimeout(() => setPhase('typing'), 850));
      consolePrompt.split('').forEach((_, index) => timers.push(setTimeout(() => setTypedPrompt(consolePrompt.slice(0, index + 1)), 1050 + index * 18)));
      const promptDone = 1050 + consolePrompt.length * 18;
      timers.push(setTimeout(() => setPhase('submitted'), promptDone + 180));
      timers.push(setTimeout(() => setPhase('thinking'), promptDone + 760));
      timers.push(setTimeout(() => setPhase('responding'), promptDone + 1750));
      consoleResponse.split('').forEach((_, index) => timers.push(setTimeout(() => setTypedResponse(consoleResponse.slice(0, index + 1)), promptDone + 1850 + index * 16)));
      const responseDone = promptDone + 1850 + consoleResponse.length * 16;
      timers.push(setTimeout(() => setPhase('complete'), responseDone + 100));
      timers.push(setTimeout(() => !cancelled && run(), responseDone + 3600));
    };
    run();
    return () => { cancelled = true; clear(); };
  }, [reduceMotion]);

  const conversationVisible = ['submitted', 'thinking', 'responding', 'complete'].includes(phase);

  return (
    <div className="absolute inset-0 flex min-h-0 flex-col overflow-hidden text-[#f7f7f7]" style={{ background: UI.page, fontFamily: "'Inter Tight', Inter, sans-serif" }}>
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-white/[0.06] px-3">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.09] bg-[#3a3a36] px-2.5 py-1 text-[8px] text-white/80"><span className="font-mono text-white/60">&gt;_</span>Aivory Console</div>
        <button className="rounded-lg border border-white/[0.12] px-2.5 py-1.5 text-[7px] text-white/75">New chat</button>
      </div>

      <div className="flex min-h-0 flex-1 justify-center px-4 py-3">
        <div className="flex min-h-0 w-full max-w-[430px] flex-col">
          <AnimatePresence initial={false}>
            {!conversationVisible && (
              <motion.div
                key="console-greeting"
                className="flex items-center justify-center gap-2.5"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0, marginBottom: 14, marginTop: 8 }}
                exit={{ opacity: 0, y: -6, height: 0, marginBottom: 0, marginTop: 0 }}
                transition={{ duration: 0.3 }}
              >
                <AivoryMark className="h-7 w-7" />
                <h4 className="text-[17px] font-light tracking-[-0.025em] text-white/[0.92]">what can i do for you?</h4>
              </motion.div>
            )}
          </AnimatePresence>

          {!conversationVisible && (
            <motion.div className="mb-2 flex flex-wrap justify-center gap-1.5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <UtilityPill icon={<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" /></svg>}>Attach Context</UtilityPill>
              <UtilityPill icon={<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><path d="M12 3v12M7 8l5-5 5 5" /></svg>}>Upload File</UtilityPill>
            </motion.div>
          )}

          <AnimatePresence>
            {conversationVisible && (
              <motion.div
                data-chat-surface="unframed"
                className="mb-2 min-h-0 flex-1 space-y-4 overflow-hidden px-1 py-2"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex justify-end">
                  <div className="max-w-[82%] rounded-[13px_13px_3px_13px] bg-[#292926] px-3 py-2 text-[7.5px] leading-relaxed text-white/80 shadow-[0_4px_14px_rgba(0,0,0,.12)]">{consolePrompt}</div>
                </div>
                <div className="flex items-start gap-2.5 px-1">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center"><AivoryMark className="h-3.5 w-3.5" /></div>
                  <div className="max-w-[84%] pt-0.5 text-[7.5px] leading-[1.55] text-white/75">
                    {phase === 'submitted' || phase === 'thinking' ? (
                      <span className="inline-flex items-center gap-1 py-0.5">
                        {[0, 1, 2].map((index) => <motion.span key={index} className="h-1 w-1 rounded-full bg-[#c7d3b5]" animate={{ opacity: [0.2, 1, 0.2], y: [0, -2, 0] }} transition={{ duration: 0.9, repeat: Infinity, delay: index * 0.14 }} />)}
                        <span className="ml-1 text-[6.5px] text-white/40">Reviewing operations</span>
                      </span>
                    ) : (
                      <span>{typedResponse}<span className={`ml-0.5 inline-block h-2 w-px bg-white/60 ${phase === 'responding' ? 'animate-pulse' : 'opacity-0'}`} /></span>
                    )}
                  </div>
                </div>
                {phase === 'complete' && (
                  <motion.div className="ml-7 flex gap-1.5" initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }}>
                    <span className="rounded-full border border-white/[0.08] px-2 py-1 text-[6px] text-white/45">View flagged items</span>
                    <span className="rounded-full border border-white/[0.08] px-2 py-1 text-[6px] text-white/45">Assign owners</span>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="w-full overflow-hidden rounded-[16px] border border-white/[0.09] bg-[#42423f] shadow-[0_14px_36px_rgba(0,0,0,.18)]">
            <div className="min-h-[43px] px-3.5 pb-1 pt-2.5 text-[8px] leading-relaxed">
              {!conversationVisible && typedPrompt ? <span className="text-white/78">{typedPrompt}{phase === 'typing' && <span className="ml-0.5 inline-block h-2.5 w-px animate-pulse bg-white/80" />}</span> : <span className="text-white/28">{conversationVisible ? 'Ask a follow-up…' : 'Send Message to Aivory...'}</span>}
            </div>
            <div className="flex items-center justify-between px-2.5 pb-2 pt-0.5">
              <button className="flex h-5 w-5 items-center justify-center rounded-full border border-white/[0.08] bg-[#353531] text-[12px] text-white/60">+</button>
              <motion.button className="flex h-5 w-5 items-center justify-center rounded-full bg-[#f7f7f7] text-[10px] text-[#353531]" animate={phase === 'typing' && typedPrompt.length > 12 ? { scale: [1, 1.08, 1] } : { scale: 1 }} transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 1.4 }}>↑</motion.button>
            </div>
            <div className="flex items-center justify-between border-t border-white/[0.06] px-3 py-1.5">
              <div className="flex items-center gap-1.5 text-[6px] text-white/30"><span>connect your tools to</span><img src="/Aivory%20logo%202026.svg" alt="Aivory" width={383} height={79} className="h-2.5 w-auto brightness-0 invert opacity-60" /></div>
              <div className="flex items-center gap-1">
                {connectedApps.map((app) => <span key={app.alt} className="flex h-5 w-5 items-center justify-center rounded-md border border-white/10 bg-white p-[3px]" title={app.alt}><img src={app.src} alt={app.alt} width={32} height={32} className="h-full w-full object-contain" /></span>)}
              </div>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap justify-center gap-1.5">
            {['Deep Diagnostic', 'Workflow', 'Agents'].map((chip, index) => <motion.span key={chip} className="rounded-full border border-white/[0.09] bg-[#3a3a36] px-2.5 py-1 text-[6px] text-white/55" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 + index * 0.08 }}>{chip}</motion.span>)}
          </div>
        </div>
      </div>
    </div>
  );
}
