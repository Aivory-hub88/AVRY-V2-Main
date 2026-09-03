'use client';

import { useState, useRef, useEffect } from 'react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import ContactModal from './ContactModal';
import { SpotlightButton } from '@/components/ui/SpotlightButton';
import { PlanConfirmModal } from '@/components/payment/PlanConfirmModal';

/* ─── Arrow Icon ─── */
function ArrowIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 7v10H7" />
      <path d="M7 7l10 10" />
    </svg>
  );
}

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

  useEffect(() => {
    let animationFrameId: number;
    let startTime = Math.random() * 10000; // Random start time so each card has a different phase

    const animate = (time: number) => {
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const radiusX = rect.width / 2;
        const radiusY = rect.height / 2;
        
        // Speed: 1 full rotation every ~6 seconds
        const speed = 0.001; 
        const angle = (time + startTime) * speed;
        
        // Counter-clockwise motion (X uses cos, Y uses -sin since screen Y goes down)
        const x = centerX + radiusX * Math.cos(angle);
        const y = centerY - radiusY * Math.sin(angle);
        
        cardRef.current.style.setProperty('--mouse-x', `${x}px`);
        cardRef.current.style.setProperty('--mouse-y', `${y}px`);
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      ref={cardRef}
      className="relative spotlight-card auto-spotlight border border-white/10 p-8 transition-colors overflow-hidden rounded-xl"
      style={{ backgroundColor: 'rgba(20, 20, 26, 0.2)' }}
    >
      <h3 className="text-xl font-normal text-white mb-3 relative z-10">{service.title}</h3>
      <p className="text-[#dadada] font-light leading-relaxed relative z-10">{service.description}</p>
    </div>
  );
};

export default function PreFooterCTA() {
  const { ref, isVisible } = useScrollAnimation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [checkoutProductId, setCheckoutProductId] = useState<string | null>(null);

  return (
    <>
      <section id="prefooter-cta" ref={ref} className={`animate-on-scroll ${isVisible ? 'is-visible' : ''} w-full text-white pt-12 pb-24 font-sans`}>
        <div style={{ zoom: 0.78 }}>
          <div className="max-w-7xl mx-auto px-6 md:px-12">
          {/* Headline */}
          <SpotlightButton 
            className="mb-6 pointer-events-auto hover:-translate-y-0 w-fit" 
            style={{ 
              borderWidth: '0.5px', 
              borderStyle: 'solid', 
              borderColor: 'rgba(255,255,255,0.1)', 
              width: 'fit-content',
              cursor: 'default' 
            }}
            icon={false}
            roundedClass="rounded-[10px]"
          >
            Direct Engagement
          </SpotlightButton>
          <h2 className="no-word-split text-3xl md:text-4xl lg:text-5xl font-light tracking-tight leading-[1.2] mb-6" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>
            Direct Engagement.
          </h2>
          <p className="text-[#dadada] text-lg md:text-xl font-light mb-10 max-w-4xl">
            Partner with our enterprise team to audit operations, architect transformation roadmaps, and deploy governed AI systems at scale.
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
            <SpotlightButton 
              onClick={() => setIsModalOpen(true)}
              className="text-xs md:text-sm"
              roundedClass="rounded-[10px]"
            >
              Talk to Our Team
            </SpotlightButton>
            <SpotlightButton 
              href="/free-diagnostic"
              className="text-xs md:text-sm"
              roundedClass="rounded-[10px]"
            >
              Start With Free Assessment
            </SpotlightButton>
            <SpotlightButton 
              onClick={() => setCheckoutProductId('ai_snapshot')}
              className="text-xs md:text-sm"
              roundedClass="rounded-[10px]"
            >
              Start Deep Assessment
            </SpotlightButton>
          </div>
          </div>
        </div>
      </section>

      {/* Checkout Modal */}
      {checkoutProductId && (
        <PlanConfirmModal
          productId={checkoutProductId}
          onClose={() => setCheckoutProductId(null)}
        />
      )}

      {/* Contact Modal */}
      <ContactModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
