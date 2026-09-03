import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import Navbar from "@/components/home/Navbar"
import Footer from "@/components/Footer"
import { getBlogPost, type BlogPostDetail, type BlogContentBlock } from "@/lib/blog-api"
import { notFound } from "next/navigation"
import {
  SITE_URL,
  ORGANIZATION,
  DEFAULT_OG_IMAGE,
  absoluteUrl,
  richContentToPlainText,
  clampDescription,
  createFaqPageFromEntries,
  JsonLd,
} from "@/lib/seo"

function postDescription(post: BlogPostDetail): string {
  if (post.excerpt) return clampDescription(post.excerpt)
  return clampDescription(richContentToPlainText(post.body?.blocks))
}

export async function generateMetadata(
  props: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await props.params
  let post: BlogPostDetail | null = null
  try {
    post = await getBlogPost(slug)
  } catch {
    post = null
  }

  if (!post) {
    return { title: "Post not found", robots: { index: false, follow: false } }
  }

  const description = postDescription(post)
  const url = absoluteUrl(`/blog/${post.slug}`)
  const images = [post.thumbnail_url || DEFAULT_OG_IMAGE]

  return {
    title: post.title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "article",
      title: post.title,
      description,
      url,
      images,
      publishedTime: post.published_at,
      authors: post.author_name ? [post.author_name] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images,
    },
    other: {
      ...(post.published_at
        ? {
            "article:published_time": post.published_at,
            "article:modified_time": post.published_at,
          }
        : {}),
    },
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

function ArticleArrow() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="none">
      <path d="M3 13 13 3M6 3h7v7" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}

