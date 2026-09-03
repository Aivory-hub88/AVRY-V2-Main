/**
 * Server-side funnel breadcrumbs for the free assessment.
 *
 * The page already fires the same milestones into GA4 via trackEvent, but a
 * large share of those hits never arrive — ad blockers drop gtag outright — and
 * what does arrive lands in GA rather than in our own admin dashboard. These
 * beacons answer the two questions the dashboard opens with: how many people
 * started, and which question they quit on.
 *
 * Nothing here identifies anyone. The session id is random, per-visit, and has
 * no link to an account or an email; the payload carries no address, IP or user
 * agent. Backend: POST /api/v1/assessment-leads/events/internal.
 */

const SESSION_KEY = 'aivory_assessment_session';

export type FunnelEvent = 'start' | 'step' | 'complete' | 'lead';

export interface FunnelPayload {
  step?: number;
  locale?: string;
  industry?: string;
  companySize?: string;
  questionSetVersion?: number;
}

/**
 * One id per visit, held in sessionStorage so a reload does not read as a
 * second visitor — counting reloads as starts would quietly depress every
 * completion rate on the dashboard.
 */
export function getFunnelSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const fresh =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID().replace(/-/g, '')
        : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
    window.sessionStorage.setItem(SESSION_KEY, fresh);
    return fresh;
  } catch {
    // Private-mode Safari throws on sessionStorage. A per-call id still counts
    // the visit; it just cannot be joined across steps.
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  }
}

/**
 * Fire and forget. `keepalive` lets the request outlive the page when someone
 * abandons mid-question — the abandonment is exactly the data we want. Every
 * failure is swallowed: analytics must never be able to break the assessment.
 */
export function recordFunnelEvent(event: FunnelEvent, payload: FunnelPayload = {}): void {
  if (typeof window === 'undefined') return;
  const sessionId = getFunnelSessionId();
  if (!sessionId) return;

  try {
    void fetch('/api/assessment-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, event, ...payload }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Ignore.
  }
}
