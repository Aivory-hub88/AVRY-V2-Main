/**
 * Diagnostic result model and defensive normalization.
 *
 * The backend-provided diagnostic result may arrive in any shape (it crosses a
 * network boundary), so `normalizeDiagnosticResult` accepts `unknown` and
 * coerces every field to a safe default. It never throws.
 *
 * Normalization rules (Requirement 12):
 * - `score`: absent / null / non-numeric → 0, then clamp to [0, 100]
 *   (NaN is treated as non-numeric → 0).
 * - `category` / `recommendation` / `category_explanation`:
 *   absent / null / non-string → `""`.
 * - `insights`: absent / null / not-an-array → `[]`.
 * - `badge_svg` / `diagnostic_id`: preserved when present and a string,
 *   otherwise left `undefined`.
 */

import { clamp } from "./helpers";

/**
 * The backend-provided diagnostic result model.
 */
export interface DiagnosticResult {
  /** Readiness score in the inclusive range [0, 100]. */
  score: number;
  /** Category label, e.g. "Emerging", "Advanced". */
  category: string;
  /** Human-readable explanation of the category. */
  category_explanation: string;
  /** List of insight strings. */
  insights: string[];
  /** Recommended next step. */
  recommendation: string;
  /** Server-rendered SVG markup for the badge, when available. */
  badge_svg?: string;
  /** Diagnostic identifier, used for ID-chain migration after sign-up. */
  diagnostic_id?: string;
}

/**
 * Type guard for plain, non-null object records.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Coerce an arbitrary value to a string, defaulting to `""` when the value is
 * absent, null, or not a string.
 */
function normalizeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * Coerce an arbitrary value to a numeric score: absent / null / non-numeric
 * (including `NaN`) become 0, then the result is clamped to [0, 100].
 */
function normalizeScore(value: unknown): number {
  const numeric = typeof value === "number" && !Number.isNaN(value) ? value : 0;
  return clamp(numeric, 0, 100);
}

/**
 * Preserve a string value when present, otherwise return `undefined` so the
 * optional field is omitted rather than coerced.
 */
function normalizeOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/**
 * Normalize an arbitrary backend payload into a safe {@link DiagnosticResult}.
 *
 * This function is total and defensive: it accepts any input shape and never
 * throws, returning a fully-populated result with safe defaults for every
 * missing or invalid field.
 *
 * @param raw - The raw, untrusted value from the backend (any shape).
 * @returns A normalized {@link DiagnosticResult}.
 */
export function normalizeDiagnosticResult(raw: unknown): DiagnosticResult {
  const source = isRecord(raw) ? raw : {};

  const result: DiagnosticResult = {
    score: normalizeScore(source.score),
    category: normalizeString(source.category),
    category_explanation: normalizeString(source.category_explanation),
    insights: Array.isArray(source.insights) ? source.insights : [],
    recommendation: normalizeString(source.recommendation),
  };

  const badgeSvg = normalizeOptionalString(source.badge_svg);
  if (badgeSvg !== undefined) {
    result.badge_svg = badgeSvg;
  }

  const diagnosticId = normalizeOptionalString(source.diagnostic_id);
  if (diagnosticId !== undefined) {
    result.diagnostic_id = diagnosticId;
  }

  return result;
}
