import type { Metadata } from "next"
import Link from "next/link"
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
  JsonLd,
} from "@/lib/seo"

function postDescription(post: BlogPostDetail): string {
  if (post.excerpt) return clampDescription(post.excerpt)
  return clampDescription(richContentToPlainText(post.body?.blocks))
}

export async function generateMetadata(
  props: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await props.params
  let post: BlogPostDetail | null = null

  try {
    post = await getBlogPost(slug)
  } catch {
    post = null
  }

  if (!post) {
    return { title: "Article not found", robots: { index: false, follow: false } }
  }

  const description = postDescription(post)
  const url = absoluteUrl(`/blog/${post.slug}`)
  const images = [post.thumbnail_url || DEFAULT_OG_IMAGE]

  return {
    title: post.title,
    description,
    alternates: {
      canonical: url,
      languages: { en: url, id: url },
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

function InlineLink({ block }: { block: BlogContentBlock }) {
  const href = block.href || "#"
  const className =
    "inline-flex items-center gap-2 border-b border-black/55 pb-0.5 text-[#11110f] transition-opacity hover:opacity-55"

  if (href.startsWith("/")) {
    return (
      <Link href={href} className={className}>
        {block.text || href}
        <ArticleArrow />
      </Link>
    )
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {block.text || href}
      <ArticleArrow />
    </a>
  )
}

function ContentBlock({ block, isRedacted }: { block: BlogContentBlock; isRedacted: boolean }) {
  if (isRedacted) {
    return (
      <div className="my-8 border-y border-black/15 py-6" role="note" aria-label="Content redacted">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-black/45">
          Content redacted
        </span>
      </div>
    )
  }

  switch (block.type) {
    case "heading": {
      const level = block.level || 2
      const className =
        "mb-5 mt-16 font-light leading-[1.08] tracking-[-0.03em] text-[#11110f]"
      if (level === 1) return <h2 className={`${className} text-[36px] md:text-[48px]`}>{block.text}</h2>
      if (level === 3) return <h3 className={`${className} text-[28px] md:text-[34px]`}>{block.text}</h3>
      if (level === 4) return <h4 className={`${className} text-[23px] md:text-[28px]`}>{block.text}</h4>
      if (level === 5) return <h5 className={`${className} text-[20px] md:text-[23px]`}>{block.text}</h5>
      if (level === 6) return <h6 className={`${className} font-mono text-[12px] uppercase tracking-[0.14em]`}>{block.text}</h6>
      return <h2 className={`${className} text-[32px] md:text-[42px]`}>{block.text}</h2>
    }

    case "paragraph":
      return (
        <p
          className="mb-7 text-[17px] font-light leading-[1.85] text-[#272722] md:text-[19px]"
          dangerouslySetInnerHTML={{ __html: formatInlineMarkup(block.text || "") }}
        />
      )

    case "code":
      return (
        <pre className="my-8 overflow-x-auto border border-black/15 bg-[#11110f] p-6">
          <code className="whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-[#efeee8]">
            {block.text}
          </code>
        </pre>
      )

    case "list": {
      const items = block.items || []
      const ordered = block.style === "ordered"
      const ListTag = ordered ? "ol" : "ul"
      return (
        <ListTag
          className={`mb-8 space-y-3 pl-6 text-[17px] font-light leading-[1.75] text-[#272722] md:text-[18px] ${
            ordered ? "list-decimal" : "list-disc"
          }`}
        >
          {items.map((item, index) => (
            <li key={index} dangerouslySetInnerHTML={{ __html: formatInlineMarkup(item) }} />
          ))}
        </ListTag>
      )
    }

    case "image":
      return (
        <figure className="my-12">
          <img src={block.url || ""} alt={block.alt || ""} className="w-full border border-black/10" />
          {block.alt && (
            <figcaption className="mt-3 font-mono text-[10px] leading-relaxed tracking-[0.08em] text-black/50">
              {block.alt}
            </figcaption>
          )}
        </figure>
      )

    case "link":
      return (
        <p className="mb-8 text-[15px] font-light">
          <InlineLink block={block} />
        </p>
      )

    default:
      if (!block.text) return null
      return (
        <p
          className="mb-7 text-[17px] font-light leading-[1.85] text-[#272722] md:text-[19px]"
          dangerouslySetInnerHTML={{ __html: formatInlineMarkup(block.text) }}
        />
      )
  }
}

function formatInlineMarkup(text: string): string {
  let html = text
  html = html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-medium text-[#11110f]">$1</strong>')
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>")
  html = html.replace(/_(.+?)_/g, "<em>$1</em>")
  html = html.replace(
    /`(.+?)`/g,
    '<code class="border border-black/15 bg-black/[0.04] px-1.5 py-0.5 font-mono text-[0.85em]">$1</code>',
  )
  return html
}

export const revalidate = 60

export default async function BlogPostPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params
  let post: BlogPostDetail | null = null
  let error: string | null = null

  try {
    post = await getBlogPost(slug)
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load article"
  }

  if (!error && post === null) notFound()

  return (
    <div className="flex min-h-screen flex-col bg-[#050505] font-manrope">
      <Navbar />

      <main
        className="flex-1 bg-[#efeee8] text-[#11110f]"
        style={{
          fontFamily: "'Manrope', sans-serif",
          fontWeight: 300,
          background: "linear-gradient(to bottom, #050505 0, #050505 64px, #efeee8 64px, #efeee8 100%)",
        }}
      >
        {error ? (
          <section className="mx-auto max-w-[1480px] px-6 pb-28 pt-44 md:px-12 md:pt-56">
            <p className="text-[24px] font-light">{error}</p>
            <Link href="/blog" className="mt-10 inline-flex items-center gap-3 border-b border-black pb-1 text-[13px] font-light">
              Back to newsroom <ArticleArrow />
            </Link>
          </section>
        ) : post ? (
          <article>
            <JsonLd
              data={{
                "@context": "https://schema.org",
                "@type": "BlogPosting",
                headline: post.title,
                description: postDescription(post),
                image: post.thumbnail_url || undefined,
                datePublished: post.published_at,
                dateModified: post.published_at,
                author: {
                  "@type": "Organization",
                  name: post.author_name,
                  url: `${SITE_URL}/company`,
                },
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

            <header className="mx-auto max-w-[1480px] px-6 pb-16 pt-40 md:px-12 md:pb-24 md:pt-52">
              <Link
                href="/blog"
                className="inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.16em] text-black/55 transition-opacity hover:opacity-55"
              >
                Newsroom
              </Link>
              <h1 className="mt-10 max-w-6xl text-[44px] font-light leading-[0.98] tracking-[-0.05em] md:text-[72px] lg:text-[92px]">
                {post.title}
              </h1>
              {post.excerpt && (
                <p className="mt-10 max-w-3xl text-[19px] font-light leading-[1.65] text-black/65 md:text-[23px]">
                  {post.excerpt}
                </p>
              )}
              <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-black/25 pt-5 font-mono text-[10px] uppercase tracking-[0.13em] text-black/55">
                <span>{post.author_name}</span>
                <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
              </div>
            </header>

            {post.thumbnail_url && (
              <figure className="mx-auto max-w-[1480px] px-6 md:px-12">
                <div className="aspect-[16/8.5] overflow-hidden bg-[#11110f]">
                  <img src={post.thumbnail_url} alt={post.title} className="h-full w-full object-cover" />
                </div>
              </figure>
            )}

            <div className="mx-auto grid max-w-[1180px] gap-12 px-6 pb-28 pt-20 md:px-12 md:pb-40 md:pt-28 lg:grid-cols-[180px_minmax(0,760px)]">
              <aside className="hidden lg:block">
                <div className="sticky top-28 border-t border-black/25 pt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-black/50">
                  Aivory Editorial
                </div>
              </aside>
              <div>
                {post.body?.blocks?.map((block, index) => (
                  <ContentBlock
                    key={index}
                    block={block}
                    isRedacted={post.redacted_sections?.includes(index) ?? false}
                  />
                ))}

                <div className="mt-20 border-t border-black/25 pt-10">
                  <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-black/50">
                    Continue reading
                  </p>
                  <Link
                    href="/blog"
                    className="mt-5 inline-flex items-center gap-3 text-[22px] font-light transition-opacity hover:opacity-55"
                  >
                    Explore News &amp; Insights <ArticleArrow />
                  </Link>
                </div>
              </div>
            </div>
          </article>
        ) : null}
      </main>

      <Footer />
    </div>
  )
}
