import { NextResponse } from 'next/server';

/**
 * Server-side Turnstile verification for the checkout flow.
 *
 * The browser never calls siteverify itself — it would have to hold the
 * secret to do so. The widget hands the page a token, the page posts it
 * here, and this route exchanges it with Cloudflare.
 *
 * Fails closed: any missing configuration, malformed token, network error,
 * non-2xx response, wrong action, or unexpected hostname is a 403.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/** Must match the `action` the checkout widget is rendered with. */
const EXPECTED_ACTION = 'checkout';

/** Cloudflare tokens are well under this; the cap just bounds what we forward. */
const MAX_TOKEN_LENGTH = 2048;

interface SiteverifyResult {
  success?: boolean;
  action?: string;
  hostname?: string;
  'error-codes'?: string[];
}

function forbidden() {
  return NextResponse.json({ ok: false }, { status: 403 });
}

export async function POST(request: Request) {
  const secret = process.env.TURNSTILE_SECRET;
  const expectedHostnames = new Set(
    (process.env.TURNSTILE_HOSTNAMES ?? '')
      .split(',')
      .map((hostname) => hostname.trim())
      .filter(Boolean)
  );

  if (!secret || expectedHostnames.size === 0) {
    console.error('[turnstile] TURNSTILE_SECRET or TURNSTILE_HOSTNAMES is not configured');
    return forbidden();
  }

  let token: unknown;
  try {
    const body = await request.json();
    token = (body as Record<string, unknown>)?.token;
  } catch {
    return forbidden();
  }

  if (typeof token !== 'string' || token.length === 0 || token.length > MAX_TOKEN_LENGTH) {
    return forbidden();
  }

  // Behind Cloudflare + Traefik, so the client address is only in the
  // forwarded header. It is advisory for Cloudflare, not a trust boundary.
  const clientIp =
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    '';

  let result: SiteverifyResult;
  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(10_000),
      body: new URLSearchParams({
        secret,
        response: token,
        ...(clientIp ? { remoteip: clientIp } : {}),
      }),
    });
    if (!response.ok) throw new Error(`siteverify ${response.status}`);
    result = (await response.json()) as SiteverifyResult;
  } catch (error) {
    console.error('[turnstile] siteverify call failed', error);
    return forbidden();
  }

  if (
    result.success !== true ||
    result.action !== EXPECTED_ACTION ||
    typeof result.hostname !== 'string' ||
    !expectedHostnames.has(result.hostname)
  ) {
    console.warn('[turnstile] rejected', {
      success: result.success,
      action: result.action,
      hostname: result.hostname,
      errors: result['error-codes'],
    });
    return forbidden();
  }

  return NextResponse.json({ ok: true });
}
