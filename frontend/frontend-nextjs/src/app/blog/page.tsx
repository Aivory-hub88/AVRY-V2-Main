import type { Metadata } from "next"
import Link from "next/link"
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/Footer";
import { getBlogPosts, BlogPost, BlogPostsResponse } from "@/lib/blog-api"
import { DEFAULT_OG_IMAGE } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Insights, guides, and updates on AI adoption, automation, and business transformation from the Aivory team.",
  alternates: { canonical: "/blog" },
  openGraph: {
    type: "website",
    title: "Aivory Blog",
    description:
      "Insights, guides, and updates on AI adoption, automation, and business transformation.",
    url: "/blog",
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: { card: "summary_large_image", images: [DEFAULT_OG_IMAGE] },
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function BlogPostCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden hover:border-[#c4c9b8]/40 hover:bg-white/[0.04] transition-all duration-300"
    >
      {/* Thumbnail */}
      <div className="aspect-video w-full bg-white/5 overflow-hidden">
        {post.thumbnail_url ? (
          <img
            src={post.thumbnail_url}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              className="w-12 h-12 text-white/20"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5">
        <h2 className="text-lg font-semibold text-white mb-2 group-hover:text-[#c4c9b8] transition-colors line-clamp-2">
          {post.title}
        </h2>

        {post.excerpt && (
          <p className="text-sm text-gray-400 mb-4 line-clamp-3 flex-1">
            {post.excerpt}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500 mt-auto pt-3 border-t border-white/5">
          <span>{post.author_name}</span>
          <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
        </div>
      </div>
    </Link>
  )
}

function EmptyState() {
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
          d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
        />
      </svg>
      <h2 className="text-xl font-semibold text-white mb-2">No posts yet</h2>
      <p className="text-gray-400 max-w-sm">
        We&apos;re working on some great content. Check back soon for articles about
        AI, technology, and how Aivory can help your business.
      </p>
    </div>
  )
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden animate-pulse"
        >
          <div className="aspect-video w-full bg-white/5" />
          <div className="p-5 space-y-3">
            <div className="h-5 bg-white/10 rounded w-3/4" />
            <div className="h-4 bg-white/5 rounded w-full" />
            <div className="h-4 bg-white/5 rounded w-2/3" />
            <div className="flex justify-between pt-3 border-t border-white/5">
              <div className="h-3 bg-white/5 rounded w-20" />
              <div className="h-3 bg-white/5 rounded w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function PaginationControls({
  page,
  totalPages,
}: {
  page: number
  totalPages: number
}) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-center gap-4 mt-12">
      {page > 1 ? (
        <Link
          href={`/blog?page=${page - 1}`}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-white/10 text-white hover:bg-white/5 transition-colors"
          aria-label="Previous page"
        >
          ← Previous
        </Link>
      ) : (
        <button
          disabled
          className="px-4 py-2 text-sm font-medium rounded-lg border border-white/10 text-white hover:bg-white/5 transition-colors opacity-30 cursor-not-allowed"
          aria-label="Previous page"
        >
          ← Previous
        </button>
      )}

      <span className="text-sm text-gray-400">
        Page {page} of {totalPages}
      </span>

      {page < totalPages ? (
        <Link
          href={`/blog?page=${page + 1}`}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-white/10 text-white hover:bg-white/5 transition-colors"
          aria-label="Next page"
        >
          Next →
        </Link>
      ) : (
        <button
          disabled
          className="px-4 py-2 text-sm font-medium rounded-lg border border-white/10 text-white hover:bg-white/5 transition-colors opacity-30 cursor-not-allowed"
          aria-label="Next page"
        >
          Next →
        </button>
      )}
    </div>
  )

}

export const revalidate = 60; // SSG with ISR (1 min)

export default async function BlogPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams;
  const pageStr = searchParams?.page;
  const page = typeof pageStr === 'string' ? parseInt(pageStr, 10) : 1;
  const validPage = isNaN(page) || page < 1 ? 1 : page;

  let posts: BlogPost[] = [];
  let totalPages = 0;
  let error: string | null = null;

  try {
    const data: BlogPostsResponse = await getBlogPosts(validPage, 9);
    posts = data.posts;
    totalPages = data.total_pages;
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load blog posts";
  }

  return (
    <div className="flex min-h-screen flex-col font-manrope" style={{ background: "#050505" }}>
      <Navbar />

      <main className="flex-1 px-6 py-24">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-12 text-center mt-12">
            <h1 className="text-[36px] md:text-[56px] font-light mb-4 tracking-tight text-white/90" style={{ fontFamily: "'Manrope', sans-serif" }}>Blog</h1>
            <p className="text-[#c4c9b8] text-lg max-w-2xl mx-auto font-light">
              Insights, updates, and guides on AI readiness and how Aivory can
              transform your business.
            </p>
          </div>

          {/* Content */}
          {error ? (
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
                Try Again
              </Link>
            </div>
          ) : posts.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.map((post) => (
                  <BlogPostCard key={post.id} post={post} />
                ))}
              </div>

              <PaginationControls
                page={validPage}
                totalPages={totalPages}
              />
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}