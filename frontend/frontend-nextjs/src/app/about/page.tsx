import type { Metadata } from 'next';
import Link from 'next/link';
import { TechnicalFrameButton } from '@/components/ui/TechnicalFrameButton';
import Navbar from '@/components/home/Navbar';
import Footer from '@/components/Footer';
import {
  ASSESSMENT_STEPS,
  FAQ_ENTITIES,
  JsonLd,
  buildAboutPageGraph,
  createBreadcrumbList,
  absoluteUrl,
  siteUrlFromHeaders,
} from '@/lib/seo';

export const metadata: Metadata = {
  title: 'About Aivory and Founder Irfan Reichmann',
  description:
    'Learn about Aivory, founder Irfan Reichmann, and the operationally grounded approach behind governed AI business transformation.',
  alternates: {
    canonical: '/about',
    languages: { en: '/about', id: '/about' },
  },
  openGraph: {
    title: 'About Aivory and Founder Irfan Reichmann',
    description:
      'Practical AI adoption starts with operational clarity, governed systems, and an honest understanding of how organisations work.',
    url: '/about',
  },
};

const PROCESS_LABELS = [
  'Understand the operation',
  'Establish the baseline',
  'Design the system',
  'Sequence the change',
] as const;

const OPERATING_PRINCIPLES = [
  {
    number: '01',
    title: 'Clarity before technology',
    text: 'We begin with workflows, decisions, data, constraints, and people. Technology follows the operating reality—not the other way around.',
  },
  {
    number: '02',
    title: 'Governance by design',
    text: 'Controls, accountability, and human oversight are designed into the system from the start rather than added after deployment.',
  },
  {
    number: '03',
    title: 'Progress that can be measured',
    text: 'Every transformation should connect to an operational outcome: less friction, better decisions, stronger resilience, or measurable capacity.',
  },
] as const;

/**
 * Keeps the first 64px dark so the transparent, white-text Navbar stays
 * legible, then hands over to the ivory editorial canvas shared with Careers,
 * Company and Product.
 */
const ABOUT_HERO_BACKGROUND =
  'linear-gradient(to bottom, #050505 0, #050505 64px, #efeee8 64px, #efeee8 100%)';

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.5">
      <path d="M17 7v10H7" />
      <path d="M7 7l10 10" />
    </svg>
  );
}

