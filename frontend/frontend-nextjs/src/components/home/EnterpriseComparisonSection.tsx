'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { SpotlightButton } from '@/components/ui/SpotlightButton';

type Status = 'yes' | 'no' | 'warn';

interface ComparisonRow {
  capability: string;
  aiChat: Status;
  consulting: Status;
  automation: Status;
  aivory: Status;
}

const ROWS: ComparisonRow[] = [
  { capability: 'Business Understanding', aiChat: 'no', consulting: 'yes', automation: 'warn', aivory: 'yes' },
  { capability: 'AI Deployment', aiChat: 'warn', consulting: 'no', automation: 'yes', aivory: 'yes' },
  { capability: 'Workflow Design', aiChat: 'no', consulting: 'yes', automation: 'warn', aivory: 'yes' },
  { capability: 'Continuous Platform', aiChat: 'no', consulting: 'no', automation: 'yes', aivory: 'yes' },
  { capability: 'Executive Visibility', aiChat: 'no', consulting: 'warn', automation: 'warn', aivory: 'yes' },
];

const COLUMNS: { key: keyof Omit<ComparisonRow, 'capability'>; label: string }[] = [
  { key: 'aiChat', label: 'AI Chat' },
  { key: 'consulting', label: 'Consulting' },
  { key: 'automation', label: 'Automation' },
  { key: 'aivory', label: 'Aivory' },
];

const STATUS_PATH: Record<Status, string> = {
  yes: 'M5 13l4 4L19 7',
  warn: 'M12 9v3.75m0 3.75h.008M10.29 3.86l-8.18 14.18A1.5 1.5 0 003.42 20.4h17.16a1.5 1.5 0 001.31-2.36L13.71 3.86a1.5 1.5 0 00-2.42 0z',
  no: 'M6 18L18 6M6 6l12 12',
};

function StatusIcon({ status, highlight = false }: { status: Status; highlight?: boolean }) {
  const badge =
    highlight && status === 'yes'
      ? { bg: 'bg-emerald-400/[0.16]', border: 'border-emerald-400/30', icon: 'text-emerald-300' }
      : status === 'yes'
        ? { bg: 'bg-white/[0.06]', border: 'border-white/[0.1]', icon: 'text-white/70' }
        : status === 'warn'
          ? { bg: 'bg-amber-400/[0.1]', border: 'border-amber-400/20', icon: 'text-amber-300/80' }
          : { bg: 'bg-white/[0.04]', border: 'border-white/[0.06]', icon: 'text-white/25' };

  return (
    <span
      className={`flex items-center justify-center w-6 h-6 rounded-[7px] border ${badge.bg} ${badge.border}`}
    >
      <svg className={`w-3.5 h-3.5 ${badge.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={STATUS_PATH[status]} />
      </svg>
    </span>
  );
}

export default function EnterpriseComparisonSection() {
  const reduceMotion = useReducedMotion();

  // Opacity-only entrance (no translateY): the Aivory column's highlight lane is a
  // per-row background that must stay pixel-aligned with the badge above/below it at
  // every instant of the stagger, not just at rest. A translateY offset made rows
  // settle at slightly different times, so the lane visibly seamed between rows
  // mid-animation even though it was perfectly aligned once everything came to rest.
  const rowVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: reduceMotion ? 0 : 0.4, ease: [0.23, 1, 0.32, 1] as const },
    },
  };

  return (
    <section className="w-full py-16 md:py-24 px-6 relative">
      <div className="max-w-4xl mx-auto text-center mb-12">
        <SpotlightButton
          className="mb-6 pointer-events-auto hover:-translate-y-0 inline-flex"
          style={{
            borderWidth: '0.5px',
            borderStyle: 'solid',
            borderColor: 'rgba(255,255,255,0.1)',
            cursor: 'default',
          }}
          icon={false}
        >
          COMPETITIVE LANDSCAPE
        </SpotlightButton>
        <h3
          className="text-[26px] sm:text-[28px] md:text-[28px] lg:text-[32px] font-light tracking-tight"
          style={{ fontFamily: "var(--font-manrope), 'Manrope', sans-serif", fontWeight: 300 }}
        >
          Why Enterprise Choose <span style={{ color: '#e4effd' }}>Aivory.</span>
        </h3>
      </div>

      <motion.div
        className="max-w-4xl mx-auto rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.03] to-white/[0.015] shadow-[0_8px_30px_rgba(0,0,0,0.25)] overflow-hidden"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        variants={{ visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.08 } } }}
      >
        {/* Header row */}
        <div className="grid grid-cols-[1.4fr_repeat(4,0.8fr)] md:grid-cols-[1.6fr_repeat(4,0.85fr)] px-4 md:px-8 py-4 border-b border-white/[0.08]">
          <span className="text-[11px] uppercase tracking-wider text-white/40 font-light">Capabilities</span>
          {COLUMNS.map((col) =>
            col.key === 'aivory' ? (
              <span key={col.key} className="relative flex items-center justify-center">
                <span className="pointer-events-none absolute -inset-y-4 left-0 right-[-1rem] md:right-[-2rem] bg-gradient-to-b from-[#e4effd]/[0.09] to-[#e4effd]/[0.03] rounded-tr-2xl" />
                <img
                  src="/aivory-logo.svg"
                  alt="Aivory"
                  width={383}
                  height={79}
                  className="relative h-3 w-auto object-contain brightness-0 invert opacity-90"
                />
              </span>
            ) : (
              <span
                key={col.key}
                className="text-[11px] uppercase tracking-wider font-light text-center text-white/40"
              >
                {col.label}
              </span>
            )
          )}
        </div>

        {ROWS.map((row, i) => {
          const isLast = i === ROWS.length - 1;
          return (
            <motion.div
              key={row.capability}
              variants={rowVariants}
              className={`grid grid-cols-[1.4fr_repeat(4,0.8fr)] md:grid-cols-[1.6fr_repeat(4,0.85fr)] items-center px-4 md:px-8 py-4 ${
                !isLast ? 'border-b border-white/[0.06]' : ''
              }`}
            >
              <span className="text-[13px] md:text-sm text-white/80 font-light text-left">{row.capability}</span>
              {COLUMNS.map((col) => (
                <span key={col.key} className="relative flex items-center justify-center">
                  {col.key === 'aivory' && (
                    <span
                      className={`pointer-events-none absolute -inset-y-4 left-0 right-[-1rem] md:right-[-2rem] bg-[#e4effd]/[0.05] ${
                        isLast ? 'rounded-br-2xl' : ''
                      }`}
                    />
                  )}
                  <span className="relative">
                    <StatusIcon status={row[col.key]} highlight={col.key === 'aivory'} />
                  </span>
                </span>
              ))}
            </motion.div>
          );
        })}
      </motion.div>

      <p className="text-center text-white/40 text-sm font-light mt-8 max-w-xl mx-auto">
        Understand deeply.<br />
        Scale intelligently.
      </p>
    </section>
  );
}
