'use client';

import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import Link from 'next/link';
import { useState } from 'react';
import ContactModal from '@/components/home/ContactModal';
import { SpotlightButton } from '@/components/ui/SpotlightButton';

/* ─── Arrow Icon ─── */
function ArrowIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 7v10H7" />
      <path d="M7 7l10 10" />
    </svg>
  );
}

interface CTAFooterProps {
  title: string;
  subtitle?: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
}

export function CTAFooter({ title, subtitle, primaryCta, secondaryCta }: CTAFooterProps) {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });
  const [isModalOpen, setIsModalOpen] = useState(false);

  const renderCta = (cta: { label: string; href: string }, isPrimary: boolean) => {
    const isContact = cta.href === '#contact';

    if (isContact) {
      return (
        <SpotlightButton key={cta.label} onClick={() => setIsModalOpen(true)}>
          {cta.label}
        </SpotlightButton>
      );
    }
    
    return (
      <SpotlightButton key={cta.label} href={cta.href}>
        {cta.label}
      </SpotlightButton>
    );
  };

  return (
    <>
    <section
      ref={ref}
      className={`animate-on-scroll ${
        isVisible ? 'is-visible' : ''
      } w-full pt-[52px] pb-24 bg-black bg-grid-pattern relative border-b border-white/5`}
    >
      <div className="max-w-4xl mx-auto px-6 text-center flex flex-col items-center relative z-10">
        {/* Monospaced tag */}
        <div
          className="text-[12px] text-[#dfe2d8] tracking-[0.25em] uppercase mb-4 font-manrope font-light"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          // GET STARTED NOW
        </div>

        {/* Title */}
        <h2
          className="text-4xl md:text-5xl font-light tracking-normal mb-6 text-white leading-tight md:whitespace-nowrap"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          {title}
        </h2>

        {/* Subtitle */}
        {subtitle && (
          <p
            className="text-white/75 text-base md:text-lg font-light mb-10 max-w-xl leading-relaxed"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            {subtitle}
          </p>
        )}

        {/* Pill buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center w-full sm:w-auto">
          {primaryCta && renderCta(primaryCta, true)}
          {secondaryCta && renderCta(secondaryCta, false)}
        </div>
      </div>
    </section>
    <ContactModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
