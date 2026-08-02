'use client';

import { useState } from 'react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { SpotlightButton } from '@/components/ui/SpotlightButton';

/**
 * Imported rather than referenced by public path so the emitted URL carries a
 * content hash. Swapping the art then changes the URL, which is the only thing
 * that reliably evicts an already-cached image from browsers and the CDN edge.
 */
import opsAssessment from '../../../public/images/transformation/01-operational-assessment.webp';
import transformationDesign from '../../../public/images/transformation/02-transformation-design.webp';
import enterpriseImplementation from '../../../public/images/transformation/03-enterprise-implementation.webp';
import executiveEnablement from '../../../public/images/transformation/04-executive-enablement.webp';

const FORMSUBMIT_ENDPOINT = 'https://formsubmit.co/ajax/sales@aivory.uk';

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

/**
 * One woven tapestry per engagement stage. Full-bleed art, so it is framed
 * rather than floated. Masters: art-masters/transformation (gitignored).
 */
const services = [
  {
    title: 'Operational Assessment',
    description:
      'Understand how your organisation operates today, identify operational bottlenecks, and uncover the highest-value transformation opportunities.',
    image: opsAssessment,
    alt: 'An embroidered tapestry: figures reviewing charts at a table before a heraldic wall panel.',
  },
  {
    title: 'Transformation Design',
    description:
      'Design future operating models, intelligent workflows, governance frameworks, and AI deployment strategies tailored to your organisation.',
    image: transformationDesign,
    alt: 'An embroidered tapestry: a figure setting a great cogwheel beside a woven road leading to a castle.',
  },
  {
    title: 'Enterprise Implementation',
    description:
      'Deploy governed AI systems, operational workflows, and enterprise integrations with measurable business outcomes.',
    image: enterpriseImplementation,
    alt: 'An embroidered tapestry: workers tending an interlocking machine of gears, pipes and dashboards.',
  },
  {
    title: 'Executive Enablement',
    description:
      'Prepare leadership and operational teams with the knowledge, governance, and frameworks required to manage long-term transformation.',
    image: executiveEnablement,
    alt: 'An embroidered tapestry: three colleagues assembling a compass rose on a table beneath a crested banner.',
  },
];

const fieldClassName =
  'border-b border-white/25 bg-transparent py-3 text-white outline-none transition-colors focus:border-white';
const labelClassName = 'font-mono text-[10px] uppercase tracking-[0.18em] text-white/55';

