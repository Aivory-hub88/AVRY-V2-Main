/**
 * Shared SEO / GEO helpers.
 *
 * Centralises the canonical site origin, absolute-URL building, the
 * Organisation publisher block reused across structured data, and a small
 * serialiser that flattens the Rich-Editor JSONB used by blog/careers into
 * plain text for meta descriptions and JSON-LD bodies.
 */

import React from "react";

/**
 * Canonical public origin of the marketing site. Overridable per environment
 * but defaults to production so build-time output (sitemap/robots) is correct
 * even when the env var is missing.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://aivory.id"
).replace(/\/$/, "");

/** Human-readable site/brand name. */
export const SITE_NAME = "Aivory";

/**
 * Default social/share image. Next.js does NOT inherit parent
 * `openGraph.images` into a page that defines its own `openGraph`, so pages
 * use this explicitly as a fallback when they have no image of their own.
 */
export const DEFAULT_OG_IMAGE = "/hero-video-poster.jpg";

/** Build an absolute URL from a site-relative path. */
export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Publisher block reused by Article / JobPosting structured data. */
export const ORGANIZATION = {
  "@type": "Organization",
  name: "Aivory",
  url: SITE_URL,
  logo: {
    "@type": "ImageObject",
    url: absoluteUrl("/icon.svg"),
  },
} as const;

/**
 * Flatten arbitrary Rich-Editor JSONB content into a single plain-text string.
 * Handles raw strings, arrays of blocks, and TipTap-style `{ content: [...] }`
 * documents, mirroring the renderers used on the blog/careers pages.
 */
export function richContentToPlainText(content: unknown): string {
  const parts: string[] = [];

  const walk = (node: unknown): void => {
    if (node == null) return;
    if (typeof node === "string") {
      parts.push(node);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (typeof node === "object") {
      const obj = node as Record<string, unknown>;
      // Different editors store text under different keys; cover them all.
      if (typeof obj.text === "string") parts.push(obj.text);
      if (typeof obj.content === "string") parts.push(obj.content);
      if (Array.isArray(obj.content)) obj.content.forEach(walk);
      if (Array.isArray(obj.items)) obj.items.forEach(walk);
      if (Array.isArray(obj.blocks)) obj.blocks.forEach(walk);
    }
  };

  walk(content);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

/** Truncate to a clean length for meta descriptions (no mid-word cuts). */
export function clampDescription(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const slice = clean.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  return `${(lastSpace > 40 ? slice.slice(0, lastSpace) : slice).trim()}…`;
}

/**
 * Render a JSON-LD `<script>` tag. Kept as a server component so structured
 * data ships in the initial HTML where crawlers/LLM fetchers can read it.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return React.createElement("script", {
    type: "application/ld+json",
    // JSON.stringify escapes <,> sufficiently for embedding in a script tag
    // because the payload comes from our own structured data, not raw user HTML.
    dangerouslySetInnerHTML: { __html: JSON.stringify(data) },
  });
}
