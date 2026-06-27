import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
import { getBlogPosts } from "@/lib/blog-api";
import { getVacancies } from "@/lib/careers-api";

// Refresh the sitemap at most once an hour; blog/careers change rarely.
export const revalidate = 3600;

/** Static, always-present marketing routes. */
const STATIC_ROUTES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/blog", changeFrequency: "daily", priority: 0.8 },
  { path: "/careers", changeFrequency: "daily", priority: 0.8 },
  { path: "/company", changeFrequency: "monthly", priority: 0.6 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.5 },
  { path: "/free-diagnostic", changeFrequency: "monthly", priority: 0.7 },
  { path: "/cookie-policy", changeFrequency: "yearly", priority: 0.2 },
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
    // Never let a backend hiccup break the whole sitemap.
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: absoluteUrl(r.path),
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  const [posts, vacancies] = await Promise.all([
    getAllBlogPosts(),
    getVacancies().catch(() => []),
  ]);

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

  return [...staticEntries, ...blogEntries, ...careerEntries];
}
