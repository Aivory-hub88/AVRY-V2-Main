import type { Metadata } from "next"
import Link from "next/link"
import Navbar from "@/components/home/Navbar"
import Footer from "@/components/Footer"
import {
  GLOSSARY_ENTRIES,
  JsonLd,
  absoluteUrl,
  buildGlossaryPageGraph,
  createBreadcrumbList,
  siteUrlFromHeaders,
} from "@/lib/seo"

export const metadata: Metadata = {
  title: "AI Operations Glossary",
  description:
    'Plain-English definitions for AI operations terms: agentic AI, autonomous agents, readiness assessments and orchestration.',
  alternates: {
    canonical: "/glossary",
  },
  openGraph: {
    type: "website",
    title: "AI Operations Glossary | Aivory",
    description:
      "Plain-English definitions for the terms that matter in AI operations: agentic AI platforms, autonomous agents, AI readiness assessments, orchestration, and governed deployment.",
    url: "/glossary",
  },
  twitter: { card: "summary_large_image" },
}

function ArticleArrow() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="none">
      <path d="M3 13 13 3M6 3h7v7" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}

function GlossaryRow({ entry, index }: { entry: (typeof GLOSSARY_ENTRIES)[number]; index: number }) {
  return (
    <article id={entry.term.toLowerCase().replace(/[^a-z0-9]+/g, "-")} className="border-t border-black/25">
      <div className="grid gap-4 py-7 md:grid-cols-[64px_minmax(0,1fr)] md:items-start md:py-9">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-black/45">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="max-w-3xl">
          <h3 className="text-[22px] font-light leading-[1.15] tracking-[-0.02em] text-[#11110f] md:text-[26px]">
            {entry.term}
          </h3>
          <p className="mt-4 max-w-2xl text-[15px] font-light leading-[1.7] text-black/65">
            {entry.definition}
          </p>
          {entry.href && (
            <Link
              href={entry.href}
              className="group mt-5 inline-flex items-center gap-3 border-b border-black pb-1 text-[12px] font-light text-black transition-opacity hover:opacity-55"
            >
              Read more
              <ArticleArrow />
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}

export default function GlossaryPage() {
  const siteUrl = siteUrlFromHeaders()

  return (
    <div className="flex min-h-screen flex-col bg-[#050505] font-manrope">
      <Navbar />

      <main
        className="flex-1 bg-[#efeee8] text-[#11110f]"
        style={{
          fontFamily: "var(--font-manrope), 'Manrope', sans-serif",
          fontWeight: 300,
          background: "linear-gradient(to bottom, #050505 0, #050505 64px, #efeee8 64px, #efeee8 100%)",
        }}
      >
        <JsonLd data={buildGlossaryPageGraph(siteUrl)} />
        <JsonLd
          data={createBreadcrumbList([
            { name: "Home", item: absoluteUrl("/") },
            { name: "Glossary", item: absoluteUrl("/glossary") },
          ])}
        />

        <section className="mx-auto max-w-[1480px] px-6 pb-16 pt-40 md:px-12 lg:px-24 md:pb-20 md:pt-52">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/60">
            Reference
          </p>
          <h1 className="mt-5 max-w-4xl text-[44px] font-light leading-[1.15] tracking-[-0.02em] md:text-[64px] lg:text-[80px]">
            AI Operations Glossary
          </h1>
          <p className="mt-8 max-w-xl text-[16px] font-light leading-[1.7] text-black/70 md:text-[17px]">
            Plain-English definitions for the terms that matter in AI operations, from agentic platforms and agent orchestration to readiness assessments and governed deployment.
          </p>
        </section>

        <section aria-labelledby="glossary-terms-heading">
          <div className="mx-auto max-w-[1480px] px-6 pb-24 pt-4 md:px-12 lg:px-24 md:pb-36">
            {GLOSSARY_ENTRIES.map((entry, index) => (
              <GlossaryRow key={entry.term} entry={entry} index={index} />
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