function ArchitecturalSignal() {
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

export default function AboutPage() {
  const siteUrl = siteUrlFromHeaders();

  return (
    <main
      className="min-h-screen overflow-hidden bg-[#030408] font-manrope text-white selection:bg-white selection:text-black"
      data-about-layout="editorial"
    >
      <JsonLd data={buildAboutPageGraph(siteUrl)} />
      <JsonLd
        data={createBreadcrumbList([
          { name: 'Home', item: absoluteUrl('/') },
          { name: 'About', item: absoluteUrl('/about') },
        ])}
      />
      <Navbar />

      <section
        className="text-[#11110f]"
        style={{ fontWeight: 300, background: ABOUT_HERO_BACKGROUND }}
      >
        <div className="mx-auto max-w-[1480px] px-6 pb-16 pt-40 md:px-12 md:pb-24 md:pt-52">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/60">About Aivory / 01</p>
          <h1 className="mt-5 max-w-[1180px] text-[52px] font-light leading-[0.95] tracking-[-0.055em] text-[#11110f] md:text-[82px] lg:text-[104px]">
            Clarity first.<br />Intelligence follows.
          </h1>
        </div>

        <div className="mx-auto max-w-[1480px] px-6 pb-20 md:px-12 md:pb-28">
          <div className="grid border-t border-black/25 pt-8 lg:grid-cols-12 lg:gap-12">
            <div className="pb-8 lg:col-span-4 lg:pb-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/60">What we do</p>
            </div>
            <div className="lg:col-span-8">
              <p className="max-w-2xl text-[16px] font-light leading-[1.7] text-black/70 md:text-[17px]">
                Aivory helps organisations understand how work actually moves, design the right transformation architecture, and deploy governed AI systems without false starts.
              </p>
              <div className="mt-10 flex flex-wrap gap-x-10 gap-y-5">
                <Link
                  href="/free-diagnostic"
                  className="inline-flex items-center gap-3 border-b border-black pb-1 text-[13px] font-light text-black transition-opacity hover:opacity-55"
                >
                  Start assessment
                  <ArrowIcon />
                </Link>
                <Link
                  href="/company"
                  className="inline-flex items-center gap-3 border-b border-black pb-1 text-[13px] font-light text-black transition-opacity hover:opacity-55"
                >
                  Company overview
                  <ArrowIcon />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ArchitecturalSignal />

      <section className="border-b border-white/10 px-6 py-20 md:px-12 md:py-28 lg:px-24">
        <div className="mx-auto grid max-w-[1400px] gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/42">Why we&apos;re here / 02</p>
            <h2 className="mt-5 max-w-sm text-3xl font-light leading-[1.15] tracking-[-0.025em] md:text-[40px]">
              AI should begin with the business—not the tool.
            </h2>
          </div>

          <div className="space-y-8 lg:col-span-7 lg:col-start-6">
            <p className="text-xl font-light leading-[1.55] tracking-[-0.015em] text-white/88 md:text-2xl">
              Most organisations are under pressure to adopt AI before they have a clear view of their own operations. The result is often fragmented tooling, unclear ownership, and automation without a system behind it.
            </p>
            <div className="grid gap-7 border-t border-white/10 pt-8 text-[15px] font-light leading-7 text-white/58 md:grid-cols-2">
              <p>
                Aivory was created to reverse that sequence. We establish the operational baseline first: how decisions are made, where work slows down, which data can be trusted, and where change can create measurable value.
              </p>
              <p>
                That clarity becomes the foundation for transformation blueprints, intelligent workflows, governed agents, and resilient operating systems designed around the organisation itself.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 px-6 py-20 md:px-12 md:py-28 lg:px-24">
        <div className="mx-auto max-w-[1400px]">
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/42">Founder / 03</p>
              <div className="mt-10 border-t border-white/10 pt-6" data-founder-profile="linkedin-only">
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/40">Founder &amp; CEO</p>
                <h2 className="mt-3 text-3xl font-light tracking-[-0.025em]">Irfan Reichmann</h2>
                <a
                  href="https://www.linkedin.com/in/irfan-reichmann/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-7 inline-flex items-center gap-3 border-b border-white/30 pb-1 text-sm text-white/70 transition-colors hover:border-white hover:text-white"
                >
                  LinkedIn profile <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>

            <div className="lg:col-span-7 lg:col-start-6">
              <blockquote className="max-w-4xl text-3xl font-light leading-[1.3] tracking-[-0.025em] text-white/92 md:text-[44px]">
                “Practical AI adoption starts with operational clarity—not with another disconnected tool.”
              </blockquote>
              <div className="mt-10 grid gap-7 border-t border-white/10 pt-8 text-[15px] font-light leading-7 text-white/58 md:grid-cols-2">
                <p>
                  Irfan Reichmann founded Aivory to make business transformation structured, measurable, and governed from the outset.
                </p>
                <p>
                  Aivory is a business transformation and AI operations platform, distinct from other companies that use a similar name in unrelated categories.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-b border-white/10 px-6 py-20 md:px-12 md:py-28 lg:px-24">
        <div className="mx-auto max-w-[1400px]">
          <div className="grid gap-10 pb-14 lg:grid-cols-12 lg:pb-20">
            <div className="lg:col-span-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/42">What we do / 04</p>
            </div>
            <div className="lg:col-span-7 lg:col-start-6">
              <h2 className="text-3xl font-light leading-[1.15] tracking-[-0.025em] md:text-[44px]">
                From operational reality to governed execution.
              </h2>
              <p className="mt-6 max-w-2xl text-[15px] font-light leading-7 text-white/55">
                A structured path turns business constraints into an implementation-ready transformation architecture.
              </p>
            </div>
          </div>

          <ol className="border-b border-white/10">
            {ASSESSMENT_STEPS.map((step, index) => (
              <li
                key={step.name}
                className="group grid gap-5 border-t border-white/10 py-8 transition-colors hover:bg-white/[0.018] md:py-10 lg:grid-cols-12"
              >
                <span className="font-mono text-[10px] text-white/35 lg:col-span-1">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="text-xl font-light tracking-[-0.015em] text-white/90 md:text-2xl lg:col-span-3">
                  {step.name}
                </h3>
                <p className="max-w-2xl text-sm font-light leading-7 text-white/52 lg:col-span-5 lg:col-start-6">
                  {step.text}
                </p>
                <p className="self-start text-[10px] uppercase tracking-[0.14em] text-white/32 lg:col-span-2 lg:text-right">
                  {PROCESS_LABELS[index]}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-b border-white/10 px-6 py-20 md:px-12 md:py-28 lg:px-24">
        <div className="mx-auto max-w-[1400px]">
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/42">Where we&apos;re going / 05</p>
              <h2 className="mt-5 max-w-md text-3xl font-light leading-[1.15] tracking-[-0.025em] md:text-[40px]">
                Towards operations that can understand, adapt, and improve.
              </h2>
            </div>
            <div className="lg:col-span-7 lg:col-start-6">
              <p className="text-xl font-light leading-[1.55] text-white/82 md:text-2xl">
                The goal is not automation for its own sake. It is an organisation with a clearer operating model, better institutional memory, and governed intelligence that compounds over time.
              </p>
            </div>
          </div>

          <div className="mt-16 grid border-y border-white/10 md:grid-cols-3">
            {OPERATING_PRINCIPLES.map((principle, index) => (
              <div
                key={principle.number}
                className={`py-8 md:min-h-[260px] md:px-8 md:py-10 ${index > 0 ? 'border-t border-white/10 md:border-l md:border-t-0' : ''}`}
              >
                <span className="font-mono text-[10px] text-white/32">{principle.number}</span>
                <h3 className="mt-12 text-xl font-light tracking-[-0.015em]">{principle.title}</h3>
                <p className="mt-4 text-sm font-light leading-7 text-white/50">{principle.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="frequently-asked-questions" className="border-b border-white/10 px-6 py-20 md:px-12 md:py-28 lg:px-24">
        <div className="mx-auto grid max-w-[1400px] gap-14 lg:grid-cols-12">
          <div className="lg:col-span-4 lg:sticky lg:top-28 lg:self-start">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/42">Questions / 06</p>
            <h2 className="mt-5 max-w-sm text-3xl font-light leading-[1.15] tracking-[-0.025em] md:text-[40px]">
              Clear answers about Aivory.
            </h2>
          </div>

          <div className="border-b border-white/10 lg:col-span-7 lg:col-start-6">
            {FAQ_ENTITIES.map((entry, index) => (
              <details key={entry.question} className="group border-t border-white/10" open={index === 0}>
                <summary className="flex cursor-pointer list-none items-start gap-5 py-6 marker:content-none md:py-7">
                  <span className="pt-1 font-mono text-[9px] text-white/28">{String(index + 1).padStart(2, '0')}</span>
                  <span className="flex-1 text-base font-light leading-7 text-white/85 md:text-lg">{entry.question}</span>
                  <span className="text-xl font-light text-white/35 transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="max-w-3xl pb-7 pl-9 text-sm font-light leading-7 text-white/52 md:pb-9">{entry.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 md:px-12 md:py-28 lg:px-24" data-about-cta="square">
        <div className="mx-auto grid max-w-[1400px] gap-10 border-y border-white/15 py-12 md:py-16 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/42">Start with clarity / 07</p>
            <h2 className="mt-5 max-w-3xl text-3xl font-light leading-[1.15] tracking-[-0.025em] md:text-[44px]">
              Make AI make sense for your operations.
            </h2>
          </div>
          <div className="flex flex-wrap gap-3 lg:col-span-5 lg:justify-end">
            <TechnicalFrameButton href="/free-diagnostic">
              <ArrowIcon /> Start assessment
            </TechnicalFrameButton>
            <TechnicalFrameButton href="/contact">
              Talk to us
            </TechnicalFrameButton>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
