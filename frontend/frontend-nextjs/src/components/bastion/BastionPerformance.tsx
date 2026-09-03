'use client';

import { FadeUp, FadeUpChild } from './FadeUp';

const heroMetrics = [
  { value: '10M+', label: 'signals/sec' },
  { value: '< 100ms', label: 'detection latency' },
  { value: '97.5%+', label: 'detection rate' },
  { value: '≤ 0.8%', label: 'false positive' },
  { value: '99.99%', label: 'uptime' },
];

const categoryMetrics = [
  {
    title: 'Speed',
    items: [
      { label: 'Telemetry Throughput', value: '8–12 million signals/sec' },
      { label: 'Detection Latency', value: '< 100 ms' },
      { label: 'Classification Latency', value: '< 250 ms' },
      { label: 'Full Response Time', value: '< 2 seconds' },
    ],
  },
  {
    title: 'Accuracy',
    items: [
      { label: 'Detection Rate (True Positive)', value: '97.5%+' },
      { label: 'False Positive Rate', value: '≤ 0.8%' },
      { label: 'Zero-day / Novel Threat Detection', value: '90%+' },
    ],
  },
  {
    title: 'Scale & Resilience',
    items: [
      { label: 'Concurrent Sources Supported', value: '50,000+' },
      { label: 'System Uptime', value: '99.99%' },
      { label: 'Policy Propagation Time', value: '< 15 seconds' },
    ],
  },
  {
    title: 'Learning & Adaptation',
    items: [
      { label: 'Intelligence Update Cycle', value: 'Continuous (every 3–10 mins)' },
      { label: 'New Attack Pattern Incorporation', value: '< 2 minutes' },
    ],
  },
  {
    title: 'Visibility',
    items: [
      { label: 'Traffic & Asset Visibility', value: '100%' },
      { label: 'Zero Trust Verification Coverage', value: '100%' },
    ],
  },
];

import { AnimatedHeadline } from '../ui/AnimatedHeadline';

export default function BastionPerformance() {
  return (
    <section className="bg-transparent text-white py-32 overflow-hidden relative z-10">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        {/* Header */}
        <FadeUp className="mb-16 md:mb-24">
          <AnimatedHeadline
            text="Performance Metrics."
            as="h2"
            className="text-3xl md:text-5xl lg:text-6xl font-light leading-tight text-white mb-6 tracking-tight"
          />
          <div className="max-w-3xl text-lg md:text-xl text-[#B3B3B3] font-light leading-relaxed">
            <p>Proven performance at enterprise scale.</p>
          </div>
        </FadeUp>

        {/* Hero Metrics (5 items) */}
        <FadeUp staggerChildren={0.1} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 md:gap-8 mb-24">
          {heroMetrics.map((metric, index) => (
            <FadeUpChild key={index} className="flex flex-col border-l border-white/10 pl-6">
              <span className="text-4xl md:text-5xl font-light text-white mb-2 tracking-tight">
                {metric.value}
              </span>
              <span className="text-sm text-[#B3B3B3] uppercase tracking-widest font-mono">
                {metric.label}
              </span>
            </FadeUpChild>
          ))}
        </FadeUp>

        {/* Detailed Metrics Grid */}
        <FadeUp staggerChildren={0.05} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12 mb-16">
          {categoryMetrics.map((category, idx) => (
            <FadeUpChild key={idx} className="flex flex-col">
              <h3 className="text-sm font-mono text-white/80 uppercase tracking-widest mb-6 border-b border-white/10 pb-3">
                {category.title}
              </h3>
              <ul className="space-y-4">
                {category.items.map((item, i) => (
                  <li key={i} className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-1 md:gap-4">
                    <span className="text-[13px] md:text-sm text-[#B3B3B3] font-light">
                      {item.label}
                    </span>
                    <span className="text-sm text-white font-mono font-medium md:text-right shrink-0">
                      {item.value}
                    </span>
                  </li>
                ))}
              </ul>
            </FadeUpChild>
          ))}
        </FadeUp>

        {/* Footer Note */}
        <FadeUp className="pt-8 border-t border-white/5">
          <p className="text-xs text-[#B3B3B3]/50 font-light max-w-2xl">
            * Metrics represent target performance under typical enterprise workloads. Actual results may vary based on environment and configuration.
          </p>
        </FadeUp>
      </div>
    </section>
  );
}
