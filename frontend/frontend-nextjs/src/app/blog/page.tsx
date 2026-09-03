import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import Navbar from "@/components/home/Navbar"
import Footer from "@/components/Footer"
import { getBlogPosts, type BlogPost, type BlogPostsResponse } from "@/lib/blog-api"
import {
  DEFAULT_OG_IMAGE,
  SITE_URL,
  absoluteUrl,
  JsonLd,
  createBreadcrumbList,
} from "@/lib/seo"

export const metadata: Metadata = {
  title: "News & Insights",
  description:
    "Reporting and practical analysis on business operations, governed AI, and operational transformation from Aivory.",
  alternates: {
    canonical: "/blog",
  },
  openGraph: {
    type: "website",
    title: "News & Insights | Aivory",
    description:
      "Reporting and practical analysis on business operations, governed AI, and operational transformation.",
    url: "/blog",
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: { card: "summary_large_image", images: [DEFAULT_OG_IMAGE] },
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

function ImageFallback({ title }: { title: string }) {
  return (
    <div
      className="relative flex h-full min-h-[280px] w-full items-end overflow-hidden bg-[#11110f] p-6 text-[#efeee8]"
      aria-label={`Abstract illustration for ${title}`}
      role="img"
    >
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(239,238,232,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(239,238,232,0.18)_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="absolute left-[12%] top-[22%] h-28 w-28 rounded-full border border-[#a3aa96]/60" />
      <div className="absolute right-[16%] top-[32%] h-40 w-40 rotate-45 border border-[#efeee8]/25" />
      <span className="relative font-mono text-[10px] uppercase tracking-[0.2em] text-[#dfe2d8]">
        Aivory Editorial
      </span>
    </div>
  )
}

function FeaturedStory({ post }: { post: BlogPost }) {
  return (
    <article className="grid border-t border-black/25 pt-8 lg:grid-cols-12 lg:gap-12">
      <div className="flex flex-col pb-10 lg:col-span-5 lg:min-h-[430px] lg:pb-0">
        <time
          dateTime={post.published_at}
          className="mb-6 font-mono text-[10px] uppercase tracking-[0.16em] text-black/60"
        >
          {formatDate(post.published_at)}
        </time>
        <h2 className="max-w-xl text-[32px] font-light leading-[1.05] tracking-[-0.035em] text-[#11110f] md:text-[46px]">
          {post.title}
        </h2>
        {post.excerpt && (
          <p className="mt-8 max-w-md text-[16px] font-light leading-[1.7] text-black/70 md:text-[17px]">
            {post.excerpt}
          </p>
        )}
        <Link
          href={`/blog/${post.slug}`}
          className="group mt-10 inline-flex w-fit items-center gap-3 border-b border-black pb-1 text-[13px] font-light text-black transition-opacity hover:opacity-55 lg:mt-auto"
        >
          Read article
          <ArticleArrow />
        </Link>
      </div>

      <Link
        href={`/blog/${post.slug}`}
        className="group relative block aspect-[16/10] overflow-hidden bg-[#11110f] lg:col-span-7"
        aria-label={`Read ${post.title}`}
      >
        {post.thumbnail_url ? (
          <Image
            src={post.thumbnail_url}
            alt={post.title}
            fill
            sizes="(min-width: 1024px) 58vw, 100vw"
            priority
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.025]"
          />
        ) : (
          <ImageFallback title={post.title} />
        )}
      </Link>
    </article>
  )
}

function FeaturedRow({ post, index }: { post: BlogPost; index: number }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col gap-4"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-[#11110f]">
        {post.thumbnail_url ? (
          <Image
            src={post.thumbnail_url}
            alt={post.title}
            fill
            sizes="(min-width: 1024px) 33vw, 100vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.025]"
          />
        ) : (
          <ImageFallback title={post.title} />
        )}
      </div>
      <div>
        <time
          dateTime={post.published_at}
          className="mb-3 block font-mono text-[10px] uppercase tracking-[0.16em] text-black/60"
        >
          {formatDate(post.published_at)}
        </time>
        <h3 className="text-[20px] font-light leading-[1.15] tracking-[-0.02em] text-[#11110f] md:text-[23px]">
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="mt-3 text-[14px] font-light leading-[1.6] text-black/60 md:text-[15px]">
            {post.excerpt}
          </p>
        )}
        <span className="mt-5 inline-flex items-center gap-2 border-b border-black pb-0.5 text-[12px] font-light text-black transition-opacity group-hover:opacity-55">
          Read article
          <ArticleArrow />
        </span>
      </div>
    </Link>
  )
}

