import { FadeUp, FadeUpChild } from './FadeUp';

const domains = [
  {
    title: 'Digital Asset Protection',
    description: 'Protect business-critical infrastructure across every environment.',
  },
  {
    title: 'Threat Intelligence',
    description: 'Continuously identify emerging threats before they escalate.',
  },
  {
    title: 'Adaptive Defence',
    description: 'Continuously strengthen protection as attack behaviours evolve.',
  },
  {
    title: 'Operational Resilience',
    description: 'Maintain business continuity under changing threat conditions.',
  },
];

export default function BastionDomains() {
  return (
    <section className="bg-transparent text-white py-32">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <FadeUp className="mb-16">
          <h2 className="text-3xl md:text-5xl font-light leading-tight text-[#FFFFFF] mb-6">
            Enterprise Operational Defence.
          </h2>
          <div className="space-y-4 max-w-4xl text-lg text-[#B3B3B3] font-light leading-relaxed">
            <p>Modern organisations rely on complex digital infrastructure.</p>
            <p>Bastion protects cloud environments, enterprise applications, identities, AI systems, APIs, and mission-critical services through intelligent monitoring, adaptive protection, and continuous operational defence.</p>
          </div>
        </FadeUp>
        <FadeUp staggerChildren={0.1} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-16">
          {domains.map((domain, index) => (
            <FadeUpChild
              key={index}
              className="pt-4"
            >
              <h3 className="text-xl md:text-2xl font-light text-[#FFFFFF] mb-4">{domain.title}</h3>
              <p className="text-base md:text-lg text-[#B3B3B3] font-light leading-relaxed">
                {domain.description}
              </p>
            </FadeUpChild>
          ))}
        </FadeUp>
      </div>
    </section>
  );
}
