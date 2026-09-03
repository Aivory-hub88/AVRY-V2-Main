import Link from 'next/link';
import { TechnicalFrameButton } from '@/components/ui/TechnicalFrameButton';
import Navbar from '@/components/home/Navbar';
import Footer from '@/components/Footer';
import { AboutArchitecturalSignal } from '@/components/about/AboutArchitecturalSignal';
import { LocaleSuggestionBanner } from '@/components/locale/LocaleSuggestionBanner';
import { LocaleSwitcher } from '@/components/locale/LocaleSwitcher';
import type { SiteLocale } from '@/components/locale/LocaleSuggestionBanner';

const ABOUT_HERO_BACKGROUND =
  'linear-gradient(to bottom, #050505 0, #050505 64px, #efeee8 64px, #efeee8 100%)';

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.5">
      <path d="M17 7v10H7" />
      <path d="M7 7l10 10" />
    </svg>
  );
}

export interface AboutContent {
  locale: SiteLocale;
  heroEyebrow: string;
  heroHeading: string;
  whatWeDoLabel: string;
  whatWeDoText: string;
  startAssessmentCta: string;
  companyOverviewCta: string;
  eyebrow02: string;
  heading02: string;
  lead02: string;
  body02a: string;
  body02b: string;
  eyebrow03: string;
  founderRole: string;
  founderName: string;
  linkedinCta: string;
  quote: string;
  founderBody1: string;
  founderBody2: string;
  eyebrow04: string;
  heading04: string;
  body04: string;
  steps: readonly { name: string; text: string }[];
  processLabels: readonly string[];
  eyebrow05: string;
  heading05: string;
  body05: string;
  principles: readonly { number: string; title: string; text: string }[];
  eyebrow06: string;
  heading06: string;
  faq: readonly { question: string; answer: string }[];
  eyebrow07: string;
  heading07: string;
  ctaStart: string;
  ctaTalk: string;
  companyHref: string;
}

/**
 * Shared structure for every localized About page. English/Arabic/Japanese
 * were built by hand before this existed (already verified live) -- this
 * template exists so the remaining languages don't each duplicate ~300
 * lines of identical JSX with only the strings changed.
 */
