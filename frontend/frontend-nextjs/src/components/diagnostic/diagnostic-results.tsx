"use client";

import React from "react";
import Link from "next/link";
import { DiagnosticResult } from "@/lib/diagnostic-api";

/**
 * Diagnostic Results Props
 */
interface DiagnosticResultsProps {
  result: DiagnosticResult;
  isAuthenticated?: boolean;
  onShare?: (platform: string) => void;
  onDownload?: () => void;
}

/**
 * Get score color based on category
 */
function getScoreColor(category: string): string {
  switch (category) {
    case "Advanced":
      return "text-green-500";
    case "Established":
      return "text-blue-500";
    case "Emerging":
      return "text-yellow-500";
    case "Foundational":
      return "text-red-500";
    default:
      return "text-text-primary";
  }
}

/**
 * Get background color based on category
 */
function getBgColor(category: string): string {
  switch (category) {
    case "Advanced":
      return "bg-green-500/10";
    case "Established":
      return "bg-blue-500/10";
    case "Emerging":
      return "bg-yellow-500/10";
    case "Foundational":
      return "bg-red-500/10";
    default:
      return "bg-bg-secondary";
  }
}

/**
 * Diagnostic Results Component
 * Displays diagnostic results with badge, insights, and sharing options
 */
export function DiagnosticResults({
  result,
  isAuthenticated = false,
  onShare,
  onDownload,
}: DiagnosticResultsProps) {
  const scoreColor = getScoreColor(result.category);
  const bgColor = getBgColor(result.category);

  return (
    <div className="space-y-8">
      {/* Score Badge */}
      <div className={`rounded-xl p-12 border border-border-default ${bgColor}`}>
        <div className="text-center space-y-4">
          <div className="text-6xl font-bold text-text-primary mb-4">
            <span className={scoreColor}>{result.score}</span>
            <span className="text-2xl text-text-secondary">/100</span>
          </div>
          <div className="text-2xl font-bold text-text-primary">
            {result.category} Level
          </div>
          <div className="text-text-secondary max-w-2xl mx-auto">
            {result.category_explanation}
          </div>
        </div>
      </div>

      {/* Share Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-text-primary">Share Your Results</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => onShare?.("linkedin")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all"
          >
            <span>🔗</span>
            LinkedIn
          </button>
          <button
            onClick={() => onShare?.("twitter")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800 transition-all"
          >
            <span>𝕏</span>
            Twitter/X
          </button>
          <button
            onClick={() => onShare?.("email")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-700 transition-all"
          >
            <span>✉️</span>
            Email
          </button>
          <button
            onClick={() => onShare?.("whatsapp")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-all"
          >
            <span>💬</span>
            WhatsApp
          </button>
          <button
            onClick={onDownload}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-mint text-bg-primary hover:bg-brand-mint-hover transition-all font-semibold"
          >
            <span>⬇️</span>
            Download
          </button>
        </div>
      </div>

      {/* Insights */}
      {result.insights && result.insights.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-text-primary">Key Insights</h3>
          <div className="space-y-3">
            {result.insights.map((insight, index) => (
              <div
                key={index}
                className="bg-bg-secondary rounded-lg border border-border-default p-4"
              >
                <p className="text-text-primary">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {result.recommendations && result.recommendations.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-text-primary">Recommended Next Steps</h3>
          <div className="space-y-3">
            {result.recommendations.map((rec, index) => (
              <div
                key={index}
                className="flex gap-4 bg-bg-secondary rounded-lg border border-border-default p-4"
              >
                <div className="text-brand-mint font-bold text-lg flex-shrink-0">
                  {index + 1}.
                </div>
                <div>
                  <p className="text-text-primary">{rec}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upgrade CTA */}
      <div className="bg-gradient-to-r from-brand-mint/10 to-brand-purple/10 rounded-xl border border-brand-mint/20 p-8">
        <h3 className="text-2xl font-bold text-text-primary mb-4">Get Deeper Insights</h3>
        <p className="text-text-secondary mb-6">
          Ready to dive deeper? Upgrade to our Snapshot or Blueprint plans for comprehensive analysis,
          benchmarking, and detailed implementation roadmaps.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          {isAuthenticated ? (
            <>
              <Link
                href="/dashboard/snapshot"
                className="px-6 py-3 rounded-lg bg-brand-mint text-bg-primary font-semibold hover:bg-brand-mint-hover transition-all text-center"
              >
                View Snapshot Plan
              </Link>
              <Link
                href="/dashboard/blueprint"
                className="px-6 py-3 rounded-lg bg-brand-purple text-white font-semibold hover:bg-brand-purple-hover transition-all text-center"
              >
                View Blueprint Plan
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-6 py-3 rounded-lg bg-brand-mint text-bg-primary font-semibold hover:bg-brand-mint-hover transition-all text-center"
              >
                Sign In
              </Link>
              <Link
                href="/pricing"
                className="px-6 py-3 rounded-lg border border-brand-mint text-brand-mint font-semibold hover:bg-brand-mint/10 transition-all text-center"
              >
                View Plans
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pt-6 border-t border-border-default">
        <p className="text-text-secondary text-sm mb-4">
          Results generated on {new Date(result.timestamp).toLocaleDateString()}
        </p>
        <Link
          href="/"
          className="text-brand-mint hover:text-brand-mint-hover font-semibold transition-colors"
        >
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
