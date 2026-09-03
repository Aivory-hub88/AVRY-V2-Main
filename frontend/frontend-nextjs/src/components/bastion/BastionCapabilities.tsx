import { FadeUp, FadeUpChild } from './FadeUp';

const capabilities = [
  {
    title: 'Active Deception',
    description: 'Identify reconnaissance and hostile intent through intelligent defensive interaction.',
  },
  {
    title: 'Behavioural Intelligence',
    description: 'Understand suspicious behaviour beyond traditional signatures.',
  },
  {
    title: 'Adaptive Containment',
    description: 'Progressively isolate malicious activity while preserving legitimate traffic.',
  },
  {
    title: 'Autonomous Mitigation',
    description: 'Respond dynamically to evolving attack techniques.',
  },
  {
    title: 'Operational Intelligence',
    description: 'Transform every hostile interaction into actionable defensive insight.',
  },
  {
    title: 'Continuous Hardening',
    description: 'Strengthen protection continuously based on observed attack patterns.',
  },
];

export default function BastionCapabilities() {
  return (
    <section className="bg-transparent text-white py-32">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <FadeUp className="mb-16">
          <h2 className="text-3xl md:text-5xl font-light leading-tight text-[#FFFFFF] mb-6">
            Adaptive by design.
          </h2>
          <div className="space-y-4 max-w-4xl text-lg text-[#B3B3B3] font-light leading-relaxed">
            <p>Attackers constantly evolve. Your defence should too.</p>
            <p>Bastion continuously adapts to changing attack behaviours through intelligent observation, behavioural analysis, and autonomous defensive strategies without disrupting legitimate operations.</p>
          </div>
        </FadeUp>
        <FadeUp staggerChildren={0.1} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-16">
          {capabilities.map((capability, index) => (
            <FadeUpChild
              key={index}
              className="pt-4"
            >
              <h3 className="text-xl md:text-2xl font-light text-[#FFFFFF] mb-4">{capability.title}</h3>
              <p className="text-base md:text-lg text-[#B3B3B3] font-light leading-relaxed">
                {capability.description}
              </p>
            </FadeUpChild>
          ))}
        </FadeUp>
      </div>
    </section>
  );
}
