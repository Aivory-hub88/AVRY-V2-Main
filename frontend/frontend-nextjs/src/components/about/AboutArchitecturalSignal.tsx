export function AboutArchitecturalSignal() {
  const stages = [
    { number: '01', title: 'Observe', detail: 'Signals become context' },
    { number: '02', title: 'Design', detail: 'Context becomes a system' },
    { number: '03', title: 'Govern', detail: 'The system stays accountable' },
  ] as const;

  const sources = [
    { label: 'ERP', y: 112 },
    { label: 'CRM', y: 168 },
    { label: 'OPS', y: 272 },
    { label: 'DATA', y: 328 },
  ] as const;

  const controls = [
    { label: 'Human review', x: 872, labelY: 120 },
    { label: 'Data boundary', x: 946, labelY: 326 },
    { label: 'Audit trail', x: 1020, labelY: 120 },
    { label: 'Model limit', x: 1094, labelY: 326 },
  ] as const;

  return (
    <div
      className="relative overflow-hidden border-y border-white/10 bg-[#05060a]"
      data-about-pattern="operational-architecture"
      aria-hidden="true"
    >
      <style>{`
        @keyframes about-architecture-flow {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -180; }
        }
        @keyframes about-architecture-orbit {
          to { transform: rotate(360deg); }
        }
        @keyframes about-architecture-counter-orbit {
          to { transform: rotate(-360deg); }
        }
        @keyframes about-architecture-scan {
          0%, 12% { transform: translate3d(0, 0, 0); opacity: 0; }
          24%, 72% { opacity: 0.72; }
          88%, 100% { transform: translate3d(382px, 0, 0); opacity: 0; }
        }
        @keyframes about-architecture-node {
          0%, 100% { opacity: 0.36; transform: scale(0.82); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes about-architecture-gate {
          0%, 100% { opacity: 0.42; }
          50% { opacity: 0.95; }
        }
        @keyframes about-architecture-glow {
          0%, 100% { opacity: 0.38; }
          50% { opacity: 1; }
        }
        @keyframes about-architecture-mobile-flow {
          0% { transform: translate3d(0, 0, 0); opacity: 0; }
          12%, 82% { opacity: 1; }
          100% { transform: translate3d(0, 292px, 0); opacity: 0; }
        }
        .about-architecture-flow {
          animation: about-architecture-flow 8s linear infinite;
          stroke-dasharray: 14 16;
        }
        .about-architecture-orbit,
        .about-architecture-counter-orbit {
          transform-box: view-box;
          transform-origin: 252px 220px;
        }
        .about-architecture-orbit { animation: about-architecture-orbit 26s linear infinite; }
        .about-architecture-counter-orbit { animation: about-architecture-counter-orbit 18s linear infinite; }
        .about-architecture-scan {
          animation: about-architecture-scan 9s cubic-bezier(0.45, 0, 0.55, 1) infinite;
          transform-box: fill-box;
        }
        .about-architecture-node {
          animation: about-architecture-node 3.2s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        .about-architecture-gate { animation: about-architecture-gate 4.4s ease-in-out infinite; }
        .about-architecture-glow { animation: about-architecture-glow 4s ease-in-out infinite; }
        .about-architecture-mobile-signal {
          animation: about-architecture-mobile-flow 7s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .about-architecture-flow,
          .about-architecture-orbit,
          .about-architecture-counter-orbit,
          .about-architecture-scan,
          .about-architecture-node,
          .about-architecture-gate,
          .about-architecture-glow,
          .about-architecture-mobile-signal { animation: none !important; }
          .about-architecture-particle,
          .about-architecture-mobile-signal { display: none; }
        }
      `}</style>

      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 font-mono text-[8px] uppercase tracking-[0.22em] text-white/42 sm:px-6 sm:text-[9px]">
        <span>Operational architecture / live system</span>
        <span className="flex items-center gap-2">
          <span className="about-architecture-glow h-1.5 w-1.5 rounded-full bg-[#aeb6ff]" />
          Signal cycle 01
        </span>
      </div>

      <div className="relative hidden border-b border-white/10 px-6 sm:grid sm:grid-cols-3 sm:px-8">
        <div className="absolute left-[9%] right-[9%] top-[31px] h-px bg-gradient-to-r from-white/5 via-[#aeb6ff]/45 to-white/5" />
        {stages.map((stage) => (
          <div key={stage.title} className="relative z-10 min-w-0 py-5">
            <div className="flex items-center gap-3">
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[#aeb6ff]/45 bg-[#080910] font-mono text-[8px] text-[#cbd0ff]">
                {stage.number}
              </span>
              <span className="bg-[#05060a] pr-3 text-[11px] uppercase tracking-[0.16em] text-white/82">{stage.title}</span>
            </div>
            <p className="mt-2 pl-8 text-[10px] font-light tracking-[0.04em] text-white/42">{stage.detail}</p>
          </div>
        ))}
      </div>

      <div className="relative px-5 py-6 sm:hidden">
        <div className="absolute bottom-8 left-[31px] top-8 w-px bg-gradient-to-b from-[#aeb6ff]/15 via-[#aeb6ff]/70 to-[#c4d3c7]/35" />
        <span className="about-architecture-mobile-signal absolute left-[28px] top-9 h-1.5 w-1.5 rounded-full bg-[#dfe2ff] shadow-[0_0_12px_rgba(174,182,255,0.9)]" />

        <div className="relative pl-9">
          <div className="absolute -left-[2px] top-1 h-2 w-2 rounded-full border border-[#aeb6ff]/70 bg-[#05060a]" />
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-[8px] tracking-[0.18em] text-[#aeb6ff]/75">01</span>
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/85">Observe</p>
          </div>
          <p className="mt-1 text-[10px] text-white/38">Signals become context</p>
          <div className="mt-4 flex items-center gap-2 font-mono text-[8px] tracking-[0.12em] text-white/48">
            {sources.map((source) => (
              <span key={source.label} className="border-b border-white/15 pb-1">{source.label}</span>
            ))}
            <span className="text-[#aeb6ff]/65">→</span>
            <span className="text-[#dfe2ff]/85">CONTEXT LOCK</span>
          </div>
        </div>

        <div className="relative mt-8 pl-9">
          <div className="absolute -left-[2px] top-1 h-2 w-2 rounded-full border border-[#aeb6ff]/70 bg-[#05060a]" />
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-[8px] tracking-[0.18em] text-[#aeb6ff]/75">02</span>
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/85">Design</p>
          </div>
          <p className="mt-1 text-[10px] text-white/38">Context becomes a system</p>
          <div className="mt-4 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 font-mono text-[8px] tracking-[0.08em] text-white/56">
            <span>CONTEXT</span><span className="text-[#aeb6ff]/60">→</span>
            <span className="text-center text-white/82">DECISION</span><span className="text-[#aeb6ff]/60">→</span>
            <span className="text-right">ACTION</span>
          </div>
        </div>

        <div className="relative mt-8 pl-9">
          <div className="absolute -left-[2px] top-1 h-2 w-2 rounded-full border border-[#c4d3c7]/70 bg-[#05060a]" />
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-[8px] tracking-[0.18em] text-[#c4d3c7]/75">03</span>
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/85">Govern</p>
          </div>
          <p className="mt-1 text-[10px] text-white/38">The system stays accountable</p>
          <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 font-mono text-[8px] uppercase tracking-[0.08em] text-white/52">
            {controls.map((control, index) => (
              <span key={control.label} className="flex items-center gap-2">
                <span className="about-architecture-node h-1 w-1 rounded-full bg-[#c4d3c7]" style={{ animationDelay: `${index * 0.45}s` }} />
                {control.label}
              </span>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-[#c4d3c7]/20 pt-3 font-mono text-[8px] uppercase tracking-[0.15em]">
            <span className="text-[#c4d3c7]/85">4/4 enforced</span>
            <span className="text-white/38">Release approved</span>
          </div>
        </div>
      </div>

      <div className="relative hidden h-[360px] overflow-hidden sm:block md:h-[420px] xl:h-[460px]">
        <svg
          viewBox="0 0 1200 440"
          fill="none"
          className="absolute inset-0 h-full w-full text-white"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <pattern id="about-blueprint-grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M30 0H0V30" stroke="currentColor" strokeWidth="0.4" opacity="0.065" />
            </pattern>
            <linearGradient id="about-signal-gradient" x1="50" y1="0" x2="1160" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.28" />
              <stop offset="0.38" stopColor="#aeb6ff" stopOpacity="0.95" />
              <stop offset="0.68" stopColor="#dfe2ff" stopOpacity="0.9" />
              <stop offset="1" stopColor="#c4d3c7" stopOpacity="0.72" />
            </linearGradient>
            <filter id="about-signal-bloom" x="-300%" y="-300%" width="700%" height="700%">
              <feGaussianBlur stdDeviation="3.8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect width="1200" height="440" fill="url(#about-blueprint-grid)" />
          <path d="M28 52H1172M28 388H1172" stroke="currentColor" strokeWidth="0.5" opacity="0.12" />

          <g fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="9" letterSpacing="1.4" fill="currentColor">
            <text x="48" y="76" opacity="0.42">SOURCE SIGNALS</text>
            <text x="390" y="76" opacity="0.42">OPERATING MODEL</text>
            <text x="838" y="76" opacity="0.42">GOVERNANCE GATES</text>
          </g>

          <g>
            {sources.map((source, index) => (
              <g key={source.label}>
                <text
                  x="48"
                  y={source.y - 9}
                  fill="currentColor"
                  opacity="0.5"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                  fontSize="9"
                  letterSpacing="1.1"
                >
                  {source.label}
                </text>
                <path
                  d={`M48 ${source.y}H132C174 ${source.y} 190 220 220 220`}
                  stroke="currentColor"
                  strokeWidth="0.7"
                  opacity="0.24"
                />
                <circle
                  className="about-architecture-node"
                  cx="132"
                  cy={source.y}
                  r="2.4"
                  fill="#aeb6ff"
                  style={{ animationDelay: `${index * 0.48}s` }}
                />
              </g>
            ))}

            <path d="M252 130V310M162 220H342" stroke="currentColor" strokeWidth="0.5" opacity="0.13" />
            <circle cx="252" cy="220" r="68" stroke="currentColor" strokeWidth="0.55" opacity="0.2" />
            <circle cx="252" cy="220" r="44" stroke="currentColor" strokeWidth="0.65" opacity="0.3" />
            <circle cx="252" cy="220" r="16" stroke="#aeb6ff" strokeWidth="0.8" opacity="0.55" />
            <g className="about-architecture-orbit">
              <circle cx="252" cy="220" r="82" stroke="#aeb6ff" strokeWidth="0.9" strokeDasharray="34 22 5 18" opacity="0.55" />
              <circle cx="252" cy="138" r="2.8" fill="#aeb6ff" />
            </g>
            <g className="about-architecture-counter-orbit">
              <circle cx="252" cy="220" r="55" stroke="currentColor" strokeWidth="0.6" strokeDasharray="8 15" opacity="0.32" />
            </g>
            <circle className="about-architecture-glow" cx="252" cy="220" r="5" fill="#dfe2ff" filter="url(#about-signal-bloom)" />
            <path d="M252 288V306" stroke="#aeb6ff" strokeWidth="0.7" opacity="0.48" />
            <rect x="205" y="306" width="94" height="25" rx="2" fill="#080910" stroke="#aeb6ff" strokeWidth="0.65" opacity="0.85" />
            <text x="252" y="322" textAnchor="middle" fill="#dfe2ff" opacity="0.76" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="8.5" letterSpacing="1">CONTEXT LOCK</text>
          </g>

          <g>
            <path d="M350 186V254" stroke="currentColor" strokeWidth="0.55" opacity="0.26" />
            <circle cx="350" cy="220" r="7" fill="#05060a" stroke="#aeb6ff" strokeWidth="0.9" opacity="0.82" />
            <circle className="about-architecture-node" cx="350" cy="220" r="2.5" fill="#dfe2ff" />
            <text x="350" y="174" textAnchor="middle" fill="currentColor" opacity="0.46" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="8" letterSpacing="1">HANDOFF A</text>

            <g fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="9" letterSpacing="1" fill="currentColor">
              <text x="426" y="116" textAnchor="middle" opacity="0.5">CONTEXT MODEL</text>
              <text x="590" y="116" textAnchor="middle" opacity="0.62">DECISION LOGIC</text>
              <text x="752" y="116" textAnchor="middle" opacity="0.5">ACTION PLAN</text>
            </g>

            <path d="M390 160V280M390 160H404M390 280H404M462 160H448M462 280H448" stroke="currentColor" strokeWidth="0.6" opacity="0.28" />
            {[0, 1, 2, 3].map((row) => (
              <g key={row}>
                <path d={`M407 ${181 + row * 26}H445`} stroke="currentColor" strokeWidth="0.7" opacity="0.34" />
                <circle
                  className="about-architecture-node"
                  cx="426"
                  cy={181 + row * 26}
                  r="2.2"
                  fill={row === 2 ? '#aeb6ff' : 'currentColor'}
                  style={{ animationDelay: `${row * 0.42}s` }}
                />
              </g>
            ))}
            <path d="M426 181V259" stroke="currentColor" strokeWidth="0.45" opacity="0.18" />

            <circle cx="590" cy="220" r="72" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 8" opacity="0.2" />
            <path d="M590 153L648 186V254L590 287L532 254V186Z" stroke="#aeb6ff" strokeWidth="0.9" opacity="0.58" />
            <path d="M590 170L633 195V245L590 270L547 245V195Z" stroke="currentColor" strokeWidth="0.55" opacity="0.24" />
            <path d="M548 195L633 245M633 195L548 245M590 153V287" stroke="currentColor" strokeWidth="0.45" opacity="0.16" />
            {[[590, 153], [648, 186], [648, 254], [590, 287], [532, 254], [532, 186]].map(([cx, cy], index) => (
              <circle
                key={`${cx}-${cy}`}
                className="about-architecture-node"
                cx={cx}
                cy={cy}
                r="2.5"
                fill={index === 0 || index === 3 ? '#aeb6ff' : 'currentColor'}
                style={{ animationDelay: `${index * 0.34}s` }}
              />
            ))}
            <circle className="about-architecture-glow" cx="590" cy="220" r="5" fill="#dfe2ff" filter="url(#about-signal-bloom)" />
            <text x="590" y="315" textAnchor="middle" fill="currentColor" opacity="0.38" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="8" letterSpacing="1">POLICY + OUTCOME + OWNER</text>

            <path d="M694 220H714M714 220L756 174H790M714 220H790M714 220L756 266H790M790 174L810 220L790 266" stroke="currentColor" strokeWidth="0.65" opacity="0.28" />
            {[174, 220, 266].map((cy, index) => (
              <g key={cy}>
                <circle
                  className="about-architecture-node"
                  cx="770"
                  cy={cy}
                  r="2.5"
                  fill={index === 1 ? '#aeb6ff' : 'currentColor'}
                  style={{ animationDelay: `${index * 0.52}s` }}
                />
                <path d={`M758 ${cy}H786`} stroke="#aeb6ff" strokeWidth="0.8" opacity={index === 1 ? 0.68 : 0.34} />
              </g>
            ))}

            <g className="about-architecture-scan">
              <line x1="394" y1="136" x2="394" y2="304" stroke="#aeb6ff" strokeWidth="0.8" opacity="0.68" />
              <rect x="394" y="136" width="22" height="168" fill="#aeb6ff" opacity="0.025" />
            </g>

            <path d="M820 186V254" stroke="currentColor" strokeWidth="0.55" opacity="0.26" />
            <circle cx="820" cy="220" r="7" fill="#05060a" stroke="#aeb6ff" strokeWidth="0.9" opacity="0.82" />
            <circle className="about-architecture-node" cx="820" cy="220" r="2.5" fill="#dfe2ff" style={{ animationDelay: '0.8s' }} />
            <text x="820" y="174" textAnchor="middle" fill="currentColor" opacity="0.46" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="8" letterSpacing="1">HANDOFF B</text>
          </g>

          <g>
            {controls.map((control, index) => {
              const labelAbove = index % 2 === 0;
              return (
                <g key={control.label} className="about-architecture-gate" style={{ animationDelay: `${index * 0.55}s` }}>
                  <path d={`M${control.x} 154V286`} stroke="currentColor" strokeWidth="0.55" opacity="0.23" />
                  <path d={`M${control.x} 190V250`} stroke="#c4d3c7" strokeWidth="1.15" opacity="0.76" />
                  <path d={`M${control.x - 10} 204H${control.x + 10}V236H${control.x - 10}Z`} fill="#05060a" stroke="#c4d3c7" strokeWidth="0.8" opacity="0.88" />
                  <circle cx={control.x} cy="220" r="3" fill="#dce8de" filter="url(#about-signal-bloom)" />
                  <path
                    d={labelAbove ? `M${control.x} 154V136` : `M${control.x} 286V304`}
                    stroke="currentColor"
                    strokeWidth="0.5"
                    opacity="0.28"
                  />
                  <text
                    x={control.x}
                    y={control.labelY}
                    textAnchor="middle"
                    fill="currentColor"
                    opacity="0.62"
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                    fontSize="8.2"
                    letterSpacing="0.7"
                  >
                    {control.label.toUpperCase()}
                  </text>
                  <text
                    x={control.x}
                    y={labelAbove ? 148 : 298}
                    textAnchor="middle"
                    fill="#c4d3c7"
                    opacity="0.62"
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                    fontSize="7"
                    letterSpacing="0.8"
                  >
                    PASS
                  </text>
                </g>
              );
            })}

            <path d="M1148 134V207" stroke="#c4d3c7" strokeWidth="0.7" opacity="0.45" />
            <circle cx="1148" cy="220" r="11" fill="#05060a" stroke="#c4d3c7" strokeWidth="1" opacity="0.9" />
            <circle className="about-architecture-glow" cx="1148" cy="220" r="4" fill="#dce8de" filter="url(#about-signal-bloom)" />
            <text x="1160" y="104" textAnchor="end" fill="#c4d3c7" opacity="0.85" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="9" letterSpacing="1.1">4/4 ENFORCED</text>
            <text x="1160" y="120" textAnchor="end" fill="currentColor" opacity="0.42" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="8" letterSpacing="0.9">RELEASE APPROVED</text>
          </g>

          <path d="M50 220H1160" stroke="currentColor" strokeWidth="7" opacity="0.055" />
          <path d="M50 220H1160" stroke="url(#about-signal-gradient)" strokeWidth="1.8" opacity="0.88" />
          <path className="about-architecture-flow" d="M50 220H1160" stroke="#f4f5ff" strokeWidth="0.9" opacity="0.72" />

          <circle className="about-architecture-particle" r="3.4" fill="#f4f5ff" filter="url(#about-signal-bloom)">
            <animateMotion dur="9s" repeatCount="indefinite" path="M50 220H1160" />
          </circle>
          <circle className="about-architecture-particle" r="2.2" fill="#aeb6ff" opacity="0.8">
            <animateMotion dur="9s" begin="-4.5s" repeatCount="indefinite" path="M50 220H1160" />
          </circle>
        </svg>
      </div>
    </div>
  );
}
