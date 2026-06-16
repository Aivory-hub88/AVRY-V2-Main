"use client";

/**
 * UpgradeHandoff
 *
 * The "Sign in / Upgrade" call-to-action shown on the marketing results page.
 * Clicking the CTA logs the user in through the legacy AuthManager (accessed
 * via the SSR-safe accessor) and, for paid-tier users, hands off to the
 * product dashboard.
 *
 * Behavior:
 * - Paid users are redirected to the dashboard base URL resolved by
 *   {@link getDashboardUrl} (Requirement 2.5). The redirect happens
 *   immediately after authentication completes (well within the 2-second
 *   budget).
 * - If the dashboard URL cannot be resolved to a usable absolute URL (the
 *   resolver returns an empty or otherwise unusable value), the user STAYS on
 *   the marketing site and a hand-off error indication is shown instead of
 *   redirecting (Requirement 2.7).
 *
 * SSR safety: the component never touches `window` or `AuthManager` directly.
 * It reads them through the SSR-safe accessors `getWindow`/`getAuthManager`,
 * which return server-safe defaults during a server render. The hand-off logic
 * runs only inside a client click handler, so the browser globals are always
 * available when used.
 *
 * _Requirements: 2.5, 2.7_
 */

import { useState } from "react";
import { getAuthManager, getWindow } from "@/lib/ssr-safe";
import { getDashboardUrl } from "@/lib/config";
import type { DiagnosticResult } from "@/lib/diagnostic-result";

/**
 * Tiers permitted operational dashboard access. Mirrors the shared
 * `PAID_TIERS` set from the design; a user on any of these tiers is handed off
 * to the product dashboard after signing in.
 */
const PAID_TIERS: readonly string[] = [
  "snapshot",
  "blueprint",
  "foundation",
  "pro",
  "enterprise",
];

export interface UpgradeHandoffProps {
  /** The normalized diagnostic result driving the results experience. */
  result: DiagnosticResult;
  /** Optional extra class names applied to the root container. */
  className?: string;
}

/**
 * Resolve the lowercased tier for an arbitrary user object, defaulting to
 * `"free"` when the tier is absent or not a string.
 */
function resolveTier(user: unknown): string {
  if (!user || typeof user !== "object") {
    return "free";
  }
  const tier = (user as { tier?: unknown }).tier;
  if (typeof tier !== "string") {
    return "free";
  }
  return tier.trim().toLowerCase() || "free";
}

/**
 * Determine whether a tier is a paid tier eligible for the dashboard hand-off.
 */
function isPaidTier(tier: string): boolean {
  return PAID_TIERS.includes(tier);
}

/**
 * Determine whether a resolved dashboard URL is usable for a redirect.
 * A usable URL is a non-empty, absolute `http(s)` URL. Anything else (empty,
 * whitespace-only, or unparseable) is treated as unresolved per Requirement 2.7.
 */
function isUsableDashboardUrl(url: string | null | undefined): url is string {
  if (typeof url !== "string") {
    return false;
  }
  const trimmed = url.trim();
  if (trimmed.length === 0) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

const HANDOFF_ERROR_MESSAGE =
  "We couldn't open your dashboard right now. Please try again in a moment.";

/**
 * The sign-in / upgrade hand-off CTA.
 *
 * @param result - The normalized diagnostic result.
 * @param className - Optional extra class names for the root container.
 */
export function UpgradeHandoff({ result, className = "" }: UpgradeHandoffProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async (): Promise<void> => {
    setError(null);
    setIsProcessing(true);

    try {
      const authManager = getAuthManager();
      if (!authManager || typeof authManager.login !== "function") {
        // Auth service unavailable — the hand-off cannot be completed.
        setError(HANDOFF_ERROR_MESSAGE);
        return;
      }

      // Log the user in. AuthManager.login resolves with the user object;
      // fall back to getUser() when it does not return one.
      const loggedInUser = await authManager.login();
      const user =
        loggedInUser ??
        (typeof authManager.getUser === "function" ? authManager.getUser() : null);

      const tier = resolveTier(user);
      if (!isPaidTier(tier)) {
        // Non-paid users are not handed off to the operational dashboard here;
        // they remain on the marketing site to complete an upgrade.
        return;
      }

      // Resolve the dashboard base URL. If it cannot be resolved to a usable
      // URL, stay on the marketing site and surface a hand-off error (Req 2.7).
      const dashboardUrl = getDashboardUrl();
      if (!isUsableDashboardUrl(dashboardUrl)) {
        setError(HANDOFF_ERROR_MESSAGE);
        return;
      }

      // Hand off to the product dashboard (Req 2.5).
      const win = getWindow();
      if (!win) {
        setError(HANDOFF_ERROR_MESSAGE);
        return;
      }
      win.location.assign(dashboardUrl);
    } catch {
      setError(HANDOFF_ERROR_MESSAGE);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={`text-center ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        disabled={isProcessing}
        aria-busy={isProcessing}
        className="inline-flex items-center justify-center rounded-full bg-brand-purple px-8 py-3 font-semibold text-white transition-all duration-200 hover:bg-brand-mint hover:text-bg-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isProcessing ? "Signing in…" : "Sign in / Upgrade"}
      </button>

      {error && (
        <p
          role="alert"
          className="mt-3 text-sm text-error"
          data-testid="upgrade-handoff-error"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export default UpgradeHandoff;
