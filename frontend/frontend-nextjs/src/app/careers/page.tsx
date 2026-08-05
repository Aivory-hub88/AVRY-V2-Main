import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/Footer";
import { getVacancies, type Vacancy } from "@/lib/careers-api";
import {
  AIVORY_UK_URL,
  SITE_NAME,
  DEFAULT_OG_IMAGE,
  absoluteUrl,
  JsonLd,
  buildCareersListGraph,
} from "@/lib/seo";

export const revalidate = 60; // SSG with ISR (1 min)

const CAREERS_DESCRIPTION =
  "Open roles at Aivory. We hire people who prefer clear thinking over noise. Browse current openings in engineering, product, and operations.";

export async function generateMetadata(): Promise<Metadata> {
  const url = absoluteUrl("/careers");
  const title = "Careers — Aivory";

  return {
    title,
    description: CAREERS_DESCRIPTION,
    alternates: {
      canonical: url,
      languages: { en: url, id: url },
    },
    openGraph: {
      type: "website",
      title: `Careers — ${SITE_NAME}`,
      description: CAREERS_DESCRIPTION,
      url,
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: CAREERS_DESCRIPTION,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

/**
 * Extract a brief plain-text description from the rich editor JSONB output.
 * Handles both string descriptions and structured content objects.
 */
function truncate(value: string): string {
  const text = value.trim();
  return text.length > 200 ? text.slice(0, 200) + "…" : text;
}

/**
 * Collect plain text from a single rich-content block, covering the shapes the
 * careers service emits: `text`, a string `content`, or a nested inline array.
 */
function collectBlockText(block: unknown, parts: string[]): void {
  if (typeof block === "string") {
    parts.push(block);
    return;
  }

  if (!block || typeof block !== "object") return;

  const record = block as Record<string, unknown>;

  if (typeof record.text === "string") {
    parts.push(record.text);
    return;
  }

  if (typeof record.content === "string") {
    parts.push(record.content);
    return;
  }

  if (Array.isArray(record.content)) {
    for (const child of record.content) {
      collectBlockText(child, parts);
    }
    return;
  }

  if (Array.isArray(record.items)) {
    for (const item of record.items) {
      collectBlockText(item, parts);
    }
  }
}

function extractBriefDescription(vacancy: Vacancy): string {
  if (vacancy.brief_description) {
    return vacancy.brief_description;
  }

  const desc = vacancy.description;
  if (typeof desc === "string") {
    return truncate(desc);
  }

  // Handle JSONB rich content (array of blocks)
  if (Array.isArray(desc)) {
    const parts: string[] = [];
    for (const block of desc) {
      collectBlockText(block, parts);
    }
    return truncate(parts.join(" "));
  }

  if (desc && typeof desc === "object") {
    const record = desc as Record<string, unknown>;
    // TipTap-style `content` array, or the careers service `blocks` array
    const blocks = Array.isArray(record.content)
      ? record.content
      : Array.isArray(record.blocks)
        ? record.blocks
        : null;

    if (blocks) {
      const parts: string[] = [];
      for (const block of blocks) {
        collectBlockText(block, parts);
      }
      return truncate(parts.join(" "));
    }
  }

  return "";
}

/**
 * Format employment type for display
 */
function formatEmploymentType(type: string | null): string {
  if (!type) return "";
  return type
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("-")
    .replace(/_/g, " ");
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="none">
      <path d="M3 13 13 3M6 3h7v7" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function VacancyRow({ vacancy, index }: { vacancy: Vacancy; index: number }) {
  const brief = extractBriefDescription(vacancy);
  const meta = [
    vacancy.department,
    vacancy.location,
    formatEmploymentType(vacancy.employment_type),
  ].filter((value): value is string => Boolean(value));

  return (
    <Link
      href={`/careers/${vacancy.id}`}
      className="group grid gap-6 border-t border-black/25 py-8 transition-opacity hover:opacity-60 md:grid-cols-[150px_minmax(0,1fr)_minmax(280px,0.8fr)] md:items-start md:py-10"
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-black/55">
        {String(index + 1).padStart(2, "0")}
      </span>

      <div>
        <h2 className="text-[25px] font-light leading-[1.1] tracking-[-0.025em] text-[#11110f] md:text-[34px]">
          {vacancy.title}
        </h2>
        {meta.length > 0 && (
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-black/55">
            {meta.join(" / ")}
          </p>
        )}
      </div>

      <div className="max-w-xl">
        {brief && (
          <p className="text-[14px] font-light leading-[1.65] text-black/65 md:text-[15px]">
            {brief}
          </p>
        )}
        <span className="mt-6 inline-flex items-center gap-3 border-b border-black pb-1 text-[13px] font-light text-black">
          View role
          <ArrowIcon />
        </span>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="grid gap-6 border-y border-black/25 py-12 md:grid-cols-[150px_minmax(0,1fr)] md:py-16">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-black/55">
        No openings
      </span>
      <div className="max-w-xl">
        <h2 className="text-[25px] font-light leading-[1.1] tracking-[-0.025em] text-[#11110f] md:text-[34px]">
          There are no open positions right now.
        </h2>
        <p className="mt-6 text-[15px] font-light leading-[1.7] text-black/70 md:text-[16px]">
          We open roles as the work grows. If you believe your experience is a
          strong fit, tell us where you would make a difference and we will keep
          your details on file.
        </p>
        <Link
          href="/contact"
          className="mt-8 inline-flex items-center gap-3 border-b border-black pb-1 text-[13px] font-light text-black transition-opacity hover:opacity-55"
        >
          Introduce yourself
          <ArrowIcon />
        </Link>
      </div>
    </div>
  );
}

export default async function CareersPage() {
  const vacancies = await getVacancies();

  return (
    <div className="flex min-h-screen flex-col bg-[#050505] font-manrope">
      <JsonLd data={buildCareersListGraph(AIVORY_UK_URL, vacancies)} />
      <Navbar />

      <main
        className="flex-1 bg-[#efeee8] text-[#11110f]"
        style={{
          fontFamily: "'Manrope', sans-serif",
          fontWeight: 300,
          background:
            "linear-gradient(to bottom, #050505 0, #050505 64px, #efeee8 64px, #efeee8 100%)",
        }}
      >
        <section className="mx-auto max-w-[1480px] px-6 pb-16 pt-40 md:px-12 md:pb-24 md:pt-52">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/60">
            Careers
          </p>
          <h1 className="mt-5 max-w-[1180px] text-[52px] font-light leading-[0.95] tracking-[-0.055em] text-[#11110f] md:text-[82px] lg:text-[104px]">
            Find Your Future at Aivory
          </h1>
        </section>

        <section className="mx-auto max-w-[1480px] px-6 pb-24 md:px-12 md:pb-36">
          <div className="grid border-t border-black/25 pt-8 lg:grid-cols-12 lg:gap-12">
            <div className="flex flex-col pb-10 lg:col-span-5 lg:min-h-[430px] lg:pb-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/60">
                Why join us
              </p>
              <h2 className="mt-6 max-w-xl text-[32px] font-light leading-[1.05] tracking-[-0.035em] md:text-[46px]">
                We look for people who prefer clear thinking over noise.
              </h2>
              <p className="mt-8 max-w-md text-[15px] font-light leading-[1.7] text-black/70 md:text-[16px] lg:mt-auto">
                Our work sits close to how businesses actually operate, which
                means the people we hire need judgement, curiosity, and the
                patience to understand a problem before solving it. In return
                you get real ownership, direct access to decisions, and
                colleagues who care about doing the work properly.
              </p>
            </div>

            <figure className="lg:col-span-7">
              <div className="aspect-[16/9] overflow-hidden bg-[#11110f]">
                <img
                  src="/images/careers/five-people-renaissance-clothing.webp"
                  alt="Five people in Renaissance clothing gathered together in a red and navy editorial illustration"
                  width={2752}
                  height={1536}
                  className="h-full w-full object-cover"
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                />
              </div>
              <figcaption className="mt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-black/50">
                The people behind the work
              </figcaption>
            </figure>
          </div>
        </section>

        <section aria-labelledby="open-roles-heading">
          <div className="mx-auto max-w-[1480px] px-6 pb-8 md:px-12 md:pb-12">
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.18em] text-black/60">
              Open roles
            </p>
            <h2
              id="open-roles-heading"
              className="text-[34px] font-light tracking-[-0.035em] md:text-[52px]"
            >
              Current openings.
            </h2>
          </div>

          <div className="mx-auto max-w-[1480px] px-6 pb-24 md:px-12 md:pb-36">
            {vacancies.length === 0 ? (
              <EmptyState />
            ) : (
              vacancies.map((vacancy, index) => (
                <VacancyRow key={vacancy.id} vacancy={vacancy} index={index} />
              ))
            )}
          </div>
        </section>

        <section className="mx-auto max-w-[1480px] px-6 pb-24 md:px-12 md:pb-36">
          <div className="grid border-y border-black/25 py-10 md:grid-cols-[150px_minmax(0,1fr)_180px] md:items-center md:py-14">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/60">
              Start a conversation
            </p>
            <h2 className="mt-6 max-w-3xl text-[30px] font-light leading-[1.08] tracking-[-0.03em] md:mt-0 md:text-[42px]">
              Not sure which role fits? Tell us how you work.
            </h2>
            <Link
              href="/contact"
              className="mt-8 inline-flex w-fit items-center gap-3 border-b border-black pb-1 text-[13px] font-light text-black transition-opacity hover:opacity-55 md:mt-0 md:justify-self-end"
            >
              Talk to us
              <ArrowIcon />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}