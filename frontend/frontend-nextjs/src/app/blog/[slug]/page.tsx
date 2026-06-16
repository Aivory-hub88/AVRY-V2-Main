"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/Footer";
import { getBlogPost, BlogPostDetail, BlogContentBlock } from "@/lib/blog-api"

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

/**
 * Renders a single Rich Editor content block as HTML.
 */
function ContentBlock({ block, isRedacted }: { block: BlogContentBlock; isRedacted: boolean }) {
  if (isRedacted) {
    return (
      <div
        className="my-4 rounded-lg bg-white/5 border border-white/10 px-5 py-4 flex items-center gap-3"
        role="note"
        aria-label="Content redacted"
      >
        <div className="w-1 h-8 bg-gray-500 rounded-full" />
        <span className="text-gray-500 text-sm italic">Content redacted</span>
      </div>
    )
  }

  switch (block.type) {
    case "heading": {
      const level = block.level || 2
      const sizeClasses: Record<number, string> = {
        1: "text-3xl font-bold",
        2: "text-2xl font-bold",
        3: "text-xl font-semibold",
        4: "text-lg font-semibold",
        5: "text-base font-medium",
        6: "text-sm font-medium",
      }
      const className = `${sizeClasses[level] || sizeClasses[2]} text-white mt-8 mb-3`
      if (level === 1) return <h1 className={className}>{block.text}</h1>
      if (level === 3) return <h3 className={className}>{block.text}</h3>
      if (level === 4) return <h4 className={className}>{block.text}</h4>
      if (level === 5) return <h5 className={className}>{block.text}</h5>
      if (level === 6) return <h6 className={className}>{block.text}</h6>
      return <h2 className={className}>{block.text}</h2>
    }

    case "paragraph":
      return (
        <p
          className="text-gray-300 leading-relaxed mb-4"
          dangerouslySetInnerHTML={{ __html: formatInlineMarkup(block.text || "") }}
        />
      )

    case "code": {
      return (
        <pre className="my-4 rounded-lg bg-[#0a0a0a] border border-white/10 p-4 overflow-x-auto">
          <code className="text-sm text-gray-300 font-mono whitespace-pre-wrap">
            {block.text}
          </code>
        </pre>
      )
    }

    case "list": {
      const items = block.items || []
      const isOrdered = block.style === "ordered"
      const ListTag = isOrdered ? "ol" : "ul"
      const listClass = isOrdered
        ? "list-decimal list-inside mb-4 space-y-1"
        : "list-disc list-inside mb-4 space-y-1"
      return (
        <ListTag className={`${listClass} text-gray-300`}>
          {items.map((item, idx) => (
            <li key={idx} dangerouslySetInnerHTML={{ __html: formatInlineMarkup(item) }} />
          ))}
        </ListTag>
      )
    }

    case "image":
      return (
        <figure className="my-6">
          <img
            src={block.url || ""}
            alt={block.alt || ""}
            className="w-full rounded-lg border border-white/10"
          />
          {block.alt && (
            <figcaption className="text-center text-xs text-gray-500 mt-2">
              {block.alt}
            </figcaption>
          )}
        </figure>
      )

    case "link":
      return (
        <p className="mb-4">
          <a
            href={block.href || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#07D197] underline hover:text-[#06B882] transition-colors"
          >
            {block.text || block.href}
          </a>
        </p>
      )

    default:
      // Fallback: render text as paragraph if available
      if (block.text) {
        return (
          <p
            className="text-gray-300 leading-relaxed mb-4"
            dangerouslySetInnerHTML={{ __html: formatInlineMarkup(block.text) }}
          />
        )
      }
      return null
  }
}

/**
 * Converts basic inline markup (bold, italic) into HTML spans.
 * Supports **bold** and *italic* / _italic_ patterns.
 */
function formatInlineMarkup(text: string): string {
  let html = text
  // Escape potential XSS - minimal sanitization for display
  html = html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  // Bold: **text**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
  // Italic: *text* or _text_
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>")
  html = html.replace(/_(.+?)_/g, "<em>$1</em>")
  // Inline code: `text`
  html = html.replace(
    /`(.+?)`/g,
    '<code class="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-sm font-mono text-[#07D197]">$1</code>'
  )
  return html
}

function LoadingSkeleton() {
  return (
    <div className="max-w-3xl mx-auto animate-pulse">
      <div className="h-10 bg-white/10 rounded w-3/4 mb-4" />
      <div className="flex items-center gap-4 mb-8">
        <div className="h-4 bg-white/5 rounded w-24" />
        <div className="h-4 bg-white/5 rounded w-32" />
      </div>
      <div className="space-y-4">
        <div className="h-4 bg-white/5 rounded w-full" />
        <div className="h-4 bg-white/5 rounded w-5/6" />
        <div className="h-4 bg-white/5 rounded w-4/6" />
        <div className="h-4 bg-white/5 rounded w-full" />
        <div className="h-4 bg-white/5 rounded w-3/4" />
      </div>
    </div>
  )
}

function NotFoundState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <svg
        className="w-16 h-16 text-white/20 mb-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1}
          d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <h2 className="text-2xl font-semibold text-white mb-3">Post not found</h2>
      <p className="text-gray-400 mb-6 max-w-sm">
        The blog post you&apos;re looking for doesn&apos;t exist or has been removed.
      </p>
      <Link
        href="/blog"
        className="inline-flex items-center justify-center gap-3 text-white no-underline uppercase cursor-pointer transition-all duration-[250ms] border border-white/20 bg-black/60 hover:bg-white hover:text-black hover:border-white min-h-[44px]"
        style={{
          padding: '0.75rem 1.5rem',
          fontFamily: "'Manrope', sans-serif",
          fontWeight: 400,
          fontSize: '0.75rem',
          letterSpacing: '0.1em',
        }}
      >
        ← Back to Blog
      </Link>
    </div>
  )
}

