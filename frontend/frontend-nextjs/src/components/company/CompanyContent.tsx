'use client';

import { useScrollAnimation } from '@/hooks/useScrollAnimation';

export function CompanyContent() {
  const { ref: missionRef, isVisible: missionVisible } = useScrollAnimation({ threshold: 0.1 });
  const { ref: valuesRef, isVisible: valuesVisible } = useScrollAnimation({ threshold: 0.1 });

  return (
    <div className="bg-black pt-24 pb-32 px-6 md:px-16 lg:px-24 font-manrope">
      <div className="max-w-4xl mx-auto space-y-32">
        {/* Mission & Vision Section */}
        <section
          ref={missionRef}
          className={`animate-on-scroll ${missionVisible ? 'is-visible' : ''}`}
        >
          <div className="flex flex-col items-center text-center mb-16">
            <span className="text-[#c4c9b8] uppercase tracking-widest text-xs font-manrope font-light mb-3">
              MISSION & VISION
            </span>
          </div>

          <div className="space-y-16">
            <div>
              <h3 className="text-2xl md:text-3xl font-light text-white mb-4">Our Mission</h3>
              <p className="text-[#777] text-lg font-light leading-relaxed">
                To make AI adoption practical, structured, and accessible for every organization, regardless of size, industry, or technical background.
              </p>
            </div>
            
            <div>
              <h3 className="text-2xl md:text-3xl font-light text-white mb-4">Our Vision</h3>
              <p className="text-[#777] text-lg font-light leading-relaxed">
                A world where any organization can confidently understand, plan, and operate AI. Not just those with the largest budgets or deepest technical teams, but every organization starting now.
              </p>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-white/10" />

        {/* Values Section */}
        <section
          ref={valuesRef}
          className={`animate-on-scroll ${valuesVisible ? 'is-visible' : ''}`}
        >
          <div className="flex flex-col items-center text-center mb-16">
            <span className="text-[#c4c9b8] uppercase tracking-widest text-xs font-manrope font-light mb-3">
              VALUES / WHAT WE BELIEVE
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-16">
            <div>
              <h3 className="text-xl font-medium text-white mb-3">Clarity over complexity</h3>
              <p className="text-[#777] font-light leading-relaxed">
                If something is difficult to understand, we have not done our job. Every product, every word, and every decision is designed to make things clearer, not more impressive.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-medium text-white mb-3">Speed over ceremony</h3>
              <p className="text-[#777] font-light leading-relaxed">
                Long timelines and endless back-and-forth slow progress. We build for teams that need to move and we move with them.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-medium text-white mb-3">Outcomes over outputs</h3>
              <p className="text-[#777] font-light leading-relaxed">
                A roadmap that never gets executed has no value. A strategy deck that sits unused has no impact. Success is measured by what is running inside your business.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-medium text-white mb-3">Accessible by design</h3>
              <p className="text-[#777] font-light leading-relaxed">
                AI should not be limited to organizations with large budgets or specialized teams. We build for anyone with meaningful problems to solve.
              </p>
            </div>

            <div className="md:col-span-2 md:max-w-xl md:mx-auto">
              <h3 className="text-xl font-medium text-white mb-3">Honest by default</h3>
              <p className="text-[#777] font-light leading-relaxed">
                AI is not the answer to everything. We show you where it works, where it does not, and what it takes to make it succeed.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
