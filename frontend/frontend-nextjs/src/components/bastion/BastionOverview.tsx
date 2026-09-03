'use client';

import { FadeUp, FadeUpChild } from './FadeUp';
import { ThinkingOrb } from 'thinking-orbs';

import { AnimatedHeadline } from '../ui/AnimatedHeadline';

export default function BastionOverview() {
  return (
    <section className="bg-transparent text-white py-32">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24">
          {/* Left Column */}
          <div className="flex flex-col">
            {/* Heading and Scaled Orb Header (No FadeUp wrapper to avoid conflict with SplitType RevealText) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
              <AnimatedHeadline
                text="Adaptive defence for modern enterprises."
                as="h2"
                className="text-4xl lg:text-5xl font-light leading-tight text-white tracking-tight max-w-xl"
              />
              <div className="shrink-0 flex items-center justify-center p-4">
                <div style={{ transform: 'scale(2.34)', transformOrigin: 'center' }}>
                  <ThinkingOrb state="solving" size={64} theme="dark" />
                </div>
              </div>
            </div>

            <FadeUp className="flex flex-col gap-6">
              <p className="text-sm md:text-base text-[#B3B3B3] font-light leading-relaxed">
                Enterprise threats evolve continuously. Traditional security reacts after compromise.
              </p>
              <p className="text-sm md:text-base text-[#B3B3B3] font-light leading-relaxed">
                Bastion combines AI-powered detection, adaptive defence, and continuous monitoring to protect digital assets before threats become incidents.
              </p>
            </FadeUp>
          </div>

          <FadeUp staggerChildren={0.15} className="space-y-12">
            <FadeUpChild className="border-l-2 border-white/20 pl-6 py-2">
              <h3 className="text-lg font-light text-white mb-2">Autonomous Operations</h3>
              <p className="text-sm text-[#B3B3B3] font-light leading-relaxed">
                Security logic executes continuously without human intervention, analysing millions of telemetry signals per second.
              </p>
            </FadeUpChild>

            <FadeUpChild className="border-l-2 border-white/20 pl-6 py-2">
              <h3 className="text-lg font-light text-white mb-2">Zero-Trust Posture</h3>
              <p className="text-sm text-[#B3B3B3] font-light leading-relaxed">
                Every request, endpoint, and data transaction is continuously verified in real time against contextual risk parameters.
              </p>
            </FadeUpChild>

            <FadeUpChild className="border-l-2 border-white/20 pl-6 py-2">
              <h3 className="text-lg font-light text-white mb-2">Resilient Infrastructure</h3>
              <p className="text-sm text-[#B3B3B3] font-light leading-relaxed">
                Designed to isolate anomalies instantly while maintaining critical operational uptime across cloud environments.
              </p>
            </FadeUpChild>
          </FadeUp>
        </div>
      </div>
    </section>
  );
}
