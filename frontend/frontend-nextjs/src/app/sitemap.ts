import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
import { getBlogPosts } from "@/lib/blog-api";
import { getVacancies } from "@/lib/careers-api";

// Rendered per request, never prerendered. The blog/careers data below comes
// from sibling containers over the internal Docker network, which is NOT
// reachable during `docker build` — a build-time prerender therefore bakes in
// the empty `catch` fallback and ships a sitemap with zero articles until the
// next rebuild. Fetching at request time is the only way this stays correct
// across deploys; the sitemap is requested rarely enough for the cost to be
// irrelevant.
export const dynamic = "force-dynamic";


const STATIC_ROUTES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/blog", changeFrequency: "daily", priority: 0.8 },
  { path: "/product", changeFrequency: "monthly", priority: 0.8 },
  { path: "/careers", changeFrequency: "daily", priority: 0.8 },
  { path: "/pricing", changeFrequency: "weekly", priority: 0.9 },
  { path: "/about", changeFrequency: "monthly", priority: 0.7 },
  { path: "/bastion", changeFrequency: "monthly", priority: 0.7 },
  { path: "/company", changeFrequency: "monthly", priority: 0.6 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.5 },
  { path: "/free-diagnostic", changeFrequency: "monthly", priority: 0.7 },
  { path: "/ai-workflow-automation", changeFrequency: "monthly", priority: 0.9 },
  { path: "/templates/lead-qualification", changeFrequency: "monthly", priority: 0.7 },
  { path: "/glossary", changeFrequency: "monthly", priority: 0.6 },
  { path: "/nvidia-inception", changeFrequency: "yearly", priority: 0.6 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.2 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.2 },
  { path: "/cookie-policy", changeFrequency: "yearly", priority: 0.2 },
  { path: "/investor-relations", changeFrequency: "yearly", priority: 0.3 },
];

// Only /about and /company have full server-rendered translations (one
// route directory per locale, e.g. src/app/de/company) with matching
// hreflang tags already emitted by those pages. English is the untranslated
// default and stays out of this list -- it is already in STATIC_ROUTES.
const TRANSLATED_LOCALES = ["ar", "de", "es", "fr", "ja", "ko", "nl", "pt", "zh"];
const TRANSLATED_PATHS = ["/about", "/company"];

/** Pull every published post by walking the paginated listing endpoint. */
async function getAllBlogPosts() {
  try {
    const first = await getBlogPosts(1, 100);
    const posts = [...first.posts];
    for (let page = 2; page <= first.total_pages; page++) {
      const next = await getBlogPosts(page, 100);
      posts.push(...next.posts);
    }
    return posts;
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const [posts, vacancies] = await Promise.all([
    getAllBlogPosts(),
    getVacancies().catch(() => []),
  ]);

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => {
    // When there are zero open vacancies, /careers is a thin empty-state
    // shell. Lowering its priority + changeFrequency stops Google from
    // over-fetching a near-empty page that would otherwise look like a
    // duplicate of the homepage canonical-wise. Real openings restore the
    // higher priority automatically.
    if (r.path === "/careers") {
      const hasOpenings = vacancies.length > 0;
      return {
        url: absoluteUrl(r.path),
        lastModified: now,
        changeFrequency: hasOpenings ? ("daily" as const) : ("weekly" as const),
        priority: hasOpenings ? 0.8 : 0.3,
      };
    }
    return {
      url: absoluteUrl(r.path),
      lastModified: now,
      changeFrequency: r.changeFrequency,
      priority: r.priority,
    };
  });

  const blogEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: absoluteUrl(`/blog/${post.slug}`),
    lastModified: post.published_at ? new Date(post.published_at) : now,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const careerEntries: MetadataRoute.Sitemap = vacancies.map((v) => ({
    url: absoluteUrl(`/careers/${v.id}`),
    lastModified: v.updated_at ? new Date(v.updated_at) : now,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const localeEntries: MetadataRoute.Sitemap = TRANSLATED_LOCALES.flatMap((locale) =>
    TRANSLATED_PATHS.map((path) => ({
      url: absoluteUrl(`/${locale}${path}`),
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  );

  return [...staticEntries, ...blogEntries, ...careerEntries, ...localeEntries];
}