function ArchiveRow({ post }: { post: BlogPost }) {
  return (
    <article className="border-t border-black/25">
      <Link
        href={`/blog/${post.slug}`}
        className="group grid gap-6 py-7 text-black md:grid-cols-[150px_minmax(0,1fr)_180px] md:items-start md:py-9"
      >
        <time
          dateTime={post.published_at}
          className="font-mono text-[10px] uppercase tracking-[0.14em] text-black/55"
        >
          {formatDate(post.published_at)}
        </time>
        <div className="max-w-3xl">
          <h3 className="text-[25px] font-light leading-[1.1] tracking-[-0.025em] transition-opacity group-hover:opacity-55 md:text-[34px]">
            {post.title}
          </h3>
          {post.excerpt && (
            <p className="mt-4 max-w-2xl text-[14px] font-light leading-[1.65] text-black/65 md:text-[15px]">
              {post.excerpt}
            </p>
          )}
          <span className="mt-6 inline-flex items-center gap-3 text-[12px] font-light">
            Read article <ArticleArrow />
          </span>
        </div>
        <div className="relative hidden aspect-[4/3] overflow-hidden bg-[#11110f] md:block">
          {post.thumbnail_url ? (
            <Image
              src={post.thumbnail_url}
              alt=""
              fill
              sizes="180px"
              className="object-cover transition-transform duration-700 group-hover:scale-[1.035]"
            />
          ) : (
            <ImageFallback title={post.title} />
          )}
        </div>
      </Link>
    </article>
  )
}

function PaginationControls({ page, totalPages }: { page: number; totalPages: number }) {
  if (totalPages <= 1) return null

  const paginationLink =
    "inline-flex min-h-[44px] items-center border border-black/30 px-5 text-[11px] font-light uppercase tracking-[0.12em] text-black transition-colors hover:bg-black hover:text-white"

  return (
    <nav aria-label="Blog pagination" className="flex items-center justify-between border-t border-black/25 py-10">
      {page > 1 ? (
        <Link href={`/blog?page=${page - 1}`} className={paginationLink}>
          Previous
        </Link>
      ) : (
        <span />
      )}
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-black/55">
        Page {page} of {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={`/blog?page=${page + 1}`} className={paginationLink}>
          Next
        </Link>
      ) : (
        <span />
      )}
    </nav>
  )
}

async function searchPublishedPosts(query: string): Promise<BlogPost[]> {
  const first = await getBlogPosts(1, 100)
  const posts = [...first.posts]
  for (let page = 2; page <= first.total_pages; page += 1) {
    const next = await getBlogPosts(page, 100)
    posts.push(...next.posts)
  }

  const needle = query.toLocaleLowerCase("en-GB")
  return posts.filter((post) =>
    `${post.title} ${post.excerpt || ""} ${post.author_name}`
      .toLocaleLowerCase("en-GB")
      .includes(needle),
  )
}

export const revalidate = 60

const WELCOME_SLUG = "welcome-to-aivory-your-ai-powered-business-automation-platform"

