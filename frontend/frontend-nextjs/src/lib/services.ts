/**
 * Microservice base URLs.
 *
 * For SERVER-SIDE rendering (SSR), we use Docker-internal URLs so the fetch
 * happens over the internal Docker network (e.g., http://avry-blog:8089).
 * These are set via non-NEXT_PUBLIC env vars at runtime.
 *
 * For CLIENT-SIDE rendering, we use NEXT_PUBLIC_* vars which are baked into
 * the JS bundle at build time and route through Traefik/public URLs.
 *
 * No trailing slash.
 */

const isServer = typeof window === "undefined";

const SHARED =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8081";

function svc(specific: string | undefined): string {
  return (specific || SHARED).replace(/\/$/, "");
}

/**
 * Server-side internal URLs for Docker networking.
 * These bypass Traefik and hit services directly.
 */
const SERVER_URLS: Record<string, string | undefined> = {
  blog: process.env.BLOG_SERVICE_URL,       // e.g. http://avry-blog:8089
  careers: process.env.CAREERS_SERVICE_URL,  // e.g. http://avry-careers:8090
  backend: process.env.BACKEND_SERVICE_URL,  // e.g. http://avry-backend:8081
};

/**
 * Client-side public URLs (baked at build time via NEXT_PUBLIC_*).
 */
export const SERVICE_URLS = {
  backend: svc(process.env.NEXT_PUBLIC_BACKEND_URL),
  payments: svc(process.env.NEXT_PUBLIC_PAYMENTS_URL),
  diagnostics: svc(process.env.NEXT_PUBLIC_DIAGNOSTICS_URL),
  blueprint: svc(process.env.NEXT_PUBLIC_BLUEPRINT_URL),
  roadmap: svc(process.env.NEXT_PUBLIC_ROADMAP_URL),
  workflows: svc(process.env.NEXT_PUBLIC_WORKFLOWS_URL),
  blog: svc(process.env.NEXT_PUBLIC_BLOG_URL),
  careers: svc(process.env.NEXT_PUBLIC_CAREERS_URL),
} as const;

export type ServiceName = keyof typeof SERVICE_URLS;

/**
 * Get the base URL for a service.
 * On the server, prefers Docker-internal URLs for direct container-to-container
 * communication. Falls back to the public NEXT_PUBLIC_* URL.
 */
export function getServiceUrl(name: ServiceName): string {
  if (isServer) {
    const internalUrl = SERVER_URLS[name];
    if (internalUrl) {
      return internalUrl.replace(/\/$/, "");
    }
  }
  return SERVICE_URLS[name];
}

/**
 * Like `getServiceUrl`, but returns `null` when the base is not usable by
 * `fetch` in the current environment.
 *
 * The public URLs are deliberately relative in production (`/api/careers`), so
 * the browser goes through Traefik on whatever host it is already on. A
 * relative base is fine there and unusable on the server, where `fetch`
 * demands an origin.
 *
 * That gap is exactly what happens during `docker build`: the NEXT_PUBLIC_*
 * args are set for the builder stage but the *_SERVICE_URL ones are only set
 * on the runner, so prerendering fell through to the relative URL and threw
 * ERR_INVALID_URL. Returning null lets callers skip the fetch and serve their
 * empty state, which is the correct build-time answer anyway — the service
 * containers are not on the network during a build.
 */
export function resolveFetchBase(name: ServiceName): string | null {
  const base = getServiceUrl(name);
  if (!isServer) return base;
  return /^https?:\/\//i.test(base) ? base : null;
}
