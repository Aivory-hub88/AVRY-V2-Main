"use client"

import React, { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/Footer";
import { getVacancy, type Vacancy } from "@/lib/careers-api"

/**
 * Render a Rich_Editor JSONB block into HTML elements.
 * Supports blocks of type: heading, paragraph, list, code, quote, etc.
 */
function renderRichContentBlock(block: unknown, index: number): React.ReactNode {
  if (typeof block === "string") {
    return (
      <p key={index} className="text-gray-300 leading-relaxed mb-4">
        {block}
      </p>
    )
  }

  if (!block || typeof block !== "object") return null

  const b = block as Record<string, unknown>
  const type = b.type as string | undefined
  const text = extractBlockText(b)

  switch (type) {
    case "heading": {
      const level = (b.level as number) || 2
      const headingClasses: Record<number, string> = {
        1: "text-3xl font-bold text-white mb-4 mt-8",
        2: "text-2xl font-semibold text-white mb-3 mt-6",
        3: "text-xl font-semibold text-white mb-2 mt-5",
        4: "text-lg font-medium text-white mb-2 mt-4",
        5: "text-base font-medium text-white mb-2 mt-3",
        6: "text-sm font-medium text-white mb-2 mt-3",
      }
      const cls = headingClasses[level] || headingClasses[2]
      return React.createElement(
        `h${Math.min(level, 6)}`,
        { key: index, className: cls },
        text
      )
    }

    case "paragraph":
      return (
        <p key={index} className="text-gray-300 leading-relaxed mb-4">
          {text || renderInlineContent(b.content as unknown[])}
        </p>
      )

    case "list": {
      const items = (b.items as unknown[]) || (b.content as unknown[]) || []
      const isOrdered = b.style === "ordered" || b.ordered === true
      const ListTag = isOrdered ? "ol" : "ul"
      const listClass = isOrdered
        ? "list-decimal list-inside text-gray-300 mb-4 space-y-1 pl-2"
        : "list-disc list-inside text-gray-300 mb-4 space-y-1 pl-2"
      return (
        <ListTag key={index} className={listClass}>
          {items.map((item, i) => (
            <li key={i} className="leading-relaxed">
              {typeof item === "string" ? item : extractBlockText(item as Record<string, unknown>)}
            </li>
          ))}
        </ListTag>
      )
    }

    case "code":
    case "codeBlock":
      return (
        <pre key={index} className="bg-white/[0.05] border border-white/10 rounded-lg p-4 mb-4 overflow-x-auto">
          <code className="text-sm text-gray-300 font-mono">
            {text || (b.code as string) || ""}
          </code>
        </pre>
      )

    case "quote":
    case "blockquote":
      return (
        <blockquote key={index} className="border-l-4 border-[#07D197]/50 pl-4 mb-4 italic text-gray-400">
          {text}
        </blockquote>
      )

    case "image":
      return (
        <figure key={index} className="mb-4">
          <img
            src={b.url as string || b.src as string || ""}
            alt={(b.alt as string) || ""}
            className="rounded-lg max-w-full"
          />
          {typeof b.caption === "string" && (
            <figcaption className="text-sm text-gray-500 mt-2 text-center">
              {b.caption}
            </figcaption>
          )}
        </figure>
      )

    default:
      // Fallback: treat as paragraph if text content exists
      if (text) {
        return (
          <p key={index} className="text-gray-300 leading-relaxed mb-4">
            {text}
          </p>
        )
      }
      return null
  }
}

/**
 * Extract plain text from a rich content block.
 */
function extractBlockText(block: Record<string, unknown>): string {
  if (typeof block.text === "string") return block.text

  if (Array.isArray(block.content)) {
    return block.content
      .map((child) => {
        if (typeof child === "string") return child
        if (child && typeof child === "object" && "text" in child) {
          return String((child as { text: string }).text)
        }
        return ""
      })
      .join("")
  }

  return ""
}

/**
 * Render inline content array (for paragraph blocks with mixed content).
 */
function renderInlineContent(content: unknown[] | undefined): React.ReactNode {
  if (!Array.isArray(content)) return null

  return content.map((item, i) => {
    if (typeof item === "string") return <span key={i}>{item}</span>
    if (item && typeof item === "object") {
      const inline = item as Record<string, unknown>
      const text = (inline.text as string) || ""

      if (inline.bold) return <strong key={i} className="text-white font-semibold">{text}</strong>
      if (inline.italic) return <em key={i}>{text}</em>
      if (inline.code) return <code key={i} className="bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono">{text}</code>
      if (inline.link || inline.href) {
        return (
          <a key={i} href={(inline.link as string) || (inline.href as string)} className="text-[#07D197] hover:underline" target="_blank" rel="noopener noreferrer">
            {text}
          </a>
        )
      }
      return <span key={i}>{text}</span>
    }
    return null
  })
}

/**
 * Render the full Rich_Editor JSONB body as formatted HTML.
 */
function RichContentRenderer({ content }: { content: unknown }) {
  if (!content) return null

  // Handle string content
  if (typeof content === "string") {
    return (
      <div className="prose prose-invert max-w-none">
        <p className="text-gray-300 leading-relaxed">{content}</p>
      </div>
    )
  }

  // Handle array of blocks
  if (Array.isArray(content)) {
    return (
      <div className="prose prose-invert max-w-none">
        {content.map((block, index) => renderRichContentBlock(block, index))}
      </div>
    )
  }

  // Handle object with 'content' array (TipTap-style)
  if (typeof content === "object" && content !== null && "content" in content) {
    const doc = content as { content: unknown[] }
    if (Array.isArray(doc.content)) {
      return (
        <div className="prose prose-invert max-w-none">
          {doc.content.map((block, index) => renderRichContentBlock(block, index))}
        </div>
      )
    }
  }

  return null
}

/**
 * Format employment type for display (e.g., "full-time" → "Full-Time")
 */
function formatEmploymentType(type: string | null): string {
  if (!type) return ""
  return type
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("-")
    .replace(/_/g, " ")
}

function MetadataBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-sm text-gray-300">
      {icon}
      {label}
    </span>
  )
}

