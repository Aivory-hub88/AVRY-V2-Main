/**
 * Diagnostic API Integration
 * Handles all API calls for diagnostic system
 */

import { getToken } from "./auth";
import { getServiceUrl } from "./services";

const API_BASE_URL = getServiceUrl("diagnostics");

/**
 * Diagnostic result interface
 */
export interface DiagnosticResult {
  diagnostic_id: string;
  user_id: string;
  score: number;
  category: "Foundational" | "Emerging" | "Established" | "Advanced";
  category_explanation: string;
  insights: string[];
  recommendations: string[];
  badge_svg?: string;
  timestamp: string;
}

/**
 * Submit free diagnostic answers to backend
 * @param answers - Object with question IDs as keys and answers as values
 * @param companyName - Optional company name
 * @returns Promise resolving to diagnostic result
 */
export async function submitFreeDiagnostic(
  answers: Record<string, number>,
  companyName?: string
): Promise<DiagnosticResult> {
  try {
    const token = getToken();

    const response = await fetch(`${API_BASE_URL}/api/v1/diagnostic/free`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({
        answers,
        company_name: companyName,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || "Failed to submit diagnostic");
    }

    const result: DiagnosticResult = await response.json();
    return result;
  } catch (error) {
    console.error("[DiagnosticAPI] Submit failed:", error);
    throw error;
  }
}

/**
 * Get diagnostic result by ID
 * @param diagnosticId - Diagnostic ID
 * @returns Promise resolving to diagnostic result
 */
export async function getDiagnosticResult(diagnosticId: string): Promise<DiagnosticResult> {
  try {
    const token = getToken();

    const response = await fetch(`${API_BASE_URL}/api/v1/diagnostic/free/${diagnosticId}`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || "Failed to retrieve diagnostic");
    }

    const result: DiagnosticResult = await response.json();
    return result;
  } catch (error) {
    console.error("[DiagnosticAPI] Get failed:", error);
    throw error;
  }
}

/**
 * Get user's diagnostic history
 * @returns Promise resolving to array of diagnostic results
 */
export async function getDiagnosticHistory(): Promise<DiagnosticResult[]> {
  try {
    const token = getToken();

    if (!token) {
      return [];
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/diagnostic/history`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      throw new Error("Failed to retrieve diagnostic history");
    }

    const results: DiagnosticResult[] = await response.json();
    return results;
  } catch (error) {
    console.error("[DiagnosticAPI] History fetch failed:", error);
    return [];
  }
}

/**
 * Calculate diagnostic score locally (fallback)
 * Used when backend is unavailable
 * @param answers - Object with question IDs as keys and answers as values
 * @returns Calculated score 0-100
 */
export function calculateScoreLocally(answers: Record<string, number>): number {
  const values = Object.values(answers).filter((v) => v !== undefined && v !== null);
  if (values.length === 0) return 0;

  // Normalize all values to 0-4 scale
  const normalizedValues = values.map((v) => Math.min(4, Math.max(0, v)));

  // Calculate average
  const average = normalizedValues.reduce((a, b) => a + b, 0) / normalizedValues.length;

  // Convert to 0-100 scale
  return Math.round((average / 4) * 100);
}

/**
 * Format diagnostic result for display
 * @param result - Raw diagnostic result from API
 * @returns Formatted result with defaults
 */
export function formatDiagnosticResult(result: DiagnosticResult): DiagnosticResult {
  return {
    diagnostic_id: result.diagnostic_id || "unknown",
    user_id: result.user_id || "unknown",
    score: result.score || 0,
    category: result.category || "Foundational",
    category_explanation: result.category_explanation || "Assessment complete",
    insights: Array.isArray(result.insights) ? result.insights : [],
    recommendations: Array.isArray(result.recommendations) ? result.recommendations : [],
    badge_svg: result.badge_svg || undefined,
    timestamp: result.timestamp || new Date().toISOString(),
  };
}

/**
 * Share diagnostic result
 * @param diagnosticId - Diagnostic ID to share
 * @param platform - Social platform (linkedin, twitter, email, whatsapp)
 * @returns Share URL or prepared data
 */
export function generateShareUrl(
  diagnosticId: string,
  baseUrl: string = typeof window !== "undefined" ? window.location.origin : ""
): string {
  return `${baseUrl}/diagnostic/results/${diagnosticId}`;
}

/**
 * Generate social media share text
 * @param score - Diagnostic score
 * @param category - Category name
 * @param platform - Social platform
 * @returns Formatted share text
 */
export function generateShareText(
  score: number,
  category: string,
  platform: "linkedin" | "twitter" | "email" | "whatsapp"
): string {
  const baseText = `I just completed the Aivory AI Readiness Diagnostic and scored ${score}! I'm at the ${category} level of AI maturity.`;

  switch (platform) {
    case "linkedin":
      return `${baseText}\n\nCheck out your organization's AI readiness:\n#AI #Readiness #Aivory`;

    case "twitter":
      return `${baseText} 🚀\n\nReady to assess your organization's AI maturity? #AI #Readiness`;

    case "email":
      return baseText;

    case "whatsapp":
      return `${baseText} 🎯\n\nTake the diagnostic:`;

    default:
      return baseText;
  }
}
