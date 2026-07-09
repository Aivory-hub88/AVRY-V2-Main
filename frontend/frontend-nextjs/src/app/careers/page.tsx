import type { Metadata } from "next"
import Link from "next/link"
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/Footer";
import { getVacancies, type Vacancy } from "@/lib/careers-api"
import { DEFAULT_OG_IMAGE } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Careers",
  description:
    "Join Aivory. Explore open roles and help build the platform that brings AI into everyday business operations.",
  alternates: { canonical: "/careers" },
  openGraph: {
    type: "website",
    title: "Careers at Aivory",
    description: "Explore open roles and join the team building AI for business.",
    url: "/careers",
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: { card: "summary_large_image", images: [DEFAULT_OG_IMAGE] },
}

/**
 * Extract a brief plain-text description from the rich editor JSONB output.
 * Handles both string descriptions and structured content objects.
 */
function extractBriefDescription(vacancy: Vacancy): string {
  if (vacancy.brief_description) {
    return vacancy.brief_description
  }

  const desc = vacancy.description
  if (typeof desc === "string") {
    return desc.length > 200 ? desc.slice(0, 200) + "…" : desc
  }

  // Handle JSONB rich content (array of blocks with text)
  if (Array.isArray(desc)) {
    const textParts: string[] = []
    for (const block of desc) {
      if (typeof block === "string") {
        textParts.push(block)
      } else if (block && typeof block === "object" && "text" in block) {
        textParts.push(String(block.text))
      } else if (block && typeof block === "object" && "content" in block && Array.isArray(block.content)) {
        for (const child of block.content) {
          if (child && typeof child === "object" && "text" in child) {
            textParts.push(String(child.text))
          }
        }
      }
    }
    const joined = textParts.join(" ")
    return joined.length > 200 ? joined.slice(0, 200) + "…" : joined
  }

  if (desc && typeof desc === "object" && "content" in desc && Array.isArray((desc as { content: unknown[] }).content)) {
    const textParts: string[] = []
    for (const block of (desc as { content: unknown[] }).content) {
      if (block && typeof block === "object" && "text" in block) {
        textParts.push(String((block as { text: string }).text))
      } else if (block && typeof block === "object" && "content" in block && Array.isArray((block as { content: unknown[] }).content)) {
        for (const child of (block as { content: unknown[] }).content) {
          if (child && typeof child === "object" && "text" in child) {
            textParts.push(String((child as { text: string }).text))
          }
        }
      }
    }
    const joined = textParts.join(" ")
    return joined.length > 200 ? joined.slice(0, 200) + "…" : joined
  }

  return ""
}

/**
 * Format employment type for display
 */
function formatEmploymentType(type: string | null): string {
  if (!type) return ""
  return type
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("-")
    .replace(/_/g, " ")
}

function VacancyCard({ vacancy }: { vacancy: Vacancy }) {
  const brief = extractBriefDescription(vacancy)

  return (
    <Link
      href={`/careers/${vacancy.id}`}
      className="block group rounded-xl border border-white/10 bg-white/[0.03] p-6 transition-all hover:border-[#c4c9b8]/40 hover:bg-white/[0.05]"
    >
      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-white group-hover:text-[#dfe2d8] transition-colors">
          {vacancy.title}
        </h2>

        <div className="flex flex-wrap gap-3 text-sm text-gray-200">
          {vacancy.department && (
            <span className="inline-flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              {vacancy.department}
            </span>
          )}
          {vacancy.location && (
            <span className="inline-flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {vacancy.location}
            </span>
          )}
          {vacancy.employment_type && (
            <span className="inline-flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatEmploymentType(vacancy.employment_type)}
            </span>
          )}
        </div>

        {brief && (
          <p className="text-gray-200 text-sm leading-relaxed mt-1">
            {brief}
          </p>
        )}

        <div className="mt-3 text-sm font-medium text-[#dfe2d8] group-hover:underline">
          View Details →
        </div>
      </div>
    </Link>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-16 px-6">
      <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-white/[0.05] flex items-center justify-center">
        <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-white mb-2">No Open Positions</h2>
      <p className="text-gray-200 max-w-md mx-auto">
        We don&apos;t have any open positions at the moment. Check back soon — we&apos;re always growing and new opportunities may open up.
      </p>
    </div>
  )
}


export const revalidate = 60; // SSG with ISR (1 min)

export default async function CareersPage() {
  let vacancies: Vacancy[] = [];
  let error: string | null = null;

  try {
    const data = await getVacancies();
    vacancies = data || [];
  } catch (err) {
    error = "Failed to load vacancies. Please try again later.";
    console.error("[CareersPage] Error fetching vacancies:", err);
  }

  return (
    <div className="flex min-h-screen flex-col font-manrope" style={{ background: '#050505' }}>
      <Navbar />
      <main className="flex-1 px-6 py-24">
        <div className="max-w-5xl mx-auto">
          <div className="mb-12 text-center mt-12">
            <h1 className="text-[36px] md:text-[56px] font-light mb-4 tracking-tight text-white/90" style={{ fontFamily: "'Manrope', sans-serif" }}>Careers at Aivory</h1>
            <p className="text-[#dfe2d8] text-lg max-w-2xl mx-auto font-light">
              Join our team and help shape the future of AI readiness. We&apos;re looking for passionate people to build the next generation of intelligent tools.
            </p>
          </div>

          {error && (
            <div className="mb-8 p-4 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-center">
              {error}
            </div>
          )}

          {vacancies.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {vacancies.map((vacancy) => (
                <VacancyCard key={vacancy.id} vacancy={vacancy} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}