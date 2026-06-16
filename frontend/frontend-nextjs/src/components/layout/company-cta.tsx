'use client';

import { useScrollAnimation } from '@/hooks/useScrollAnimation';

export function CompanyCTA() {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  return (
    <section
      ref={ref}
      className="!py-32 !px-6 md:!px-16 lg:!px-24"
      style={{
        background: '#000',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
        transition: 'opacity 0.8s ease, transform 0.8s ease',
      }}
    >
      <div className="!max-w-4xl !mx-auto !text-center">
        <h2 className="!text-4xl md:!text-5xl !font-light !text-white !mb-8 !tracking-tight">
          Ready to transform your business with AI?
        </h2>
        <div className="!flex !flex-wrap !justify-center !gap-6">
          <a
            href="mailto:hello@aivory.uk"
            className="!px-8 !py-4 !bg-white !text-black !font-semibold hover:!bg-gray-200 !transition-colors !text-lg !no-underline"
          >
            Talk to Us
          </a>
          <a
            href="/diagnostic"
            className="!px-8 !py-4 !border !border-white/30 !text-white !font-semibold hover:!border-white/60 !transition-colors !text-lg !no-underline"
          >
            Start Free Diagnostic
          </a>
        </div>
      </div>
    </section>
  );
}

export default CompanyCTA;
