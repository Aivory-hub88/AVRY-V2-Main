"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isAuthenticated, getUser } from "@/lib/auth";
import { getUserState, UserState } from "@/lib/user-state";
import { getTranslations, Language } from "@/lib/translations";
import { FREE_DIAGNOSTIC_QUESTIONS, calculateDiagnosticScore } from "@/lib/diagnostic-questions";
import { DiagnosticResults } from "@/components/diagnostic/diagnostic-results";
import { getMarketingUrl } from "@/lib/config";
import { submitFreeDiagnostic } from "@/lib/diagnostic-api";
import type { DiagnosticResult } from "@/lib/diagnostic-api";

/**
 * Diagnostic Type
 */
export type DiagnosticType = "free" | "snapshot" | "paid";

/**
 * Derive a category label from a readiness score band.
 *
 * Bands mirror the legacy free-diagnostic copy:
 * - `>= 80` → "Advanced"
 * - `>= 60` → "Established"
 * - `>= 40` → "Emerging"
 * - otherwise → "Foundational"
 */
function deriveCategory(score: number): "Foundational" | "Emerging" | "Established" | "Advanced" {
  if (score >= 80) return "Advanced";
  if (score >= 60) return "Established";
  if (score >= 40) return "Emerging";
  return "Foundational";
}

/**
 * Build a {@link DiagnosticResult}-shaped object for the FREE diagnostic flow
 * from the data the page already has (the computed readiness score).
 */
function buildFreeDiagnosticResult(score: number): DiagnosticResult {
  const category: "Foundational" | "Emerging" | "Established" | "Advanced" = deriveCategory(score);

  const category_explanation =
    score >= 80
      ? "Excellent! Your organization is well-prepared for AI adoption."
      : score >= 60
        ? "Good! Your organization has a solid foundation for AI."
        : score >= 40
          ? "Fair! Your organization can benefit from AI with some preparation."
          : "Needs Improvement! Your organization should focus on building AI readiness.";

  const recommendations: string[] = [];
  if (score >= 80) {
    recommendations.push("You're ready for advanced AI solutions. Consider upgrading to AI Blueprint for comprehensive implementation planning.");
  } else if (score >= 60) {
    recommendations.push("Your foundation is solid. Start with AI Snapshot to get detailed insights.");
  } else if (score >= 40) {
    recommendations.push("Good starting point. Focus on improving your data infrastructure before advanced AI implementation.");
  } else {
    recommendations.push("Start with basic AI education and small pilot projects to build your AI capabilities.");
  }

  const insights: string[] = [category_explanation, recommendations[0] || ""];

  return {
    diagnostic_id: "local-" + Date.now(),
    user_id: "anonymous",
    score,
    category,
    category_explanation,
    insights,
    recommendations,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Diagnostic Answer
 */
interface DiagnosticAnswer {
  questionId: string;
  answer: any;
}

/**
 * Diagnostic Page (default export)
 *
 * Wraps the diagnostic content in a Suspense boundary because it uses
 * useSearchParams() which requires CSR bailout during static generation.
 */
export default function DiagnosticPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-bg-primary">
          <div className="text-brand-mint text-xl animate-pulse">Loading...</div>
        </div>
      }
    >
      <DiagnosticContent />
    </Suspense>
  );
}

/**
 * Diagnostic Content Component
 *
 * Handles all three diagnostic flows:
 * - Free Diagnostic (12 questions)
 * - Snapshot Diagnostic (30 questions)
 * - Paid Diagnostic (30 questions)
 */
function DiagnosticContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [language, setLanguage] = useState<Language>("en");
  const [isAuthenticatedUser, setIsAuthenticatedUser] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [diagnosticType, setDiagnosticType] = useState<DiagnosticType>("free");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [readinessScore, setReadinessScore] = useState<number>(0);

  const t = getTranslations(language);

  // Initialize auth state
  useEffect(() => {
    const initAuth = () => {
      const authenticated = isAuthenticated();
      setIsAuthenticatedUser(authenticated);
      
      if (authenticated) {
        const state = getUserState();
        if (state && state.user) {
          // Check if user already completed diagnostic
          // Check if user already completed diagnostic (simplified check)
          if (state.user.tier !== "free") {
            router.push("/");
          }
        }
      }
      
      setIsLoading(false);
    };

    initAuth();

    // Listen for AuthManager events
    if (typeof window !== "undefined") {
      window.addEventListener("authManager:login", initAuth);
      window.addEventListener("authManager:logout", initAuth);

      return () => {
        window.removeEventListener("authManager:login", initAuth);
        window.removeEventListener("authManager:logout", initAuth);
      };
    }
  }, [router]);

  // Get diagnostic type from URL
  useEffect(() => {
    const type = searchParams.get("type") as DiagnosticType;
    if (type && ["free", "snapshot", "paid"].includes(type)) {
      setDiagnosticType(type);
    }
  }, [searchParams]);

  // Get questions for current diagnostic type (only free for now)
  const questions = FREE_DIAGNOSTIC_QUESTIONS;

  // Handle login click
  const handleLogin = () => {
    if (!isAuthenticatedUser) {
      // Dispatch event to open login modal
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('openLoginModal'));
      }
    }
  };

  // Handle answer change
  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  // Handle next question
  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  // Handle previous question
  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // Compute a local readiness score for immediate display / fallback.
      const score = calculateDiagnosticScore(answers);
      setReadinessScore(score);

      // The homepage handles the FREE diagnostic only (the public lead magnet).
      // Persist it to the diagnostics service; failure is non-fatal — we still
      // show the locally-computed score. Paid/deep diagnostics live in the user
      // dashboard.
      try {
        await submitFreeDiagnostic(answers);
      } catch (apiError) {
        console.error("[Diagnostic] Service submission failed:", apiError);
      }

      // Show results
      setShowResults(true);
    } catch (error) {
      console.error("Error submitting diagnostic:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="text-brand-mint text-xl animate-pulse">
          Loading...
        </div>
      </div>
    );
  }

  // Render unauthorized state — only block paid/snapshot diagnostics
  if (!isAuthenticatedUser && diagnosticType !== "free") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg-primary px-4">
        <div className="max-w-md text-center">
          <h1 className="text-3xl font-bold text-text-primary mb-4">
            Sign in required
          </h1>
          <p className="text-text-secondary mb-8">
            Please sign in to start a diagnostic
          </p>
          <button
            onClick={handleLogin}
            className="px-6 py-3 rounded-lg bg-brand-mint text-bg-primary font-semibold hover:bg-brand-mint-hover transition-all"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // Render results
  if (showResults) {
    return (
      <div className="min-h-screen flex flex-col bg-bg-primary">
        {/* Header */}
        <header className="border-b border-border-default bg-bg-secondary">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-brand-mint text-2xl font-bold">
                  Aivory
                </div>
                <nav className="hidden md:flex items-center gap-6">
                  <a href="/" className="text-text-secondary hover:text-text-primary transition-colors">
                    {t.nav.home}
                  </a>
                  <a href="http://localhost:9001" className="text-text-primary font-semibold">
                    {t.nav.dashboard}
                  </a>
                </nav>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => setLanguage(language === "en" ? "id" : "en")}
                  className="px-3 py-1 rounded-md bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors text-sm"
                >
                  {language === "en" ? "ID" : "EN"}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-text-primary mb-2">
                {diagnosticType === "free" ? "Free Diagnostic" : diagnosticType === "snapshot" ? "AI Snapshot" : "AI Blueprint"} Results
              </h1>
              <p className="text-text-secondary">
                {diagnosticType === "free" 
                  ? "Based on your answers, here's your AI readiness assessment" 
                  : "Based on your answers, here's your comprehensive AI assessment"}
              </p>
            </div>

            {diagnosticType === "free" ? (
              /* FREE flow: badge + score details, share bar, download, and
                 upgrade hand-off, all composed by the DiagnosticResults
                 orchestrator (Requirement 9.1). It normalizes the result
                 internally, so the partial free-flow shape is sufficient. */
              <DiagnosticResults
                result={buildFreeDiagnosticResult(readinessScore)}
              />
            ) : (
              <>
                {/* Score Card */}
                <div className="bg-bg-secondary rounded-lg border border-border-default p-8 mb-6 text-center">
                  <div className="text-6xl font-bold text-brand-mint mb-4">
                    {readinessScore}
                  </div>
                  <div className="text-2xl font-semibold text-text-primary mb-2">
                    AI Readiness Score
                  </div>
                  <div className="text-text-secondary">
                    {readinessScore >= 80 
                      ? "Excellent! Your organization is well-prepared for AI adoption." 
                      : readinessScore >= 60 
                        ? "Good! Your organization has a solid foundation for AI." 
                        : readinessScore >= 40 
                          ? "Fair! Your organization can benefit from AI with some preparation." 
                          : "Needs Improvement! Your organization should focus on building AI readiness."}
                  </div>
                </div>

                {/* Recommendations */}
                <div className="bg-bg-secondary rounded-lg border border-border-default p-6 mb-6">
                  <h2 className="text-xl font-semibold text-text-primary mb-4">
                    Recommendations
                  </h2>
                  <ul className="space-y-3">
                    {readinessScore >= 80 && (
                      <li className="flex items-start gap-3">
                        <span className="text-brand-mint">✓</span>
                        <span className="text-text-primary">
                          You're ready for advanced AI solutions. Consider upgrading to AI Blueprint for comprehensive implementation planning.
                        </span>
                      </li>
                    )}
                    {readinessScore >= 60 && (
                      <li className="flex items-start gap-3">
                        <span className="text-brand-mint">✓</span>
                        <span className="text-text-primary">
                          Your foundation is solid. Start with AI Snapshot to get detailed insights.
                        </span>
                      </li>
                    )}
                    {readinessScore >= 40 && (
                      <li className="flex items-start gap-3">
                        <span className="text-brand-mint">✓</span>
                        <span className="text-text-primary">
                          Good starting point. Focus on improving your data infrastructure before advanced AI implementation.
                        </span>
                      </li>
                    )}
                    {readinessScore < 40 && (
                      <li className="flex items-start gap-3">
                        <span className="text-brand-mint">✓</span>
                        <span className="text-text-primary">
                          Start with basic AI education and small pilot projects to build your AI capabilities.
                        </span>
                      </li>
                    )}
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => router.push("/dashboard")}
                    className="flex-1 px-6 py-3 rounded-lg bg-brand-mint text-bg-primary font-semibold hover:bg-brand-mint-hover transition-all"
                  >
                    Go to Dashboard
                  </button>
                </div>
              </>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-border-default bg-bg-secondary py-6">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-text-secondary text-sm">
                {t.footer.copyright.replace("{year}", new Date().getFullYear().toString())}
              </div>
              <div className="flex items-center gap-6 text-sm text-text-secondary">
                <a href="/privacy" className="hover:text-text-primary transition-colors">
                  {t.footer.legal.privacyPolicy}
                </a>
                <a href="/terms" className="hover:text-text-primary transition-colors">
                  {t.footer.legal.termsOfService}
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // Render diagnostic form
  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary">
      {/* Header */}
      <header className="border-b border-border-default bg-bg-secondary">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-brand-mint text-2xl font-bold">
                Aivory
              </div>
              <nav className="hidden md:flex items-center gap-6">
                <a href="/" className="text-text-secondary hover:text-text-primary transition-colors">
                  {t.nav.home}
                </a>
                <a href="http://localhost:9001" className="text-text-secondary hover:text-text-primary transition-colors">
                  {t.nav.dashboard}
                </a>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setLanguage(language === "en" ? "id" : "en")}
                className="px-3 py-1 rounded-md bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors text-sm"
              >
                {language === "en" ? "ID" : "EN"}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between text-sm text-text-secondary mb-2">
              <span>
                {diagnosticType === "free" ? "Free Diagnostic" : diagnosticType === "snapshot" ? "AI Snapshot" : "AI Blueprint"}
              </span>
              <span>
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
            </div>
            <div className="w-full bg-bg-tertiary rounded-full h-2">
              <div 
                className="bg-brand-mint h-2 rounded-full transition-all duration-500" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* Question Card */}
          <div className="bg-bg-secondary rounded-lg border border-border-default p-8 mb-6">
            <div className="mb-6">
              <span className="inline-block px-3 py-1 rounded-full bg-brand-mint/10 text-brand-mint text-xs font-medium mb-4">
                {currentQuestion.section}
              </span>
              <h2 className="text-2xl font-semibold text-text-primary">
                {currentQuestion.question}
              </h2>
            </div>

            {/* Question Options */}
            <div className="space-y-4">
              {currentQuestion.type === "single-choice" && currentQuestion.options && (
                <div className="space-y-3">
                  {currentQuestion.options.map((option: any, index: number) => (
                    <label 
                      key={index} 
                      className={`
                        flex items-center p-4 rounded-lg border cursor-pointer transition-all
                        ${answers[currentQuestion.id] === option.value
                          ? "border-brand-mint bg-brand-mint/10"
                          : "border-border-default hover:border-brand-mint/50"
                        }
                      `}
                    >
                      <input
                        type="radio"
                        name={currentQuestion.id}
                        value={option.value}
                        checked={answers[currentQuestion.id] === option.value}
                        onChange={() => handleAnswerChange(currentQuestion.id, option.value)}
                        className="w-5 h-5 text-brand-mint focus:ring-brand-mint"
                      />
                      <span className="ml-3 text-text-primary">{option.label}</span>
                    </label>
                  ))}
                </div>
              )}

              {currentQuestion.type === "multi-choice" && currentQuestion.options && (
                <div className="space-y-3">
                  {currentQuestion.options.map((option: any, index: number) => (
                    <label 
                      key={index} 
                      className={`
                        flex items-center p-4 rounded-lg border cursor-pointer transition-all
                        ${answers[currentQuestion.id]?.includes(option.value)
                          ? "border-brand-mint bg-brand-mint/10"
                          : "border-border-default hover:border-brand-mint/50"
                        }
                      `}
                    >
                      <input
                        type="checkbox"
                        name={currentQuestion.id}
                        value={option.value}
                        checked={answers[currentQuestion.id]?.includes(option.value) || false}
                        onChange={(e) => {
                          const currentAnswers = answers[currentQuestion.id] || [];
                          const newAnswers = e.target.checked
                            ? [...currentAnswers, option.value]
                            : currentAnswers.filter((a: any) => a !== option.value);
                          handleAnswerChange(currentQuestion.id, newAnswers);
                        }}
                        className="w-5 h-5 text-brand-mint focus:ring-brand-mint"
                      />
                      <span className="ml-3 text-text-primary">{option.label}</span>
                    </label>
                  ))}
                </div>
              )}

              {currentQuestion.type === "scale" && (
                <div className="space-y-4">
                  <div className="flex justify-between text-sm text-text-secondary mb-2">
                    <span>{currentQuestion.min !== undefined ? currentQuestion.min : 0} - Low</span>
                    <span>{currentQuestion.max !== undefined ? currentQuestion.max : 4} - High</span>
                  </div>
                  <input
                    type="range"
                    min={currentQuestion.min || 0}
                    max={currentQuestion.max || 4}
                    step={currentQuestion.step || 1}
                    value={answers[currentQuestion.id] || 0}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, parseInt(e.target.value))}
                    className="w-full h-2 bg-bg-tertiary rounded-lg appearance-none cursor-pointer accent-brand-mint"
                  />
                  <div className="text-center text-2xl font-bold text-brand-mint">
                    {answers[currentQuestion.id] || 0}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              className={`
                px-6 py-3 rounded-lg font-semibold transition-colors
                ${currentQuestionIndex === 0
                  ? "text-text-secondary cursor-not-allowed"
                  : "text-brand-mint hover:bg-brand-mint/10"
                }
              `}
            >
              Previous
            </button>

            <button
              onClick={handleNext}
              className="px-8 py-3 rounded-lg bg-brand-mint text-bg-primary font-semibold hover:bg-brand-mint-hover transition-all"
            >
              {currentQuestionIndex === questions.length - 1 ? "Submit" : "Next"}
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-default bg-bg-secondary py-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-text-secondary text-sm">
              {t.footer.copyright.replace("{year}", new Date().getFullYear().toString())}
            </div>
            <div className="flex items-center gap-6 text-sm text-text-secondary">
              <a href="/privacy" className="hover:text-text-primary transition-colors">
                {t.footer.legal.privacyPolicy}
              </a>
              <a href="/terms" className="hover:text-text-primary transition-colors">
                {t.footer.legal.termsOfService}
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
