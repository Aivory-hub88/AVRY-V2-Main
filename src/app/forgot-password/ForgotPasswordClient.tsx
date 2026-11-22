"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { requestPasswordReset } from "@/lib/auth";
import { RollButton } from "@/components/ui/RollButton";

/**
 * Forgot-password page.
 *
 * Matches the login card's dark design. The confirmation is shown for any
 * submitted address, because the backend answers identically whether or not
 * the email is registered — reporting "no such account" would let anyone probe
 * for valid customer emails from a public page.
 */
export default function ForgotPasswordClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const validateEmail = (value: string): boolean =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError("");

    if (!email) {
      setError("Email is required");
      return;
    }
    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] px-4 py-12">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" aria-hidden="true" />

      <div className="relative w-full max-w-[420px] bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl p-8 sm:p-10">
        <button
          onClick={() => router.push("/login")}
          className="absolute top-5 right-5 text-white/60 hover:text-white transition-colors p-1"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/aivory-wordmark.svg" alt="Aivory" className="h-[24px] w-auto opacity-90" />
          </div>
          <h2
            className="text-2xl font-semibold text-white mb-2 tracking-tight"
            style={{ fontFamily: "var(--font-manrope), 'Manrope', sans-serif" }}
          >
            Reset your password
          </h2>
          <p className="text-white/55 text-sm font-light">
            We&apos;ll email you a link to choose a new one.
          </p>
        </div>

        {sent ? (
          <div className="space-y-6">
            <p className="text-[13px] leading-relaxed text-white/75 bg-white/[0.04] border border-white/10 rounded-lg px-4 py-4">
              If{" "}
              <span className="text-white font-medium">{email}</span>{" "}
              belongs to an Aivory account, a reset link is on its way. The link
              expires in 60 minutes. Check your spam folder if it hasn&apos;t
              arrived in a few minutes.
            </p>
            <a
              href="/login"
              className="block text-center text-[13px] text-[#b9b0ff] hover:text-white transition-colors"
            >
              &larr; Back to sign in
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="forgot-email"
                className="block text-[13px] font-medium text-white/85 mb-2"
              >
                Email address
              </label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                autoComplete="email"
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-lg text-white placeholder-white/20 focus:outline-none focus:border-[#8b7cf6] focus:ring-1 focus:ring-[#8b7cf6] transition-all text-sm"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center" role="alert">
                {error}
              </p>
            )}

            <div className="mt-2">
              <RollButton type="submit" disabled={isLoading} tone="light" className="py-3 text-sm">
                {isLoading ? "Sending..." : "Send reset link"}
              </RollButton>
            </div>

            <a
              href="/login"
              className="block text-center text-[13px] text-white/60 hover:text-white transition-colors"
            >
              &larr; Back to sign in
            </a>
          </form>
        )}
      </div>
    </div>
  );
}
