import type { Metadata } from 'next';
import Link from 'next/link';
import { TechnicalFrameButton } from '@/components/ui/TechnicalFrameButton';
import Navbar from '@/components/home/Navbar';
import Footer from '@/components/Footer';
import { AboutArchitecturalSignal } from '@/components/about/AboutArchitecturalSignal';
import { LocaleSuggestionBanner } from '@/components/locale/LocaleSuggestionBanner';
import { LocaleSwitcher } from '@/components/locale/LocaleSwitcher';
import { buildLanguageAlternates } from '@/lib/localeAlternates';
import {
  ASSESSMENT_STEPS,
  FAQ_ENTITIES,
  JsonLd,
  buildAboutPageGraph,
  createBreadcrumbList,
  absoluteUrl,
  siteUrlFromHeaders,
} from '@/lib/seo';

export const metadata: Metadata = {
  title: 'About Aivory and Founder Irfan Reichmann',
  description:
    'Learn about Aivory, founder Irfan Reichmann, and the operationally grounded approach behind governed AI business transformation.',
  alternates: {
    canonical: '/about',
    languages: buildLanguageAlternates('about'),
  },
  openGraph: {
    title: 'About Aivory and Founder Irfan Reichmann',
    description:
      'Practical AI adoption starts with operational clarity, governed systems, and an honest understanding of how organisations work.',
    url: '/about',
  },
};

const PROCESS_LABELS = [
  'Understand the operation',
  'Establish the baseline',
  'Design the system',
  'Sequence the change',
] as const;

const OPERATING_PRINCIPLES = [
  {
    number: '01',
    title: 'Clarity before technology',
    text: 'We begin with workflows, decisions, data, constraints, and people. Technology follows the operating reality—not the other way around.',
  },
  {
    number: '02',
    title: 'Governance by design',
    text: 'Controls, accountability, and human oversight are designed into the system from the start rather than added after deployment.',
  },
  {
    number: '03',
    title: 'Progress that can be measured',
    text: 'Every transformation should connect to an operational outcome: less friction, better decisions, stronger resilience, or measurable capacity.',
  },
] as const;

/**
 * Keeps the first 64px dark so the transparent, white-text Navbar stays
 * legible, then hands over to the ivory editorial canvas shared with Careers,
 * Company and Product.
 */
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

