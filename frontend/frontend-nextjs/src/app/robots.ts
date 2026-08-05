import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * robots.txt policy.
 *
 * Strategy: maximise SEO + GEO while signalling no-consent for pure model
 * training. The real anti-scraping enforcement lives at the Cloudflare edge
 * (Verified Bots allow-list + rate limiting) — robots.txt only expresses
 * intent and well-behaved bots honour it.
 *
 *  - Classic search crawlers  → allowed (SEO).
 *  - AI answer/search engines → allowed so Aivory can be cited in ChatGPT,
 *    Perplexity, Claude and Google AI Overviews (GEO).
 *  - Pure AI training crawlers → disallowed (content not handed to training).
 *
 * NOTE: Cloudflare's "Managed robots.txt" appends its own block at the edge.
 * Disable that feature once this route is live so the two policies don't
 * conflict (this file becomes the single source of truth).
 */

// Real-time AI answer engines we WANT indexing/citing us (GEO upside).
const AI_ANSWER_BOTS = [
  "OAI-SearchBot", // ChatGPT Search index
  "ChatGPT-User", // ChatGPT user-triggered fetch
  "PerplexityBot", // Perplexity index
  "Perplexity-User", // Perplexity user-triggered fetch
  "Claude-SearchBot", // Anthropic search index
  "Claude-User", // Claude user-triggered fetch
  "Amazonbot", // Alexa / Rufus answers
  "Applebot", // Siri / Spotlight (search, not training)
];

// Pure training crawlers we do NOT consent to (no real-time citation value).
const AI_TRAINING_BOTS = [
  "GPTBot",
  "ClaudeBot",
  "anthropic-ai",
  "Google-Extended",
  "CCBot",
  "Bytespider",
  "Meta-ExternalAgent",
  "FacebookBot",
  "Applebot-Extended",
  "Diffbot",
  "Omgilibot",
  "Omgili",
  "ImagesiftBot",
  "PetalBot",
  "cohere-ai",
  "YouBot",
  "Timpibot",
  "DataForSeoBot",
];

// Paths that should never be indexed by anyone.
// - /login, /payment, /checkout/* are private/auth flows behind a sign-in.
//   Even though each page also emits `robots: { index: false }` via Next.js
//   metadata, listing them here stops crawlers before the page is fetched.
// - /api/ is internal only.
// - /free-diagnostic/results is a results screen reached only after
//   submitting the diagnostic, never linked publicly.
const PRIVATE_PATHS = [
  "/api/",
  "/login",
  "/payment",
  "/checkout/",
  "/free-diagnostic/results",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Default: everything public is crawlable.
      {
        userAgent: "*",
        allow: "/",
        disallow: PRIVATE_PATHS,
      },
      // AI answer engines: explicitly allowed (GEO).
      {
        userAgent: AI_ANSWER_BOTS,
        allow: "/",
        disallow: PRIVATE_PATHS,
      },
      // AI training crawlers: fully disallowed.
      {
        userAgent: AI_TRAINING_BOTS,
        disallow: "/",
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
