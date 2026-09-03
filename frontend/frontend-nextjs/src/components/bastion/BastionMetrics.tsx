'use client';

import { FadeUp, FadeUpChild } from './FadeUp';
import { ThinkingOrb, OrbState } from 'thinking-orbs';
import { MetallicBorder } from './MetallicBorder';

import { AnimatedHeadline } from '../ui/AnimatedHeadline';

const metrics: { value: string; label: string; state: OrbState }[] = [
  { value: '24/7', label: 'Continuous Monitoring', state: 'listening' },
  { value: 'Adaptive', label: 'Threat Response', state: 'solving' },
  { value: 'Enterprise', label: 'Operational Resilience', state: 'working' },
  { value: '100%', label: 'Security Visibility', state: 'searching' },
  { value: 'Continuous', label: 'Operational Intelligence', state: 'composing' },
  { value: 'Zero Trust', label: 'Access Protection', state: 'shaping' },
];

export default function BastionMetrics() {
  return (
    <section className="bg-transparent text-white py-32 relative z-10">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        
        {/* Header Section */}
        <FadeUp className="mb-16">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono tracking-widest text-[#B3B3B3] uppercase mb-6 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              Autonomous Resilience
            </div>
            <AnimatedHeadline
              text="Built for enterprise resilience."
              as="h2"
              className="text-3xl md:text-4xl lg:text-5xl font-light leading-tight text-white mb-6 tracking-tight"
            />
            <div className="space-y-4 max-w-3xl text-sm md:text-base text-[#B3B3B3] font-light leading-relaxed">
              <p>Modern security is measured by resilience. Not only by prevention.</p>
              <p>Bastion continuously monitors, analyses, and strengthens your defensive posture while maintaining operational continuity.</p>
            </div>
          </div>
        </FadeUp>

        {/* 6 Metrics Grid with unique ThinkingOrb state per item */}
        <FadeUp staggerChildren={0.08} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {metrics.map((metric, index) => (
            <FadeUpChild 
              key={index} 
              className="w-full"
            >
              <MetallicBorder borderRadius="16px">
                <div className="w-full flex flex-col p-6 md:p-8 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/25 hover:bg-white/[0.06] transition-all duration-300 backdrop-blur-md group shadow-lg min-h-[300px]">
                  <div className="text-xl md:text-2xl font-light text-white mb-4">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  
                  <div className="flex-1 flex items-center justify-center py-4">
                    <ThinkingOrb 
                      state={metric.state} 
                      size={64} 
                      theme="dark" 
                      style={{ transform: 'scale(1.5)' }} 
                    />
                  </div>
                  
                  <div className="mt-auto flex flex-col w-full">
                    <span className="text-lg md:text-xl font-light text-white mb-3 tracking-tight">
                      {metric.value}
                    </span>
                    <div className="w-full h-px bg-white/20 mb-3" />
                    <span className="text-[10px] md:text-xs text-[#B3B3B3] uppercase tracking-widest font-mono font-medium">
                      {metric.label}
                    </span>
                  </div>
                </div>
              </MetallicBorder>
            </FadeUpChild>
          ))}
        </FadeUp>

      </div>
    </section>
  );
}