function NotFoundState() {
  return (
    <div className="flex min-h-screen flex-col font-manrope" style={{ background: "#050505" }}>
      <Navbar />
      <main className="flex-1 px-6 py-24">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-white/[0.05] flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Position Not Found</h1>
          <p className="text-gray-400 mb-8">
            This vacancy may have been closed or doesn&apos;t exist. Browse our current openings to find a role that fits.
          </p>
          <Link
            href="/careers"
            className="inline-flex items-center justify-center gap-3 text-white no-underline uppercase cursor-pointer transition-all duration-[250ms] border border-white/20 bg-black/60 hover:bg-white hover:text-black hover:border-white min-h-[44px]"
            style={{
              padding: '0.75rem 1.5rem',
              fontFamily: "'Manrope', sans-serif",
              fontWeight: 400,
              fontSize: '0.75rem',
              letterSpacing: '0.1em',
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Careers
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex min-h-screen flex-col font-manrope" style={{ background: "#050505" }}>
      <Navbar />
      <main className="flex-1 px-6 py-24">
        <div className="max-w-3xl mx-auto animate-pulse">
          <div className="h-4 bg-white/10 rounded w-32 mb-8" />
          <div className="h-10 bg-white/10 rounded w-3/4 mb-6" />
          <div className="flex gap-3 mb-8">
            <div className="h-8 bg-white/5 rounded-full w-28" />
            <div className="h-8 bg-white/5 rounded-full w-24" />
            <div className="h-8 bg-white/5 rounded-full w-32" />
          </div>
          <div className="space-y-3">
            <div className="h-4 bg-white/5 rounded w-full" />
            <div className="h-4 bg-white/5 rounded w-full" />
            <div className="h-4 bg-white/5 rounded w-5/6" />
            <div className="h-4 bg-white/5 rounded w-full" />
            <div className="h-4 bg-white/5 rounded w-2/3" />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default function VacancyDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [vacancy, setVacancy] = useState<Vacancy | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function fetchVacancy() {
      if (!id) return

      try {
        setLoading(true)
        setNotFound(false)
        const data = await getVacancy(id)
        if (!data) {
          setNotFound(true)
        } else {
          setVacancy(data)
        }
      } catch (err) {
        console.error("[VacancyDetailPage] Error fetching vacancy:", err)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }

    fetchVacancy()
  }, [id])

  if (loading) return <LoadingState />
  if (notFound || !vacancy) return <NotFoundState />

  return (
    <div className="flex min-h-screen flex-col font-manrope" style={{ background: "#050505" }}>
      <Navbar />
      <main className="flex-1 px-6 py-24">
        <div className="max-w-3xl mx-auto">
          {/* Back link */}
          <Link
            href="/careers"
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-[#07D197] transition-colors mb-8"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Careers
          </Link>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-6">
            {vacancy.title}
          </h1>

          {/* Metadata badges */}
          <div className="flex flex-wrap gap-3 mb-8">
            {vacancy.department && (
              <MetadataBadge
                icon={
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                }
                label={vacancy.department}
              />
            )}
            {vacancy.location && (
              <MetadataBadge
                icon={
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
                label={vacancy.location}
              />
            )}
            {vacancy.employment_type && (
              <MetadataBadge
                icon={
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                label={formatEmploymentType(vacancy.employment_type)}
              />
            )}
          </div>

          {/* Full job description */}
          <section className="mb-10">
            <RichContentRenderer content={vacancy.description} />
          </section>

          {/* Requirements section */}
          {vacancy.requirements != null && (
            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-white mb-4">Requirements</h2>
              <RichContentRenderer content={vacancy.requirements} />
            </section>
          )}

          {/* Apply button */}
          <div className="mt-12 pt-8 border-t border-white/10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-1">Interested in this role?</h3>
                <p className="text-gray-400 text-sm">
                  Submit your application and we&apos;ll review it shortly.
                </p>
              </div>
              <Link
                href={`/careers/${vacancy.id}/apply`}
                className="inline-flex items-center justify-center gap-3 text-white no-underline uppercase cursor-pointer transition-all duration-[250ms] border border-white/20 bg-black/60 hover:bg-white hover:text-black hover:border-white min-h-[44px]"
                style={{
                  padding: '0.75rem 1.5rem',
                  fontFamily: "'Manrope', sans-serif",
                  fontWeight: 400,
                  fontSize: '0.75rem',
                  letterSpacing: '0.1em',
                }}
              >
                Apply Now
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