export default function BlogPostPage() {
  const params = useParams()
  const slug = params.slug as string

  const [post, setPost] = useState<BlogPostDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return

    async function fetchPost() {
      setLoading(true)
      setError(null)
      setNotFound(false)
      try {
        const data = await getBlogPost(slug)
        if (data === null) {
          setNotFound(true)
        } else {
          setPost(data)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load blog post")
      } finally {
        setLoading(false)
      }
    }

    fetchPost()
  }, [slug])

  return (
    <div className="flex min-h-screen flex-col font-manrope" style={{ background: "#050505" }}>
      <Navbar />

      <main className="flex-1 px-6 py-24">
        {loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <Link
              href="/blog"
              className="inline-flex items-center justify-center gap-3 text-white no-underline uppercase cursor-pointer transition-all duration-[250ms] border border-white/20 bg-black/60 hover:bg-white hover:text-black hover:border-white min-h-[44px]"
              style={{
                padding: '0.75rem 1.5rem',
                fontFamily: "'Manrope', sans-serif",
                fontWeight: 400,
                fontSize: '0.75rem',
                letterSpacing: '0.1em',
              }}
            >
              ← Back to Blog
            </Link>
          </div>
        ) : notFound ? (
          <NotFoundState />
        ) : post ? (
          <article className="max-w-3xl mx-auto">
            {/* Back link */}
            <Link
              href="/blog"
              className="inline-flex items-center text-sm text-gray-400 hover:text-[#07D197] transition-colors mb-8"
            >
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Blog
            </Link>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {post.title}
            </h1>

            {/* Meta */}
            <div className="flex items-center gap-4 text-sm text-gray-400 mb-8 pb-6 border-b border-white/10">
              <span className="font-medium text-gray-300">{post.author_name}</span>
              <span className="text-white/20">•</span>
              <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
            </div>

            {/* Body content */}
            <div className="prose-custom">
              {post.body?.blocks?.map((block, index) => (
                <ContentBlock
                  key={index}
                  block={block}
                  isRedacted={post.redacted_sections?.includes(index) ?? false}
                />
              ))}
            </div>
          </article>
        ) : null}
      </main>

      <Footer />
    </div>
  )
}
