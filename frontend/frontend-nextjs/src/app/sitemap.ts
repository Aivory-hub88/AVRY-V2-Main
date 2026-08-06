import type { MetadataRoute } from "next";
import { absoluteUrl, AIVORY_UK_URL } from "@/lib/seo";
import { getBlogPosts } from "@/lib/blog-api";
import { getVacancies } from "@/lib/careers-api";

export const revalidate = 3600;

const hreflang = { en: AIVORY_UK_URL, id: AIVORY_UK_URL } as const;

function hreflangAlternate(url: string) {
  return { languages: { en: url, id: url } };
}

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
  { path: "/nvidia-inception", changeFrequency: "yearly", priority: 0.6 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.2 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.2 },
  { path: "/cookie-policy", changeFrequency: "yearly", priority: 0.2 },
  { path: "/investor-relations", changeFrequency: "yearly", priority: 0.3 },
];

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
        alternates: hreflangAlternate(absoluteUrl(r.path)),
      };
    }
    return {
      url: absoluteUrl(r.path),
      lastModified: now,
      changeFrequency: r.changeFrequency,
      priority: r.priority,
      alternates: hreflangAlternate(absoluteUrl(r.path)),
    };
  });

  const blogEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: absoluteUrl(`/blog/${post.slug}`),
    lastModified: post.published_at ? new Date(post.published_at) : now,
    changeFrequency: "monthly",
    priority: 0.7,
    alternates: hreflangAlternate(absoluteUrl(`/blog/${post.slug}`)),
  }));

  const careerEntries: MetadataRoute.Sitemap = vacancies.map((v) => ({
    url: absoluteUrl(`/careers/${v.id}`),
    lastModified: v.updated_at ? new Date(v.updated_at) : now,
    changeFrequency: "weekly",
    priority: 0.6,
    alternates: hreflangAlternate(absoluteUrl(`/careers/${v.id}`)),
  }));

  return [...staticEntries, ...blogEntries, ...careerEntries];
}