export function AboutPageTemplate({ content }: { content: AboutContent }) {
  return (
    <main
      className="min-h-screen overflow-hidden bg-[#030408] text-white selection:bg-white selection:text-black"
      data-about-layout="editorial"
    >
      <Navbar />
      <LocaleSwitcher currentLocale={content.locale} path="about" />
      <LocaleSuggestionBanner currentLocale={content.locale} path="about" />

      <section
        className="text-[#11110f]"
        style={{ fontWeight: 300, background: ABOUT_HERO_BACKGROUND }}
      >
        <div className="mx-auto max-w-[1480px] px-6 pb-16 pt-40 md:px-12 lg:px-24 md:pb-24 md:pt-52">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/60">{content.heroEyebrow}</p>
          <h1 className="mt-5 max-w-[1180px] text-[44px] font-light leading-[1.15] tracking-[-0.02em] text-[#11110f] md:text-[64px] lg:text-[80px]">
            {content.heroHeading}
          </h1>
        </div>

        <div className="mx-auto max-w-[1480px] px-6 pb-20 md:px-12 lg:px-24 md:pb-28">
          <div className="grid border-t border-black/25 pt-8 lg:grid-cols-12 lg:gap-12">
            <div className="pb-8 lg:col-span-4 lg:pb-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/60">{content.whatWeDoLabel}</p>
            </div>
            <div className="lg:col-span-8">
              <p className="max-w-2xl text-[16px] font-light leading-[1.8] text-black/70 md:text-[17px]">
                {content.whatWeDoText}
              </p>
              <div className="mt-10 flex flex-wrap gap-x-10 gap-y-5">
                <Link
                  href="/free-diagnostic"
                  className="inline-flex items-center gap-3 border-b border-black pb-1 text-[13px] font-light text-black transition-opacity hover:opacity-55"
                >
                  {content.startAssessmentCta}
                  <ArrowIcon />
                </Link>
                <Link
                  href={content.companyHref}
                  className="inline-flex items-center gap-3 border-b border-black pb-1 text-[13px] font-light text-black transition-opacity hover:opacity-55"
                >
                  {content.companyOverviewCta}
                  <ArrowIcon />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <AboutArchitecturalSignal />

      <section className="border-b border-white/10 px-6 py-20 md:px-12 lg:px-24 md:py-28 lg:px-24">
        <div className="mx-auto grid max-w-[1400px] gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/42">{content.eyebrow02}</p>
            <h2 className="mt-5 max-w-sm text-3xl font-light leading-[1.25] tracking-[-0.01em] md:text-[36px]">
              {content.heading02}
            </h2>
          </div>

          <div className="space-y-8 lg:col-span-7 lg:col-start-6">
            <p className="text-xl font-light leading-[1.7] tracking-[-0.01em] text-white/88 md:text-2xl">
              {content.lead02}
            </p>
            <div className="grid gap-7 border-t border-white/10 pt-8 text-[15px] font-light leading-7 text-white/58 md:grid-cols-2">
              <p>{content.body02a}</p>
              <p>{content.body02b}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 px-6 py-20 md:px-12 lg:px-24 md:py-28 lg:px-24">
        <div className="mx-auto max-w-[1400px]">
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/42">{content.eyebrow03}</p>
              <div className="mt-10 border-t border-white/10 pt-6" data-founder-profile="linkedin-only">
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/40">{content.founderRole}</p>
                <h2 className="mt-3 text-3xl font-light tracking-[-0.01em]">{content.founderName}</h2>
                <a
                  href="https://www.linkedin.com/in/irfan-reichmann/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-7 inline-flex items-center gap-3 border-b border-white/30 pb-1 text-sm text-white/70 transition-colors hover:border-white hover:text-white"
                >
                  {content.linkedinCta} <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>

            <div className="lg:col-span-7 lg:col-start-6">
              <blockquote className="max-w-4xl text-2xl font-light leading-[1.45] tracking-[-0.01em] text-white/92 md:text-[36px]">
                {content.quote}
              </blockquote>
              <div className="mt-10 grid gap-7 border-t border-white/10 pt-8 text-[15px] font-light leading-7 text-white/58 md:grid-cols-2">
                <p>{content.founderBody1}</p>
                <p>{content.founderBody2}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-b border-white/10 px-6 py-20 md:px-12 lg:px-24 md:py-28 lg:px-24">
        <div className="mx-auto max-w-[1400px]">
          <div className="grid gap-10 pb-14 lg:grid-cols-12 lg:pb-20">
            <div className="lg:col-span-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/42">{content.eyebrow04}</p>
            </div>
            <div className="lg:col-span-7 lg:col-start-6">
              <h2 className="text-3xl font-light leading-[1.25] tracking-[-0.01em] md:text-[36px]">
                {content.heading04}
              </h2>
              <p className="mt-6 max-w-2xl text-[15px] font-light leading-7 text-white/55">
                {content.body04}
              </p>
            </div>
          </div>

          <ol className="border-b border-white/10">
            {content.steps.map((step, index) => (
              <li
                key={step.name}
                className="group grid gap-5 border-t border-white/10 py-8 transition-colors hover:bg-white/[0.018] md:py-10 lg:grid-cols-12"
              >
                <span className="font-mono text-[10px] text-white/35 lg:col-span-1">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="text-xl font-light tracking-[-0.01em] text-white/90 md:text-2xl lg:col-span-3">
                  {step.name}
                </h3>
                <p className="max-w-2xl text-sm font-light leading-7 text-white/52 lg:col-span-5 lg:col-start-6">
                  {step.text}
                </p>
                <p className="self-start text-[10px] uppercase tracking-[0.14em] text-white/32 lg:col-span-2 lg:text-right">
                  {content.processLabels[index]}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-b border-white/10 px-6 py-20 md:px-12 lg:px-24 md:py-28 lg:px-24">
        <div className="mx-auto max-w-[1400px]">
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/42">{content.eyebrow05}</p>
              <h2 className="mt-5 max-w-md text-3xl font-light leading-[1.25] tracking-[-0.01em] md:text-[32px]">
                {content.heading05}
              </h2>
            </div>
            <div className="lg:col-span-7 lg:col-start-6">
              <p className="text-xl font-light leading-[1.7] text-white/82 md:text-2xl">
                {content.body05}
              </p>
            </div>
          </div>

          <div className="mt-16 grid border-y border-white/10 md:grid-cols-3">
            {content.principles.map((principle, index) => (
              <div
                key={principle.number}
                className={`py-8 md:min-h-[260px] md:px-8 md:py-10 ${index > 0 ? 'border-t border-white/10 md:border-l md:border-t-0' : ''}`}
              >
                <span className="font-mono text-[10px] text-white/32">{principle.number}</span>
                <h3 className="mt-12 text-xl font-light tracking-[-0.01em]">{principle.title}</h3>
                <p className="mt-4 text-sm font-light leading-7 text-white/50">{principle.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="frequently-asked-questions" className="border-b border-white/10 px-6 py-20 md:px-12 lg:px-24 md:py-28 lg:px-24">
        <div className="mx-auto grid max-w-[1400px] gap-14 lg:grid-cols-12">
          <div className="lg:col-span-4 lg:sticky lg:top-28 lg:self-start">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/42">{content.eyebrow06}</p>
            <h2 className="mt-5 max-w-sm text-3xl font-light leading-[1.25] tracking-[-0.01em] md:text-[32px]">
              {content.heading06}
            </h2>
          </div>

          <div className="border-b border-white/10 lg:col-span-7 lg:col-start-6">
            {content.faq.map((entry, index) => (
              <details key={entry.question} className="group border-t border-white/10" open={index === 0}>
                <summary className="flex cursor-pointer list-none items-start gap-5 py-6 marker:content-none md:py-7">
                  <span className="pt-1 font-mono text-[9px] text-white/28">{String(index + 1).padStart(2, '0')}</span>
                  <span className="flex-1 text-base font-light leading-7 text-white/85 md:text-lg">{entry.question}</span>
                  <span className="text-xl font-light text-white/35 transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="max-w-3xl pb-7 pl-9 rtl:pl-0 rtl:pr-9 text-sm font-light leading-7 text-white/52 md:pb-9">{entry.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 md:px-12 lg:px-24 md:py-28 lg:px-24" data-about-cta="square">
        <div className="mx-auto grid max-w-[1400px] gap-10 border-y border-white/15 py-12 md:py-16 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/42">{content.eyebrow07}</p>
            <h2 className="mt-5 max-w-3xl text-3xl font-light leading-[1.25] tracking-[-0.01em] md:text-[36px]">
              {content.heading07}
            </h2>
          </div>
          <div className="flex flex-wrap gap-3 lg:col-span-5 lg:justify-end">
            <TechnicalFrameButton href="/free-diagnostic">
              <ArrowIcon /> {content.ctaStart}
            </TechnicalFrameButton>
            <TechnicalFrameButton href="/contact">
              {content.ctaTalk}
            </TechnicalFrameButton>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
