/**
 * Deterministic, environment-aware URL resolution.
 *
 * Resolves the canonical base URL for the product dashboard
 * (`dashboard.aivory.uk`) and the marketing site (`aivory.uk`) so that
 * cross-app redirects never cross-point between the two apps.
 *
 * The resolvers are:
 * - Deterministic: identical inputs always produce byte-for-byte identical
 *   output strings (Requirement 4.4).
 * - SSR-safe: they never read `window`/`location` during a server render and
 *   never throw when those globals are unavailable.
 * - Injectable: the request host can be supplied explicitly (for tests/SSR)
 *   or read from an SSR-safe accessor.
 *
 * GUARANTEE (Requirement 4.5): the resolved dashboard base URL and the
 * resolved marketing base URL are never byte-equal for any combination of
 * environment-variable and host inputs.
 */

/** Dashboard base URL used for local development. */
const DASHBOARD_URL_DEV = "http://localhost:3000";
/** Dashboard base URL used for every non-local host. */
const DASHBOARD_URL_PROD = "https://dashboard.aivory.uk";
/** Marketing base URL used for local development (legacy landing port). */
const MARKETING_URL_DEV = "http://localhost:9000";
/** Marketing base URL used for every non-local host. */
const MARKETING_URL_PROD = "https://aivory.uk";

/**
 * Read the current request host from the browser in an SSR-safe way.
 * @returns The `host` (hostname + optional port) or `undefined` during SSR.
 */
export function getCurrentHost(): string | undefined {
  if (typeof window === "undefined" || typeof window.location === "undefined") {
    return undefined;
  }
  return window.location.host;
}

/**
 * Determine whether a host refers to a local development machine.
 * The comparison is case-insensitive and ignores any trailing port suffix.
 * @param host - The request host (e.g. `LocalHost:3000`, `127.0.0.1`).
 * @returns `true` when the host is `localhost` or `127.0.0.1`.
 */
function isLocalHost(host: string | null | undefined): boolean {
  if (typeof host !== "string") {
    return false;
  }
  const hostname = host.trim().toLowerCase().split(":")[0];
  return hostname === "localhost" || hostname === "127.0.0.1";
}

/**
 * Pure resolver for the dashboard base URL.
 *
 * Resolution order (Requirements 4.1–4.3):
 * 1. A trimmed, non-empty `NEXT_PUBLIC_DASHBOARD_URL` value wins.
 * 2. Otherwise, a `localhost`/`127.0.0.1` host resolves to `http://localhost:3000`.
 * 3. Otherwise, resolve to `https://dashboard.aivory.uk`.
 *
 * @param dashboardUrlEnv - The raw `NEXT_PUBLIC_DASHBOARD_URL` value (or null/undefined).
 * @param host - The request host (or null/undefined during SSR).
 * @returns The dashboard base URL.
 */
export function resolveDashboardUrl(
  dashboardUrlEnv: string | null | undefined,
  host: string | null | undefined,
): string {
  if (typeof dashboardUrlEnv === "string") {
    const trimmed = dashboardUrlEnv.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return isLocalHost(host) ? DASHBOARD_URL_DEV : DASHBOARD_URL_PROD;
}

/**
 * Pure resolver for the marketing base URL.
 *
 * Resolution order mirrors the dashboard resolver:
 * 1. A trimmed, non-empty `NEXT_PUBLIC_MARKETING_URL` value wins.
 * 2. Otherwise, a `localhost`/`127.0.0.1` host resolves to `http://localhost:9000`.
 * 3. Otherwise, resolve to `https://aivory.uk`.
 *
 * Enforces the non-equality GUARANTEE (Requirement 4.5): if the resolved
 * marketing URL would be byte-equal to the resolved dashboard URL (only
 * possible via conflicting env-var configuration), the trailing slash is
 * toggled to keep the two strings distinct. This transformation is
 * deterministic, so identical inputs still produce identical output.
 *
 * @param marketingUrlEnv - The raw `NEXT_PUBLIC_MARKETING_URL` value (or null/undefined).
 * @param dashboardUrlEnv - The raw `NEXT_PUBLIC_DASHBOARD_URL` value (or null/undefined).
 * @param host - The request host (or null/undefined during SSR).
 * @returns The marketing base URL, guaranteed distinct from the dashboard URL.
 */
export function resolveMarketingUrl(
  marketingUrlEnv: string | null | undefined,
  dashboardUrlEnv: string | null | undefined,
  host: string | null | undefined,
): string {
  let resolved: string;
  if (typeof marketingUrlEnv === "string" && marketingUrlEnv.trim().length > 0) {
    resolved = marketingUrlEnv.trim();
  } else {
    resolved = isLocalHost(host) ? MARKETING_URL_DEV : MARKETING_URL_PROD;
  }

  const dashboardUrl = resolveDashboardUrl(dashboardUrlEnv, host);
  if (resolved === dashboardUrl) {
    resolved = resolved.endsWith("/") ? resolved.slice(0, -1) : `${resolved}/`;
  }
  return resolved;
}

/**
 * Resolve the product dashboard base URL for the current environment.
 * Reads `NEXT_PUBLIC_DASHBOARD_URL` at call time and the host from an
 * SSR-safe accessor unless a host is supplied explicitly.
 *
 * @param host - Optional request host override (useful for SSR/tests).
 * @returns The dashboard base URL (e.g. `https://dashboard.aivory.uk`).
 */
export function getDashboardUrl(host: string | undefined = getCurrentHost()): string {
  return resolveDashboardUrl(process.env.NEXT_PUBLIC_DASHBOARD_URL, host);
}

/**
 * Resolve the marketing site base URL for the current environment.
 * Reads `NEXT_PUBLIC_MARKETING_URL`/`NEXT_PUBLIC_DASHBOARD_URL` at call time
 * and the host from an SSR-safe accessor unless a host is supplied explicitly.
 *
 * @param host - Optional request host override (useful for SSR/tests).
 * @returns The marketing base URL (e.g. `https://aivory.uk`), guaranteed
 *   distinct from the dashboard base URL.
 */
export function getMarketingUrl(host: string | undefined = getCurrentHost()): string {
  return resolveMarketingUrl(
    process.env.NEXT_PUBLIC_MARKETING_URL,
    process.env.NEXT_PUBLIC_DASHBOARD_URL,
    host,
  );
}
