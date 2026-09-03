import Link from "next/link";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/Footer";
import { LocaleSuggestionBanner } from "@/components/locale/LocaleSuggestionBanner";
import { LocaleSwitcher } from "@/components/locale/LocaleSwitcher";
import type { SiteLocale } from "@/components/locale/LocaleSuggestionBanner";

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="none">
      <path d="M3 13 13 3M6 3h7v7" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export interface CompanyContent {
  locale: SiteLocale;
  eyebrow: string;
  heroHeading: string;
  aboutLabel: string;
  aboutHeading: string;
  aboutBody1: string;
  aboutBody2: string;
  imageAlt: string;
  imageCaption: string;
  whyExistLabel: string;
  whyExistHeading: string;
  whyExistBody: string;
  howWeWorkLabel: string;
  howWeWorkHeading: string;
  waysOfWorking: readonly { number: string; title: string; description: string }[];
  missionLabel: string;
  missionHeading: string;
  pointOfViewLabel: string;
  pointOfViewHeading: string;
  beliefsLabel: string;
  beliefsHeading: string;
  principles: readonly { title: string; description: string }[];
  startConversationLabel: string;
  startConversationHeading: string;
  talkToUsCta: string;
}

/** See AboutPageTemplate for why this exists -- one structure, per-language content. */
export function CompanyPageTemplate({ content }: { content: CompanyContent }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#050505]">
      <Navbar />
      <LocaleSwitcher currentLocale={content.locale} path="company" />
      <LocaleSuggestionBanner currentLocale={content.locale} path="company" />

      <main
        className="flex-1 bg-[#efeee8] text-[#11110f]"
        style={{
          fontWeight: 300,
          background:
            "linear-gradient(to bottom, #050505 0, #050505 64px, #efeee8 64px, #efeee8 100%)",
        }}
      >
        <section className="mx-auto max-w-[1480px] px-6 pb-16 pt-40 md:px-12 lg:px-24 md:pb-24 md:pt-52">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/60">{content.eyebrow}</p>
          <h1 className="mt-5 max-w-[1180px] text-[40px] font-light leading-[1.2] tracking-[-0.015em] text-[#11110f] md:text-[58px] lg:text-[72px]">
            {content.heroHeading}
          </h1>
        </section>

        <section className="mx-auto max-w-[1480px] px-6 pb-24 md:px-12 lg:px-24 md:pb-32">
          <div className="grid border-t border-black/25 pt-8 lg:grid-cols-12 lg:gap-12">
            <div className="flex flex-col pb-10 lg:col-span-5 lg:min-h-[430px] lg:pb-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/60">{content.aboutLabel}</p>
              <h2 className="mt-6 max-w-xl text-[26px] font-light leading-[1.3] tracking-[-0.01em] text-[#11110f] md:text-[36px]">
                {content.aboutHeading}
              </h2>
              <div className="mt-8 max-w-md space-y-5 text-[15px] font-light leading-[1.8] text-black/70 md:text-[16px] lg:mt-auto">
                <p>{content.aboutBody1}</p>
                <p>{content.aboutBody2}</p>
              </div>
            </div>

            <figure className="lg:col-span-7">
              <div className="aspect-[16/9] overflow-hidden bg-[#11110f]">
                <img
                  src="/images/Company/five-people-renaissance-meeting.webp"
                  alt={content.imageAlt}
                  width={1400}
                  height={781}
                  className="h-full w-full object-cover"
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                />
              </div>
              <figcaption className="mt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-black/50">
                {content.imageCaption}
              </figcaption>
            </figure>
          </div>
        </section>

        <section className="mx-auto max-w-[1480px] px-6 pb-24 md:px-12 lg:px-24 md:pb-36">
          <div className="grid border-t border-black/25 pt-8 lg:grid-cols-12 lg:gap-12">
            <div className="pb-10 lg:col-span-4 lg:pb-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/60">{content.whyExistLabel}</p>
            </div>
            <div className="lg:col-span-8">
              <h2 className="max-w-4xl text-[26px] font-light leading-[1.3] tracking-[-0.01em] md:text-[38px]">
                {content.whyExistHeading}
              </h2>
              <p className="mt-8 max-w-2xl text-[16px] font-light leading-[1.8] text-black/70 md:text-[17px]">
                {content.whyExistBody}
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="way-of-working-heading">
          <div className="mx-auto max-w-[1480px] px-6 pb-8 md:px-12 lg:px-24 md:pb-12">
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.18em] text-black/60">{content.howWeWorkLabel}</p>
            <h2
              id="way-of-working-heading"
              className="text-[26px] font-light tracking-[-0.01em] md:text-[38px]"
            >
              {content.howWeWorkHeading}
            </h2>
          </div>

          <div className="mx-auto max-w-[1480px] px-6 pb-24 md:px-12 lg:px-24 md:pb-36">
            {content.waysOfWorking.map((item) => (
              <article
                key={item.number}
                className="grid gap-6 border-t border-black/25 py-8 md:grid-cols-[150px_minmax(0,1fr)_minmax(280px,0.8fr)] md:items-start md:py-10"
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-black/55">
                  {item.number}
                </span>
                <h3 className="text-[22px] font-light leading-[1.2] tracking-[-0.005em] md:text-[30px]">
                  {item.title}
                </h3>
                <p className="max-w-xl text-[14px] font-light leading-[1.75] text-black/65 md:text-[15px]">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[1480px] px-6 pb-24 md:px-12 lg:px-24 md:pb-36">
          <div className="grid border-t border-black/25 lg:grid-cols-2">
            <article className="border-b border-black/25 py-10 lg:border-b-0 lg:border-r rtl:lg:border-r-0 rtl:lg:border-l lg:py-14 lg:pr-12 rtl:lg:pr-0 rtl:lg:pl-12">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/60">{content.missionLabel}</p>
              <h2 className="mt-8 max-w-xl text-[24px] font-light leading-[1.3] tracking-[-0.01em] md:text-[34px]">
                {content.missionHeading}
              </h2>
            </article>

            <article className="py-10 lg:py-14 lg:pl-12 rtl:lg:pl-0 rtl:lg:pr-12">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/60">{content.pointOfViewLabel}</p>
              <h2 className="mt-8 max-w-xl text-[24px] font-light leading-[1.3] tracking-[-0.01em] md:text-[34px]">
                {content.pointOfViewHeading}
              </h2>
            </article>
          </div>
        </section>

        <section aria-labelledby="principles-heading">
          <div className="mx-auto max-w-[1480px] px-6 pb-8 md:px-12 lg:px-24 md:pb-12">
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.18em] text-black/60">{content.beliefsLabel}</p>
            <h2
              id="principles-heading"
              className="text-[26px] font-light tracking-[-0.01em] md:text-[38px]"
            >
              {content.beliefsHeading}
            </h2>
          </div>

          <div className="mx-auto max-w-[1480px] px-6 pb-24 md:px-12 lg:px-24 md:pb-36">
            {content.principles.map((principle, index) => (
              <article
                key={principle.title}
                className="grid gap-6 border-t border-black/25 py-8 md:grid-cols-[150px_minmax(0,1fr)_minmax(280px,0.8fr)] md:items-start md:py-10"
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-black/55">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="text-[22px] font-light leading-[1.2] tracking-[-0.005em] md:text-[30px]">
                  {principle.title}
                </h3>
                <p className="max-w-xl text-[14px] font-light leading-[1.75] text-black/65 md:text-[15px]">
                  {principle.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[1480px] px-6 pb-24 md:px-12 lg:px-24 md:pb-36">
          <div className="grid border-y border-black/25 py-10 md:grid-cols-[150px_minmax(0,1fr)_180px] md:items-center md:py-14">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/60">{content.startConversationLabel}</p>
            <h2 className="mt-6 max-w-3xl text-[24px] font-light leading-[1.3] tracking-[-0.01em] md:mt-0 md:text-[34px]">
              {content.startConversationHeading}
            </h2>
            <Link
              href="/contact"
              className="mt-8 inline-flex w-fit items-center gap-3 border-b border-black pb-1 text-[13px] font-light text-black transition-opacity hover:opacity-55 md:mt-0 md:justify-self-end"
            >
              {content.talkToUsCta}
              <ArrowIcon />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