function ContentBlock({ block, isRedacted }: { block: BlogContentBlock; isRedacted: boolean }) {
  if (isRedacted) {
    return (
      <div
        className="my-4 rounded-lg border border-black/10 bg-black/[0.03] px-5 py-4 flex items-center gap-3"
        role="note"
        aria-label="Content redacted"
      >
        <div className="w-1 h-8 bg-black/20 rounded-full" />
        <span className="text-black/40 text-sm italic">Content redacted</span>
      </div>
    )
  }

  switch (block.type) {
    case "heading": {
      const level = block.level || 2
      const sizeClasses: Record<number, string> = {
        1: "text-3xl font-light tracking-[-0.02em]",
        2: "text-2xl font-light tracking-[-0.015em]",
        3: "text-xl font-normal",
        4: "text-lg font-normal",
        5: "text-base font-medium",
        6: "text-sm font-medium",
      }
      const className = `${sizeClasses[level] || sizeClasses[2]} text-[#11110f] mt-8 mb-3`
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
          className="text-black/70 leading-relaxed mb-4 text-[16px] font-light"
          dangerouslySetInnerHTML={{ __html: formatInlineMarkup(block.text || "") }}
        />
      )

    case "code": {
      return (
        <pre className="my-4 rounded-lg bg-black/[0.04] border border-black/10 p-4 overflow-x-auto">
          <code className="text-sm text-black/70 font-mono whitespace-pre-wrap">
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
        <ListTag className={`${listClass} text-black/70 text-[16px] font-light`}>
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
            loading="lazy"
            className="w-full rounded-lg border border-black/10"
          />
          {block.alt && (
            <figcaption className="text-center text-xs text-black/40 mt-2">
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
            className="text-[#11110f] underline underline-offset-2 hover:opacity-60 transition-opacity"
          >
            {block.text || block.href}
          </a>
        </p>
      )

    default:
      if (block.text) {
        return (
          <p
            className="text-black/70 leading-relaxed mb-4 text-[16px] font-light"
            dangerouslySetInnerHTML={{ __html: formatInlineMarkup(block.text) }}
          />
        )
      }
      return null
  }
}

function formatInlineMarkup(text: string): string {
  let html = text
  html = html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="text-[#11110f] font-medium">$1</strong>')
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>")
  html = html.replace(/_(.+?)_/g, "<em>$1</em>")
  html = html.replace(
    /`(.+?)`/g,
    '<code class="px-1.5 py-0.5 bg-black/[0.06] border border-black/10 rounded text-sm font-mono text-black/60">$1</code>'
  )
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g, (_match, linkText, href) => {
    const isExternal = /^https?:\/\//.test(href)
    const relAttr = isExternal ? ' target="_blank" rel="noopener noreferrer"' : ""
    return `<a href="${href}" class="text-[#11110f] underline underline-offset-2 hover:opacity-60 transition-opacity"${relAttr}>${linkText}</a>`
  })
  return html
}

/** Strips markdown emphasis/link syntax down to plain text, for JSON-LD fields that must not contain markup. */
function stripMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/[*_`]/g, "")
    .trim()
}

/**
 * Finds a "Frequently Asked Questions" heading and pairs each following
 * higher-level heading with its paragraph(s) into Q&A entries, stopping at
 * the next heading of equal or shallower depth (or the end of the post).
 */
function extractFaqEntries(blocks: BlogContentBlock[]): { question: string; answer: string }[] {
  const faqIndex = blocks.findIndex(
    (b) => b.type === "heading" && /frequently asked questions|\bfaq\b/i.test(b.text || "")
  )
  if (faqIndex === -1) return []

  const faqLevel = blocks[faqIndex].level ?? 2
  const entries: { question: string; answer: string }[] = []
  let current: { question: string; answer: string[] } | null = null

  for (let i = faqIndex + 1; i < blocks.length; i++) {
    const block = blocks[i]
    if (block.type === "heading") {
      if ((block.level ?? 2) <= faqLevel) break
      if (current) entries.push({ question: current.question, answer: stripMarkdown(current.answer.join(" ")) })
      current = { question: stripMarkdown(block.text || ""), answer: [] }
      continue
    }
    if (current && block.type === "paragraph" && block.text) {
      current.answer.push(block.text)
    }
  }
  if (current) entries.push({ question: current.question, answer: stripMarkdown(current.answer.join(" ")) })

  return entries.filter((entry) => entry.question && entry.answer)
}

export const revalidate = 60

export default async function BlogPostPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params
  const slug = params.slug

  let post: BlogPostDetail | null = null
  let error: string | null = null

  try {
    const data = await getBlogPost(slug)
    if (data === null) {
      notFound()
    } else {
      post = data
    }
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load blog post"
  }

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
        {error ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-black/50 mb-6 text-[17px] font-light">{error}</p>
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 border-b border-black pb-1 text-[13px] font-light text-black transition-opacity hover:opacity-55"
            >
              Back to Blog
              <ArticleArrow />
            </Link>
          </div>
        ) : post ? (
          <article className="max-w-3xl mx-auto px-6 py-24 md:py-32">
            {(() => {
              const faqEntries = extractFaqEntries(post.body?.blocks || [])
              return faqEntries.length > 0 ? (
                <JsonLd data={createFaqPageFromEntries(absoluteUrl(`/blog/${post.slug}`), faqEntries)} />
              ) : null
            })()}
            <JsonLd
              data={{
                "@context": "https://schema.org",
                "@type": "BlogPosting",
                headline: post.title,
                description: postDescription(post),
                image: post.thumbnail_url || undefined,
                datePublished: post.published_at,
                dateModified: post.published_at,
                author: { "@type": "Organization", name: post.author_name },
                publisher: ORGANIZATION,
                mainEntityOfPage: {
                  "@type": "WebPage",
                  "@id": absoluteUrl(`/blog/${post.slug}`),
                },
                url: absoluteUrl(`/blog/${post.slug}`),
                isPartOf: { "@type": "Blog", name: "Aivory News & Insights", url: `${SITE_URL}/blog` },
              }}
            />
            <JsonLd
              data={{
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
                  { "@type": "ListItem", position: 2, name: "News & Insights", item: `${SITE_URL}/blog` },
                  { "@type": "ListItem", position: 3, name: post.title, item: absoluteUrl(`/blog/${post.slug}`) },
                ],
              }}
            />

            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm text-black/50 hover:text-black transition-colors mb-10 font-light"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
              </svg>
              News &amp; Insights
            </Link>

            <h1 className="text-[32px] md:text-[46px] font-light leading-[1.05] tracking-[-0.035em] text-[#11110f] mb-6">
              {post.title}
            </h1>

            <div className="flex items-center gap-3 text-sm text-black/50 mb-10 pb-8 border-b border-black/15 font-light">
              <span className="text-black/70">{post.author_name}</span>
              <span className="text-black/25">·</span>
              <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
            </div>

            {post.thumbnail_url && (
              <figure className="mb-10">
                <Image
                  src={post.thumbnail_url}
                  alt={post.title}
                  width={1600}
                  height={893}
                  priority
                  className="w-full h-auto rounded-lg border border-black/10"
                />
              </figure>
            )}

            <div>
              {post.body?.blocks?.map((block, index) => (
                <ContentBlock
                  key={index}
                  block={block}
                  isRedacted={post.redacted_sections?.includes(index) ?? false}
                />
              ))}
            </div>

            <div className="mt-16 pt-8 border-t border-black/15">
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-sm text-black/50 hover:text-black transition-colors font-light"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                </svg>
                Back to News &amp; Insights
              </Link>
            </div>
          </article>
        ) : null}
      </main>

      <Footer />
    </div>
  )
}
