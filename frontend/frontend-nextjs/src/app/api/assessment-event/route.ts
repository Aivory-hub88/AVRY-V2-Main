export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

/**
 * Free assessment funnel beacon.
 *
 * Companion to /api/assessment-lead: that route records the people who handed
 * over an email, this one records everyone else — how many started and which
 * question they abandoned. Exists for the same reason as its sibling, to keep
 * LEAD_INGEST_TOKEN server-side, and forwards over the internal Docker network.
 *
 * Backend: POST /api/v1/assessment-leads/events/internal
 *
 * Note: this path must stay in the `main-app-api` Traefik carve-out in
 * docker-compose.prod.yml. Without it, `user-dashboard-api` matches
 * PathPrefix(`/api`) at a higher priority and answers with the dashboard's 404.
 */

const BACKEND_URL = process.env.BACKEND_SERVICE_URL || 'http://avry-backend:8081';
const INGEST_TOKEN = process.env.LEAD_INGEST_TOKEN;

const ALLOWED_EVENTS = new Set(['start', 'step', 'complete', 'lead']);

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

  const sessionId = str(body.sessionId, 64);
  const event = str(body.event, 40);
  if (!sessionId || sessionId.length < 8 || !event || !ALLOWED_EVENTS.has(event)) {
    return NextResponse.json({ ok: false, error: 'invalid_event' }, { status: 400 });
  }

  // A missing token is a misconfiguration, but a funnel breadcrumb is not worth
  // a 503 on the visitor's console. Loud in the logs, silent on the page.
  if (!INGEST_TOKEN) {
    console.error('[assessment-event] LEAD_INGEST_TOKEN is not set — event dropped');
    return NextResponse.json({ ok: false, error: 'not_configured' });
  }

  const step = typeof body.step === 'number' && Number.isInteger(body.step)
    ? Math.max(0, Math.min(99, body.step))
    : undefined;

  const payload = {
    sessionId,
    event,
    step,
    locale: str(body.locale, 10),
    industry: str(body.industry, 100),
    companySize: str(body.companySize, 50),
    questionSetVersion:
      typeof body.questionSetVersion === 'number' && Number.isInteger(body.questionSetVersion)
        ? Math.max(1, Math.min(99, body.questionSetVersion))
        : 1,
  };

  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/assessment-leads/events/internal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': INGEST_TOKEN,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error(`[assessment-event] backend responded ${res.status}`);
      return NextResponse.json({ ok: false, error: 'backend_error' });
    }
  } catch (err) {
    console.error('[assessment-event] backend unreachable:', err);
    return NextResponse.json({ ok: false, error: 'unreachable' });
  }

  return NextResponse.json({ ok: true });
}