export default async function BlogPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams
  const pageValue = searchParams?.page
  const queryValue = searchParams?.q
  const parsedPage = typeof pageValue === "string" ? Number.parseInt(pageValue, 10) : 1
  const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage
  const query = typeof queryValue === "string" ? queryValue.trim().slice(0, 120) : ""

  let posts: BlogPost[] = []
  let totalPages = 0
  let error: string | null = null

  try {
    if (query) {
      posts = await searchPublishedPosts(query)
      totalPages = posts.length > 0 ? 1 : 0
    } else {
      const data: BlogPostsResponse = await getBlogPosts(page, 9)
      posts = data.posts
      totalPages = data.total_pages
    }
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load newsroom articles"
  }

  const showHero = !query && page === 1

  let featuredPosts: BlogPost[] = []
  let archivePosts = posts
  let welcomePost: BlogPost | undefined

  if (showHero) {
    if (posts.length > 0) {
      welcomePost = posts.find((p) => p.slug === WELCOME_SLUG)
    }

    if (!welcomePost) {
      try {
        const allData = await getBlogPosts(1, 50)
        welcomePost = allData.posts.find((p) => p.slug === WELCOME_SLUG)
      } catch {
        welcomePost = undefined
      }
    }

    if (welcomePost) {
      const remaining = posts.filter((p) => p.slug !== WELCOME_SLUG).slice(0, 2)
      featuredPosts = [welcomePost, ...remaining]
      const featuredSlugs = new Set(featuredPosts.map((p) => p.slug))
      archivePosts = posts.filter((p) => !featuredSlugs.has(p.slug))
    } else {
      featuredPosts = posts.slice(0, 3)
      archivePosts = posts.slice(3)
    }
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
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Blog",
            name: "Aivory News & Insights",
            description: metadata.description,
            url: `${SITE_URL}/blog`,
            publisher: { "@id": `${SITE_URL}/#organization` },
            blogPost: posts.map((post) => ({
              "@type": "BlogPosting",
              headline: post.title,
              url: absoluteUrl(`/blog/${post.slug}`),
              datePublished: post.published_at,
              author: { "@type": "Organization", name: post.author_name },
            })),
          }}
        />
        <JsonLd
          data={createBreadcrumbList([
            { name: 'Home', item: absoluteUrl('/') },
            { name: 'News & Insights', item: absoluteUrl('/blog') },
          ])}
        />

        <section className="mx-auto max-w-[1480px] px-6 pb-16 pt-40 md:px-12 lg:px-24 md:pb-24 md:pt-52">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/60">
            Newsroom
          </p>
          <h1 className="mt-5 text-[44px] font-light leading-[1.15] tracking-[-0.02em] md:text-[64px] lg:text-[80px]">
            News &amp; Insights
          </h1>
        </section>

        {featuredPosts.length > 0 && (
          <section className="mx-auto max-w-[1480px] px-6 pb-16 md:px-12 lg:px-24 md:pb-24">
            <FeaturedStory post={featuredPosts[0]} />
            {featuredPosts.length > 1 && (
              <div className="mt-12 grid gap-8 border-t border-black/25 pt-10 md:grid-cols-2">
                {featuredPosts.slice(1).map((post, index) => (
                  <FeaturedRow key={post.id} post={post} index={index + 1} />
                ))}
              </div>
            )}
          </section>
        )}

        <section aria-labelledby="all-articles-heading">
          <div className="mx-auto max-w-[1480px] px-6 pb-8 md:px-12 lg:px-24 md:pb-12">
            <h2 id="all-articles-heading" className="text-[34px] font-light tracking-[-0.035em] md:text-[52px]">
              {query ? `Search results for "${query}"` : "All articles"}
            </h2>
          </div>

          <div className="bg-[#050505] px-6 py-8 text-white md:px-12 lg:px-24 md:py-10">
            <form action="/blog" method="get" role="search" className="mx-auto flex max-w-[1480px] items-end gap-4">
              <label htmlFor="newsroom-search" className="sr-only">Search newsroom</label>
              <span aria-hidden="true" className="pb-3 text-white/60">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m16.5 16.5 4 4" />
                </svg>
              </span>
              <input
                id="newsroom-search"
                name="q"
                type="search"
                defaultValue={query}
                placeholder="Search news and insights"
                className="min-w-0 flex-1 border-b border-white/40 bg-transparent py-3 text-[15px] font-light text-white outline-none placeholder:text-white/45 focus:border-white"
              />
              <button
                type="submit"
                className="border-b border-white/40 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white transition-opacity hover:opacity-60"
              >
                Search
              </button>
            </form>
          </div>

          <div className="mx-auto max-w-[1480px] px-6 pb-24 pt-12 md:px-12 lg:px-24 md:pb-36 md:pt-16">
            {error ? (
              <div className="border-t border-black/25 py-16">
                <p className="max-w-xl text-[17px] font-light leading-relaxed text-black/70">{error}</p>
                <Link href="/blog" className="mt-8 inline-flex border-b border-black pb-1 text-[13px] font-light">
                  Try again
                </Link>
              </div>
            ) : archivePosts.length === 0 ? (
              <div className="border-t border-black/25 py-16">
                <p className="text-[22px] font-light">No articles matched your search.</p>
                <Link href="/blog" className="mt-8 inline-flex border-b border-black pb-1 text-[13px] font-light">
                  View all articles
                </Link>
              </div>
            ) : (
              archivePosts.map((post) => <ArchiveRow key={post.id} post={post} />)
            )}

            {!query && <PaginationControls page={page} totalPages={totalPages} />}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
