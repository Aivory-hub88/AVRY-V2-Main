'use client';

import { useState, useRef } from 'react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import ContactModal from './ContactModal';

const services = [
  {
    title: 'AI Strategy Consultation',
    description: 'Work 1-on-1 with an Aivory™ expert to validate your AI direction and make sure you\u2019re building the right things.',
  },
  {
    title: 'Custom AI Development',
    description: 'Custom agents, workflows, integrations, and AI systems built around your business.',
  },
  {
    title: 'Corporate Training',
    description: 'Practical workshops and executive programs for teams adopting AI.',
  },
  {
    title: 'Enterprise Advisory',
    description: 'Long-term support for AI transformation, governance, and implementation.',
  },
];

const ServiceCard = ({ service }: { service: typeof services[0] }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cardRef.current.style.setProperty('--mouse-x', `${x}px`);
    cardRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className="relative spotlight-card border border-white/10 p-8 transition-colors bg-[#0a0a0a] overflow-hidden rounded-xl"
    >
      <h3 className="text-xl font-normal text-white mb-3 relative z-10">{service.title}</h3>
      <p className="text-[#b2b2b2] font-light leading-relaxed relative z-10">{service.description}</p>
    </div>
  );
};

export default function PreFooterCTA() {
  const { ref, isVisible } = useScrollAnimation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <section ref={ref} className={`animate-on-scroll ${isVisible ? 'is-visible' : ''} w-full bg-[#050505] text-white pt-12 pb-24 font-sans`}>
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          {/* Headline */}
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-normal tracking-tight mb-6">
            Prefer to Work With Our Team Directly?
          </h2>
          <p className="text-white text-xl md:text-2xl font-semibold mb-4">
            Some AI decisions are too important to leave to guesswork.
          </p>
          <p className="text-[#b2b2b2] text-lg md:text-xl font-light mb-10 max-w-4xl">
            Work directly with Aivory™ experts to validate your strategy, design custom AI systems, train your teams, and accelerate implementation.
          </p>

          {/* Divider */}
          {/* Divider removed */}

          {/* Service Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-14">
            {services.map((service) => (
              <ServiceCard key={service.title} service={service} />
            ))}
          </div>

          {/* CTA Button */}
          <div className="flex flex-wrap gap-6">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="px-8 py-4 bg-white text-black font-semibold hover:bg-gray-200 transition-colors text-lg"
            >
              Talk to Our Team
            </button>
          </div>
        </div>
      </section>

      {/* Contact Modal */}
      <ContactModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
