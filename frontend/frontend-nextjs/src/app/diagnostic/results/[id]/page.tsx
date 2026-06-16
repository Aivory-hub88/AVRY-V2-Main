"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { DiagnosticResult } from "@/lib/diagnostic-api";
import { DiagnosticResults } from "@/components/diagnostic/diagnostic-results";
import { getServiceUrl } from "@/lib/services";

/**
 * Diagnostic Results Share Page
 * Public page for sharing diagnostic results
 */
export default function DiagnosticResultsSharePage() {
  const params = useParams();
  const id = params?.id as string;

  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchResult = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${getServiceUrl("diagnostics")}/api/v1/diagnostic/results/${id}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Diagnostic result not found");
          }
          throw new Error("Failed to load diagnostic result");
        }

        const data: DiagnosticResult = await response.json();
        setResult(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        console.error("[DiagnosticShare] Error loading result:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResult();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="text-center">
          <div className="animate-spin mb-4">
            <div className="h-12 w-12 border-4 border-brand-mint border-t-transparent rounded-full mx-auto" />
          </div>
          <p className="text-text-secondary">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">Result Not Found</h1>
          <p className="text-text-secondary mb-6">
            {error || "The diagnostic result you're looking for doesn't exist or has expired."}
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-brand-mint text-bg-primary rounded-lg font-semibold hover:bg-brand-mint-hover transition-all"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <header className="border-b border-border-default bg-bg-secondary">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-brand-mint text-2xl font-bold">
              Aivory
            </Link>
            <p className="text-text-secondary text-sm">AI Readiness Assessment</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-2">
              Your AI Readiness Results
            </h1>
            <p className="text-text-secondary">
              This result was generated on {new Date(result.timestamp).toLocaleDateString()}
            </p>
          </div>

          <DiagnosticResults
            result={result}
            isAuthenticated={false}
            onShare={(platform) => handleShare(platform, result)}
            onDownload={() => handleDownload(result)}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-default bg-bg-secondary py-6 mt-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-text-secondary text-sm">
              © {new Date().getFullYear()} Aivory. All rights reserved.
            </div>
            <div className="flex items-center gap-6 text-sm text-text-secondary">
              <a href="/" className="hover:text-text-primary transition-colors">
                Home
              </a>
              <a href="/pricing" className="hover:text-text-primary transition-colors">
                Pricing
              </a>
              <a href="/privacy" className="hover:text-text-primary transition-colors">
                Privacy
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function handleShare(platform: string, result: DiagnosticResult) {
  const shareUrl = typeof window !== "undefined" 
    ? window.location.href 
    : `https://aivory.ai/diagnostic/results/${result.diagnostic_id}`;

  const shareText = `I scored ${result.score}/100 on the Aivory AI Readiness Diagnostic! I'm at the ${result.category} level of AI maturity. 🎯`;

  switch (platform) {
    case "linkedin":
      window.open(
        `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
        "_blank"
      );
      break;
    case "twitter":
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
        "_blank"
      );
      break;
    case "email":
      window.location.href = `mailto:?subject=My Aivory AI Readiness Score&body=${encodeURIComponent(shareText + "\n\n" + shareUrl)}`;
      break;
    case "whatsapp":
      window.open(
        `https://wa.me/?text=${encodeURIComponent(shareText + " " + shareUrl)}`,
        "_blank"
      );
      break;
  }
}

function handleDownload(result: DiagnosticResult) {
  // Placeholder for download functionality
  alert("Download feature coming soon! Share your results on social media instead.");
}
