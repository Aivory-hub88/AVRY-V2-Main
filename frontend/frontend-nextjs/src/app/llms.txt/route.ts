import { SITE_URL } from "@/lib/seo";
import { getBlogPosts } from "@/lib/blog-api";
import { getVacancies } from "@/lib/careers-api";

// Regenerate hourly; content is cheap and changes rarely.
export const revalidate = 3600;

/**
 * /llms.txt — an llmstxt.org-style summary for AI/LLM crawlers (GEO).
 * Gives answer engines a clean, curated map of the site so they can
 * understand and cite Aivory accurately.
 */
export async function GET() {
  const lines: string[] = [
    "# Aivory",
    "",
    "> Aivory is an AI-powered business transformation platform — from diagnostic to deployment, everything you need to integrate AI into your business operations.",
    "",
    "Aivory helps businesses assess AI readiness, design blueprints and roadmaps, and deploy AI workflows and automations.",
    "",
    "## Key pages",
    `- [Home](${SITE_URL}/): Overview of the Aivory platform`,
    `- [Free AI Diagnostic](${SITE_URL}/free-diagnostic): Assess your business's AI readiness`,
    `- [Company](${SITE_URL}/company): About Aivory`,
    `- [Contact](${SITE_URL}/contact): Get in touch`,
    `- [Blog](${SITE_URL}/blog): Insights on AI adoption, automation and transformation`,
    `- [Careers](${SITE_URL}/careers): Open roles at Aivory`,
    "",
  ];

  try {
    const { posts } = await getBlogPosts(1, 25);
    if (posts.length) {
      lines.push("## Blog posts");
      for (const p of posts) {
        const excerpt = p.excerpt ? `: ${p.excerpt.replace(/\s+/g, " ").trim()}` : "";
        lines.push(`- [${p.title}](${SITE_URL}/blog/${p.slug})${excerpt}`);
      }
      lines.push("");
    }
  } catch {
    /* backend unavailable — omit the section rather than fail */
  }

  try {
    const vacancies = await getVacancies();
    if (vacancies.length) {
      lines.push("## Open roles");
      for (const v of vacancies) {
        const meta = [v.department, v.location, v.employment_type].filter(Boolean).join(", ");
        lines.push(`- [${v.title}](${SITE_URL}/careers/${v.id})${meta ? `: ${meta}` : ""}`);
      }
      lines.push("");
    }
  } catch {
    /* ignore */
  }

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}