export default function PreFooterCTA() {
  const { ref, isVisible } = useScrollAnimation();
  const [status, setStatus] = useState<SubmitState>('idle');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('submitting');

    try {
      const res = await fetch(FORMSUBMIT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))),
      });

      if (!res.ok) throw new Error('Submission failed');
      setStatus('success');
      e.currentTarget.reset();
    } catch {
      setStatus('error');
    }
  };

  return (
    <section
      id="prefooter-cta"
      ref={ref}
      data-prefooter-layout="editorial"
      className={`animate-on-scroll ${isVisible ? 'is-visible' : ''} relative isolate w-full overflow-hidden border-t border-white/10 py-20 font-sans text-white md:py-28`}
    >
      <div className="mx-auto max-w-[1400px] px-6 md:px-12 lg:px-24">
        <div className="grid gap-10 pb-14 lg:grid-cols-12 lg:pb-20">
          <div className="lg:col-span-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">
              Strategic engagement / 01
            </p>
          </div>
          <div className="lg:col-span-7 lg:col-start-6">
            <h2
              className="no-word-split text-3xl font-light leading-[1.12] tracking-[-0.03em] md:text-[44px]"
              style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}
            >
              Start your transformation.
            </h2>
            <div className="mt-7 max-w-2xl space-y-3 text-[15px] font-light leading-7 text-white/62 md:text-base">
              <p>Every transformation begins with understanding how your organisation operates.</p>
              <p>Tell us about your business, your operational challenges, and where you want to go.</p>
              <p>We&apos;ll help identify where AI can create measurable business value.</p>
            </div>
          </div>
        </div>

        <ol
          className="border-b border-white/10"
          data-service-layout="numbered-rows"
          data-service-icon-count="4"
        >
          {services.map((service, index) => (
            <li
              key={service.title}
              className="group grid gap-5 border-t border-white/10 py-8 transition-colors hover:bg-white/[0.018] md:py-10 lg:grid-cols-12 lg:items-start"
            >
              <span className="font-mono text-[10px] text-white/35 lg:col-span-1">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div className="lg:col-span-2">
                {/* Full-bleed tapestries, so they read as framed thumbnails rather
                    than floating icons — no matte to dissolve into the backdrop. */}
                <div className="w-32 overflow-hidden rounded-[10px] ring-1 ring-inset ring-white/12 md:w-40 lg:w-full lg:max-w-[188px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={service.image.src}
                    alt={service.alt}
                    width={service.image.width}
                    height={service.image.height}
                    loading="lazy"
                    decoding="async"
                    className="block h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                  />
                </div>
              </div>
              <h3 className="text-xl font-light tracking-[-0.015em] text-white/92 md:text-2xl lg:col-span-3">
                {service.title}
              </h3>
              <p className="max-w-2xl text-sm font-light leading-7 text-white/55 lg:col-span-6 lg:col-start-7">
                {service.description}
              </p>
            </li>
          ))}
        </ol>

        <div className="grid gap-12 border-b border-white/10 py-16 md:py-20 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">
              Transformation intake / 02
            </p>
            <h3 className="mt-5 max-w-sm text-3xl font-light leading-[1.15] tracking-[-0.025em] md:text-[40px]">
              Tell us where the operation needs to move.
            </h3>
          </div>

          <div className="lg:col-span-7 lg:col-start-6">
            {status === 'success' ? (
              <div className="border-y border-white/15 py-8 text-lg font-light leading-8 text-white/88">
                Thank you for reaching out — our strategic transformation team will be in touch shortly.
              </div>
            ) : (
              <form className="flex flex-col gap-8" onSubmit={handleSubmit}>
                <input type="hidden" name="_subject" value="New Enterprise Transformation Inquiry" />
                <input type="hidden" name="_captcha" value="false" />
                <input type="hidden" name="_template" value="table" />
                <input type="hidden" name="_cc" value="irfan.reichmann@aivory.uk,samuel@aivory.id" />

                <div className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label className={labelClassName}>
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input type="text" name="first_name" className={fieldClassName} required />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className={labelClassName}>
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input type="text" name="last_name" className={fieldClassName} required />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className={labelClassName}>
                      Job Title <span className="text-red-500">*</span>
                    </label>
                    <input type="text" name="job_title" className={fieldClassName} required />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className={labelClassName}>
                      Company / Organisation <span className="text-red-500">*</span>
                    </label>
                    <input type="text" name="company_name" className={fieldClassName} required />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className={labelClassName}>
                      Business Email <span className="text-red-500">*</span>
                    </label>
                    <input type="email" name="business_email" className={fieldClassName} required />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className={labelClassName}>Phone Number</label>
                    <input type="tel" name="phone_number" className={fieldClassName} />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className={labelClassName}>
                      Country <span className="text-red-500">*</span>
                    </label>
                    <select name="country" className={`${fieldClassName} appearance-none`} required defaultValue="">
                      <option value="" disabled className="text-black">Select...</option>
                      <option value="ID" className="text-black">Indonesia</option>
                      <option value="SG" className="text-black">Singapore</option>
                      <option value="US" className="text-black">United States</option>
                      <option value="UK" className="text-black">United Kingdom</option>
                      <option value="OTHER" className="text-black">Other</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className={labelClassName}>
                      Company Size <span className="text-red-500">*</span>
                    </label>
                    <select name="company_size" className={`${fieldClassName} appearance-none`} required defaultValue="">
                      <option value="" disabled className="text-black">Select...</option>
                      <option value="1-10" className="text-black">1–10</option>
                      <option value="11-50" className="text-black">11–50</option>
                      <option value="51-250" className="text-black">51–250</option>
                      <option value="251-1000" className="text-black">251–1000</option>
                      <option value="1000+" className="text-black">1000+</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className={labelClassName}>
                      Industry <span className="text-red-500">*</span>
                    </label>
                    <select name="industry" className={`${fieldClassName} appearance-none`} required defaultValue="">
                      <option value="" disabled className="text-black">Select...</option>
                      <option value="Government" className="text-black">Government</option>
                      <option value="Financial Services" className="text-black">Financial Services</option>
                      <option value="Healthcare" className="text-black">Healthcare</option>
                      <option value="Manufacturing" className="text-black">Manufacturing</option>
                      <option value="Retail" className="text-black">Retail</option>
                      <option value="Logistics" className="text-black">Logistics</option>
                      <option value="Technology" className="text-black">Technology</option>
                      <option value="Education" className="text-black">Education</option>
                      <option value="Other" className="text-black">Other</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className={labelClassName}>
                      Primary Objective <span className="text-red-500">*</span>
                    </label>
                    <select name="primary_objective" className={`${fieldClassName} appearance-none`} required defaultValue="">
                      <option value="" disabled className="text-black">Select...</option>
                      <option value="Improve Business Operations" className="text-black">Improve Business Operations</option>
                      <option value="Process Automation" className="text-black">Process Automation</option>
                      <option value="AI Strategy" className="text-black">AI Strategy</option>
                      <option value="Enterprise Transformation" className="text-black">Enterprise Transformation</option>
                      <option value="Customer Experience" className="text-black">Customer Experience</option>
                      <option value="Operational Efficiency" className="text-black">Operational Efficiency</option>
                      <option value="Other" className="text-black">Other</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-2 md:col-span-2">
                    <label className={labelClassName}>
                      Current AI Adoption <span className="text-red-500">*</span>
                    </label>
                    <select name="current_ai_adoption" className={`${fieldClassName} appearance-none`} required defaultValue="">
                      <option value="" disabled className="text-black">Select...</option>
                      <option value="Exploring AI" className="text-black">Exploring AI</option>
                      <option value="Early Adoption" className="text-black">Early Adoption</option>
                      <option value="Scaling AI" className="text-black">Scaling AI</option>
                      <option value="Mature AI Operations" className="text-black">Mature AI Operations</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-2 md:col-span-2">
                    <label className={labelClassName}>
                      Message <span className="text-white/35">(Optional)</span>
                    </label>
                    <textarea
                      name="message"
                      rows={3}
                      placeholder="Tell us about your organisation, your operational challenges, or what you're looking to achieve."
                      className={`${fieldClassName} placeholder:text-white/30`}
                    />
                  </div>
                </div>

                {status === 'error' && (
                  <p className="text-sm text-red-400">Something went wrong — please try again.</p>
                )}

                <div className="flex flex-col items-start gap-5 pt-6">
                  <SpotlightButton
                    type="submit"
                    disabled={status === 'submitting'}
                    roundedClass="rounded-[10px]"
                    className="text-xs md:text-sm"
                  >
                    {status === 'submitting' ? 'Sending...' : 'Start Conversation'}
                  </SpotlightButton>

                  <p className="text-sm font-light text-white/55 md:text-base">
                    Prefer speaking with our team?{' '}
                    <a href="/contact" className="border-b border-white/35 pb-1 text-white/78 transition-colors hover:border-white hover:text-white">
                      Schedule a Discovery Call.
                    </a>
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