export default function AboutPage() {
  const siteUrl = siteUrlFromHeaders();

  return (
    <main
      className="min-h-screen overflow-hidden bg-[#030408] font-manrope text-white selection:bg-white selection:text-black"
      data-about-layout="editorial"
    >
      <JsonLd data={buildAboutPageGraph(siteUrl)} />
      <JsonLd
        data={createBreadcrumbList([
          { name: 'Home', item: absoluteUrl('/') },
          { name: 'About', item: absoluteUrl('/about') },
        ])}
      />
      <Navbar />
      <LocaleSwitcher currentLocale="en" path="about" />
      <LocaleSuggestionBanner currentLocale="en" path="about" />

      <section
        className="text-[#11110f]"
        style={{ fontWeight: 300, background: ABOUT_HERO_BACKGROUND }}
      >
        <div className="mx-auto max-w-[1480px] px-6 pb-16 pt-40 md:px-12 lg:px-24 md:pb-24 md:pt-52">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/60">About Aivory / 01</p>
          <h1 className="mt-5 max-w-[1180px] text-[44px] font-light leading-[1.15] tracking-[-0.02em] text-[#11110f] md:text-[64px] lg:text-[80px]">
            Clarity first.<br />Intelligence follows.
          </h1>
        </div>

        <div className="mx-auto max-w-[1480px] px-6 pb-20 md:px-12 lg:px-24 md:pb-28">
          <div className="grid border-t border-black/25 pt-8 lg:grid-cols-12 lg:gap-12">
            <div className="pb-8 lg:col-span-4 lg:pb-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/60">What we do</p>
            </div>
            <div className="lg:col-span-8">
              <p className="max-w-2xl text-[16px] font-light leading-[1.7] text-black/70 md:text-[17px]">
                Aivory helps organisations understand how work actually moves, design the right transformation architecture, and deploy governed AI systems without false starts.
              </p>
              <div className="mt-10 flex flex-wrap gap-x-10 gap-y-5">
                <Link
                  href="/free-diagnostic"
                  className="inline-flex items-center gap-3 border-b border-black pb-1 text-[13px] font-light text-black transition-opacity hover:opacity-55"
                >
                  Start assessment
                  <ArrowIcon />
                </Link>
                <Link
                  href="/company"
                  className="inline-flex items-center gap-3 border-b border-black pb-1 text-[13px] font-light text-black transition-opacity hover:opacity-55"
                >
                  Company overview
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
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/42">Why we&apos;re here / 02</p>
            <h2 className="mt-5 max-w-sm text-3xl font-light leading-[1.15] tracking-[-0.025em] md:text-[40px]">
              AI should begin with the business—not the tool.
            </h2>
          </div>

          <div className="space-y-8 lg:col-span-7 lg:col-start-6">
            <p className="text-xl font-light leading-[1.55] tracking-[-0.015em] text-white/88 md:text-2xl">
              Most organisations are under pressure to adopt AI before they have a clear view of their own operations. The result is often fragmented tooling, unclear ownership, and automation without a system behind it.
            </p>
            <div className="grid gap-7 border-t border-white/10 pt-8 text-[15px] font-light leading-7 text-white/58 md:grid-cols-2">
              <p>
                Aivory was created to reverse that sequence. We establish the operational baseline first: how decisions are made, where work slows down, which data can be trusted, and where change can create measurable value.
              </p>
              <p>
                That clarity becomes the foundation for transformation blueprints, intelligent workflows, governed agents, and resilient operating systems designed around the organisation itself.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 px-6 py-20 md:px-12 lg:px-24 md:py-28 lg:px-24">
        <div className="mx-auto max-w-[1400px]">
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/42">Founder / 03</p>
              <div className="mt-10 border-t border-white/10 pt-6" data-founder-profile="linkedin-only">
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/40">Founder &amp; CEO</p>
                <h2 className="mt-3 text-3xl font-light tracking-[-0.025em]">Irfan Reichmann</h2>
                <a
                  href="https://www.linkedin.com/in/irfan-reichmann/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-7 inline-flex items-center gap-3 border-b border-white/30 pb-1 text-sm text-white/70 transition-colors hover:border-white hover:text-white"
                >
                  LinkedIn profile <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>

            <div className="lg:col-span-7 lg:col-start-6">
              <blockquote className="max-w-4xl text-3xl font-light leading-[1.3] tracking-[-0.025em] text-white/92 md:text-[44px]">
                “Practical AI adoption starts with operational clarity—not with another disconnected tool.”
              </blockquote>
              <div className="mt-10 grid gap-7 border-t border-white/10 pt-8 text-[15px] font-light leading-7 text-white/58 md:grid-cols-2">
                <p>
                  Irfan Reichmann founded Aivory to make business transformation structured, measurable, and governed from the outset.
                </p>
                <p>
                  Aivory is a business transformation and AI operations platform, distinct from other companies that use a similar name in unrelated categories.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-b border-white/10 px-6 py-20 md:px-12 lg:px-24 md:py-28 lg:px-24">
        <div className="mx-auto max-w-[1400px]">
          <div className="grid gap-10 pb-14 lg:grid-cols-12 lg:pb-20">
            <div className="lg:col-span-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/42">What we do / 04</p>
            </div>
            <div className="lg:col-span-7 lg:col-start-6">
              <h2 className="text-3xl font-light leading-[1.15] tracking-[-0.025em] md:text-[44px]">
                From operational reality to governed execution.
              </h2>
              <p className="mt-6 max-w-2xl text-[15px] font-light leading-7 text-white/55">
                A structured path turns business constraints into an implementation-ready transformation architecture.
              </p>
            </div>
          </div>

          <ol className="border-b border-white/10">
            {ASSESSMENT_STEPS.map((step, index) => (
              <li
                key={step.name}
                className="group grid gap-5 border-t border-white/10 py-8 transition-colors hover:bg-white/[0.018] md:py-10 lg:grid-cols-12"
              >
                <span className="font-mono text-[10px] text-white/35 lg:col-span-1">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="text-xl font-light tracking-[-0.015em] text-white/90 md:text-2xl lg:col-span-3">
                  {step.name}
                </h3>
                <p className="max-w-2xl text-sm font-light leading-7 text-white/52 lg:col-span-5 lg:col-start-6">
                  {step.text}
                </p>
                <p className="self-start text-[10px] uppercase tracking-[0.14em] text-white/32 lg:col-span-2 lg:text-right">
                  {PROCESS_LABELS[index]}
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
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/42">Where we&apos;re going / 05</p>
              <h2 className="mt-5 max-w-md text-3xl font-light leading-[1.15] tracking-[-0.025em] md:text-[40px]">
                Towards operations that can understand, adapt, and improve.
              </h2>
            </div>
            <div className="lg:col-span-7 lg:col-start-6">
              <p className="text-xl font-light leading-[1.55] text-white/82 md:text-2xl">
                The goal is not automation for its own sake. It is an organisation with a clearer operating model, better institutional memory, and governed intelligence that compounds over time.
              </p>
            </div>
          </div>

          <div className="mt-16 grid border-y border-white/10 md:grid-cols-3">
            {OPERATING_PRINCIPLES.map((principle, index) => (
              <div
                key={principle.number}
                className={`py-8 md:min-h-[260px] md:px-8 md:py-10 ${index > 0 ? 'border-t border-white/10 md:border-l md:border-t-0' : ''}`}
              >
                <span className="font-mono text-[10px] text-white/32">{principle.number}</span>
                <h3 className="mt-12 text-xl font-light tracking-[-0.015em]">{principle.title}</h3>
                <p className="mt-4 text-sm font-light leading-7 text-white/50">{principle.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="frequently-asked-questions" className="border-b border-white/10 px-6 py-20 md:px-12 lg:px-24 md:py-28 lg:px-24">
        <div className="mx-auto grid max-w-[1400px] gap-14 lg:grid-cols-12">
          <div className="lg:col-span-4 lg:sticky lg:top-28 lg:self-start">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/42">Questions / 06</p>
            <h2 className="mt-5 max-w-sm text-3xl font-light leading-[1.15] tracking-[-0.025em] md:text-[40px]">
              Clear answers about Aivory.
            </h2>
          </div>

          <div className="border-b border-white/10 lg:col-span-7 lg:col-start-6">
            {FAQ_ENTITIES.map((entry, index) => (
              <details key={entry.question} className="group border-t border-white/10" open={index === 0}>
                <summary className="flex min-h-[60px] cursor-pointer list-none items-center gap-4 py-4 marker:content-none">
                  <span className="font-mono text-[10px] text-white/28">{String(index + 1).padStart(2, '0')}</span>
                  <span className="flex-1 text-sm font-light leading-snug text-white/85">{entry.question}</span>
                  <span className="text-lg font-light text-white/35 transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="max-w-3xl pb-7 pl-9 text-sm font-light leading-6 text-white/52">{entry.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 md:px-12 lg:px-24 md:py-28 lg:px-24" data-about-cta="square">
        <div className="mx-auto grid max-w-[1400px] gap-10 border-y border-white/15 py-12 md:py-16 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/42">Start with clarity / 07</p>
            <h2 className="mt-5 max-w-3xl text-3xl font-light leading-[1.15] tracking-[-0.025em] md:text-[44px]">
              Make AI make sense for your operations.
            </h2>
          </div>
          <div className="flex flex-wrap gap-3 lg:col-span-5 lg:justify-end">
            <TechnicalFrameButton href="/free-diagnostic">
              <ArrowIcon /> Start assessment
            </TechnicalFrameButton>
            <TechnicalFrameButton href="/contact">
              Talk to us
            </TechnicalFrameButton>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
