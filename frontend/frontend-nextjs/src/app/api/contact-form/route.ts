export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

/**
 * Contact page and homepage transformation-intake form submissions.
 *
 * Keeps N8N_CONTACT_WEBHOOK_URL and CONTACT_FORM_TOKEN server-side and
 * forwards to the n8n workflow that does the actual sending:
 *
 *   n8n workflow "Aivory — Contact & Intake Email" (gu4oldpbcOn98zrt)
 *   POST /webhook/aivory-contact-intake
 */

const WEBHOOK_URL = process.env.N8N_CONTACT_WEBHOOK_URL;
const CONTACT_TOKEN = process.env.CONTACT_FORM_TOKEN;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function str(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export async function POST(request: NextRequest) {
  if (!WEBHOOK_URL || !CONTACT_TOKEN) {
    console.error('[contact-form] N8N_CONTACT_WEBHOOK_URL or CONTACT_FORM_TOKEN not set — submission skipped');
    return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const formType = str(body.formType, 20);

  let payload: Record<string, unknown>;

  if (formType === 'contact') {
    const name = str(body.name, 200);
    const company = str(body.company, 200);
    const email = str(body.email, 255).toLowerCase();
    const message = str(body.message, 5000);
    if (!name || !company || !EMAIL_RE.test(email) || !message) {
      return NextResponse.json({ ok: false, error: 'invalid_fields' }, { status: 400 });
    }
    payload = { formType, name, company, email, message };
  } else if (formType === 'intake') {
    const firstName = str(body.first_name, 100);
    const lastName = str(body.last_name, 100);
    const jobTitle = str(body.job_title, 150);
    const companyName = str(body.company_name, 200);
    const businessEmail = str(body.business_email, 255).toLowerCase();
    const country = str(body.country, 100);
    const companySize = str(body.company_size, 50);
    const industry = str(body.industry, 100);
    const primaryObjective = str(body.primary_objective, 150);
    const currentAiAdoption = str(body.current_ai_adoption, 100);
    if (
      !firstName || !lastName || !jobTitle || !companyName || !EMAIL_RE.test(businessEmail) ||
      !country || !companySize || !industry || !primaryObjective || !currentAiAdoption
    ) {
      return NextResponse.json({ ok: false, error: 'invalid_fields' }, { status: 400 });
    }
    payload = {
      formType,
      first_name: firstName,
      last_name: lastName,
      job_title: jobTitle,
      company_name: companyName,
      business_email: businessEmail,
      phone_number: str(body.phone_number, 50),
      country,
      company_size: companySize,
      industry,
      primary_objective: primaryObjective,
      current_ai_adoption: currentAiAdoption,
      message: str(body.message, 5000),
    };
  } else {
    return NextResponse.json({ ok: false, error: 'unknown_form_type' }, { status: 400 });
  }

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: CONTACT_TOKEN, ...payload }),
      signal: AbortSignal.timeout(15000),
    });

    const raw = await res.text();

    // A 2xx from n8n is not proof of delivery — only the Respond node's
    // explicit { ok: true } means the mail went out.
    let acknowledged = false;
    try {
      acknowledged = (JSON.parse(raw) as { ok?: unknown })?.ok === true;
    } catch {
      acknowledged = false;
    }

    if (!res.ok || !acknowledged) {
      console.error(`[contact-form] n8n did not confirm delivery (${res.status}): ${raw || '<empty body>'}`);
      return NextResponse.json({ ok: false, error: 'upstream_error' }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[contact-form] forward failed:', error);
    return NextResponse.json({ ok: false, error: 'upstream_unreachable' }, { status: 502 });
  }
}
