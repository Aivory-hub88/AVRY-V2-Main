import { NextResponse, type NextRequest } from 'next/server';

/**
 * Host canonicalisation middleware.
 *
 * Goal: only `https://aivory.uk` ever appears in Google's index. The legacy
 * `.id` apex + `www` host still serves the same Next.js app via Traefik
 * (see docker-compose.production.yml `avry-website` router), and
 * `www.aivory.uk` points at the same origin through Cloudflare. Without an
 * explicit redirect those are perfect "mirror" duplicates that Google lists
 * as separate URLs even when canonical signals point at `aivory.uk`.
 *
 * This middleware issues a single 308 Permanent Redirect for any request
 * arriving on a non-canonical public host, preserving pathname + search so
 * deep links (e.g. `aivory.id/careers/<uuid>`) collapse onto the canonical
 * origin. Browsers/visitors follow the redirect transparently; Googlebot
 * follows 308 too and drops the legacy URL from the index in favour of
 * `aivory.uk`.
 *
 * Hosts that pass through unchanged:
 *  - `aivory.uk`                       (canonical origin)
 *  - `localhost`, `127.0.0.1`, `0.0.0.0`, `[::1]`  (local dev — never break DX)
 *  - anything else                     (staging subdomains, internal health
 *                                       probes, etc. — handled by their own
 *                                       routing/robots policy, not here)
 *
 * Hosts redirected 308 → `https://aivory.uk{path}{search}`:
 *  - `www.aivory.uk`                   (apex is canonical)
 *  - `aivory.id`                       (legacy domain)
 *  - `www.aivory.id`                   (legacy domain)
 *
 * Reading the inbound host: Cloudflare Worker preserves `Host: aivory.uk`
 * and sets `X-Forwarded-Host`. Traefik passes `Host: aivory.id` to the
 * container. We honour the forwarded header first (so the canonical host
 * stays correct even through an intermediary that rewrites Host), then fall
 * back to the raw `Host`.
 */

const CANONICAL_HOST = 'aivory.uk';

// Public hosts that NEVER reach the canonical origin and must be redirected.
const REDIRECT_HOSTS = new Set<string>([
  'www.aivory.uk', // collapse `www` onto the apex
  'aivory.id', // legacy apex
  'www.aivory.id', // legacy `www`
]);

// Local-only hosts that are always passed through so `next dev` keeps working.
const LOCAL_HOSTS = new Set<string>([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '[::1]',
]);

function requestHostname(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-host');
  const raw = (forwarded || request.headers.get('host') || '').toLowerCase();
  // Trim any `:port` suffix; comparisons are hostname-only.
  return raw.split(':')[0];
}

export function middleware(request: NextRequest): NextResponse | undefined {
  // Cloudflare's `aivory-uk-reverse-proxy` Worker canonicalizes public hosts
  // at the edge and forwards the request to the origin with Host: aivory.id
  // (the Traefik routing key) plus `x-aivory-skip-redirect: 1`. When this
  // header is present, we MUST NOT touch the request here — otherwise we'd
  // 308 it back to aivory.uk and form an infinite redirect loop with the
  // edge. The check below preserves defense-in-depth for direct-origin hits
  // (e.g. via VPS IP with Host: aivory.id) while staying invisible to the
  // proxied production path.
  if (request.headers.get('x-aivory-skip-redirect') === '1') {
    return;
  }

  // Legacy path redirects: old URLs that moved to new canonical paths.
  // /diagnostic was the old diagnostic entry point; it now lives at
  // /free-diagnostic. Return a 301 so search engines transfer link equity
  // and users are never stranded on a 404.
  const LEGACY_PATH_REDIRECTS: Record<string, string> = {
    '/diagnostic': '/free-diagnostic',
    '/diagnostic/': '/free-diagnostic',
  };

  const pathname = request.nextUrl.pathname;

  if (LEGACY_PATH_REDIRECTS[pathname]) {
    const target = new URL(LEGACY_PATH_REDIRECTS[pathname], request.url);
    target.search = request.nextUrl.search;
    return NextResponse.redirect(target, 301);
  }

  const hostname = requestHostname(request);

  // Always bypass local development origins.
  if (LOCAL_HOSTS.has(hostname) || hostname.endsWith('.local')) {
    return;
  }

  // Already on the canonical origin — nothing to do.
  if (hostname === CANONICAL_HOST) {
    return;
  }

  // Unknown / staging / internal hosts are left alone so this middleware
  // never accidentally funnels non-public traffic through the apex.
  if (!REDIRECT_HOSTS.has(hostname)) {
    return;
  }

  // Known mirror host → 308 to the canonical origin with the full path
  // and query string preserved. `URL` is constructed from the absolute
  // `request.url` so `pathname` and `search` come along untouched.
  const target = new URL(request.url);
  target.protocol = 'https:';
  target.host = CANONICAL_HOST;
  target.port = '';

  return NextResponse.redirect(target, 308);
}

/**
 * Run on every inbound request. Static asset requests (`/_next/static/*`,
 * `/favicon.ico`, etc.) are filtered out by Next.js before `middleware` is
 * invoked, so this matcher costs nothing for those paths.
 */
export const config = {
  matcher: ['/:path*'],
};