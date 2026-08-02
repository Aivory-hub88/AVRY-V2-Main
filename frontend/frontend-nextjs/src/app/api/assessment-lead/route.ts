export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

/**
 * Free assessment lead capture.
 *
 * The public /free-diagnostic page POSTs here when a visitor unlocks their
 * report cards with an email address. This route exists only to keep
 * LEAD_INGEST_TOKEN server-side — the browser never sees it — and forwards to
 * avry-backend over the internal Docker network.
 *
 * Backend: POST /api/v1/assessment-leads/internal (app/routes/assessment_leads.py)
 */

const BACKEND_URL = process.env.BACKEND_SERVICE_URL || 'http://avry-backend:8081';
const INGEST_TOKEN = process.env.LEAD_INGEST_TOKEN;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function str(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const email = str(body.email, 255)?.toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, error: 'invalid_email' }, { status: 400 });
  }

  if (!INGEST_TOKEN) {
    // Misconfiguration, not a user error. Loud in the logs, quiet on the page —
    // the caller unlocks the download anyway rather than punishing the visitor.
    console.error('[assessment-lead] LEAD_INGEST_TOKEN is not set — lead dropped');
    return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 });
  }

  const score = typeof body.score === 'number' && Number.isFinite(body.score)
    ? Math.max(0, Math.min(100, Math.round(body.score)))
    : undefined;

  const answers = body.answers && typeof body.answers === 'object' && !Array.isArray(body.answers)
    ? (body.answers as Record<string, unknown>)
    : {};

  const toLabels = (value: unknown): string[] =>
    Array.isArray(value)
      ? value.filter((v): v is string => typeof v === 'string').slice(0, 10).map(v => v.slice(0, 120))
      : [];

  // Cloudflare proxies this site, so x-forwarded-for's first hop is a CF edge IP.
  const ip = request.headers.get('cf-connecting-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || undefined;

  const payload = {
    email,
    companyName: str(body.companyName, 200),
    industry: str(body.industry, 100),
    companySize: str(body.companySize, 50),
    score,
    maturity: str(body.maturity, 50),
    answers: Object.fromEntries(
      Object.entries(answers)
        .filter(([, v]) => typeof v === 'number')
        .slice(0, 50),
    ),
    strengths: toLabels(body.strengths),
    blockers: toLabels(body.blockers),
    source: str(body.source, 50) || 'free-assessment',
    // Which question set produced `answers`. Rows written before the ops
    // rework carry no value and default to 1 in the database; anything
    // unrecognised is treated the same way rather than stored as a guess.
    questionSetVersion: typeof body.questionSetVersion === 'number' && Number.isInteger(body.questionSetVersion)
      ? Math.max(1, Math.min(99, body.questionSetVersion))
      : undefined,
    ip,
    userAgent: request.headers.get('user-agent')?.slice(0, 512) || undefined,
  };

  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/assessment-leads/internal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Token': INGEST_TOKEN },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      // Log the real reason; return a generic one so backend internals and the
      // existence of the internal endpoint stay off the public surface.
      console.error(`[assessment-lead] backend responded ${res.status}: ${await res.text()}`);
      return NextResponse.json({ ok: false, error: 'upstream_error' }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[assessment-lead] forward failed:', error);
    return NextResponse.json({ ok: false, error: 'upstream_unreachable' }, { status: 502 });
  }
}
