export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

/**
 * Emails the free-assessment report cards to the visitor.
 *
 * The report cards only exist in the browser — they are rendered client-side
 * from the live DOM by html-to-image — so the browser has to hand them over
 * for delivery. This route keeps REPORT_EMAIL_TOKEN and the webhook URL
 * server-side and forwards to the n8n workflow that does the actual sending:
 *
 *   n8n workflow "Aivory — Free Assessment Report Email" (PwzKyVa3SZlZpnd1)
 *   POST /webhook/aivory-assessment-report
 */

const WEBHOOK_URL = process.env.N8N_REPORT_WEBHOOK_URL;
const REPORT_TOKEN = process.env.REPORT_EMAIL_TOKEN;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Two 1080x1350 PNGs at pixelRatio 1, base64-encoded, land well under this.
// Anything larger is either a bug or someone probing the endpoint.
const MAX_BODY_BYTES = 8 * 1024 * 1024;

interface IncomingCard {
  fileName?: unknown;
  dataUrl?: unknown;
}

export async function POST(request: NextRequest) {
  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: 'payload_too_large' }, { status: 413 });
  }

  if (!WEBHOOK_URL || !REPORT_TOKEN) {
    console.error('[assessment-report-email] N8N_REPORT_WEBHOOK_URL or REPORT_EMAIL_TOKEN not set — email skipped');
    return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, error: 'invalid_email' }, { status: 400 });
  }

  const rawCards = Array.isArray(body.cards) ? (body.cards as IncomingCard[]) : [];
  const cards = rawCards
    .slice(0, 2)
    .map(card => {
      const dataUrl = typeof card?.dataUrl === 'string' ? card.dataUrl : '';
      // Strip the data: prefix here so the workflow only ever sees raw base64.
      const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
      if (!match) return null;
      return {
        fileName: typeof card?.fileName === 'string' ? card.fileName.slice(0, 120) : 'report-card.png',
        dataBase64: match[1],
      };
    })
    .filter((card): card is { fileName: string; dataBase64: string } => card !== null);

  // The PDF is the primary artefact — it is what gets forwarded to a budget
  // holder and printed, and unlike a PNG it can carry a clickable CTA. The
  // `cards` path stays accepted so a browser that failed to build a PDF can
  // still get something delivered.
  const rawPdf = body.pdf as { fileName?: unknown; dataBase64?: unknown } | undefined;
  const pdfBase64 = typeof rawPdf?.dataBase64 === 'string'
    && /^[A-Za-z0-9+/=]+$/.test(rawPdf.dataBase64)
    ? rawPdf.dataBase64
    : null;
  const pdf = pdfBase64
    ? {
        fileName: typeof rawPdf?.fileName === 'string' ? rawPdf.fileName.slice(0, 120) : 'assessment-report.pdf',
        dataBase64: pdfBase64,
      }
    : null;

  if (!pdf && cards.length === 0) {
    return NextResponse.json({ ok: false, error: 'no_report' }, { status: 400 });
  }

  const str = (value: unknown, max: number) =>
    typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : undefined;

  const toLabels = (value: unknown): string[] =>
    Array.isArray(value)
      ? value.filter((v): v is string => typeof v === 'string').slice(0, 5).map(v => v.slice(0, 120))
      : [];

  const payload = {
    token: REPORT_TOKEN,
    email,
    companyName: str(body.companyName, 200),
    maturity: str(body.maturity, 50),
    score: typeof body.score === 'number' && Number.isFinite(body.score)
      ? Math.max(0, Math.min(100, Math.round(body.score)))
      : undefined,
    strengths: toLabels(body.strengths),
    blockers: toLabels(body.blockers),
    // The workflow does not branch on this yet, but the label vocabulary in
    // strengths/blockers is question-set specific — passing the version lets
    // the email template change without a frontend redeploy.
    questionSetVersion: typeof body.questionSetVersion === 'number' && Number.isInteger(body.questionSetVersion)
      ? Math.max(1, Math.min(99, body.questionSetVersion))
      : undefined,
    pdf,
    cards,
  };

  try {
    // Generous timeout: n8n has to decode ~1MB of base64 and hand it to SMTP.
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000),
    });

    const raw = await res.text();

    // A 2xx from n8n is not proof of delivery: when a workflow errors before
    // reaching its Respond node, n8n still answers 200 with an empty body.
    // Only the Respond node's explicit { ok: true } means the mail went out.
    let acknowledged = false;
    try {
      acknowledged = (JSON.parse(raw) as { ok?: unknown })?.ok === true;
    } catch {
      acknowledged = false;
    }

    if (!res.ok || !acknowledged) {
      console.error(`[assessment-report-email] n8n did not confirm delivery (${res.status}): ${raw || '<empty body>'}`);
      return NextResponse.json({ ok: false, error: 'upstream_error' }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[assessment-report-email] forward failed:', error);
    return NextResponse.json({ ok: false, error: 'upstream_unreachable' }, { status: 502 });
  }
}
