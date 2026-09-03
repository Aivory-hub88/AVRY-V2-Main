"use client";

import { useCallback, useEffect, useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { checkResetToken, resetPassword } from "@/lib/auth";

const INPUT_CLASS =
  "w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-lg text-white placeholder-white/20 focus:outline-none focus:border-[#c4c9b8] focus:ring-1 focus:ring-[#c4c9b8] transition-all text-sm";

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  // `null` while the link is still being checked, so the form isn't offered
  // before we know whether submitting it can possibly work.
  const [linkValid, setLinkValid] = useState<boolean | null>(null);
  const [accountEmail, setAccountEmail] = useState<string | undefined>();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);

  const check = useCallback(async () => {
    if (!token) {
      setLinkValid(false);
      return;
    }
    const result = await checkResetToken(token);
    setLinkValid(result.valid);
    setAccountEmail(result.email);
  }, [token]);

  useEffect(() => {
    check();
  }, [check]);

  const validate = (): string | null => {
    if (password.length < 8) return "Password must be at least 8 characters long";
    if (!/[A-Z]/.test(password)) return "Password must contain an uppercase letter";
    if (!/[a-z]/.test(password)) return "Password must contain a lowercase letter";
    if (!/[0-9]/.test(password)) return "Password must contain a number";
    if (password !== confirmPassword) return "Passwords do not match";
    return null;
  };

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not reset the password."
      );
      // The link may have been redeemed or expired between the check and this
      // submit; re-check rather than leave a form that can never succeed.
      check();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] px-4 py-12">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" aria-hidden="true" />

      <div className="relative w-full max-w-[420px] bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl p-8 sm:p-10">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Aivory_logo_2_2026.svg" alt="Aivory" className="h-[32px] w-auto opacity-90" />
          </div>
          <h2
            className="text-2xl font-semibold text-white mb-2 tracking-tight"
            style={{ fontFamily: "var(--font-manrope), 'Manrope', sans-serif" }}
          >
            Choose a new password
          </h2>
          {accountEmail && (
            <p className="text-[#b2cca2] text-sm font-light">For {accountEmail}</p>
          )}
        </div>

        {linkValid === null && (
          <p className="text-center text-sm text-white/60">Checking your link…</p>
        )}

        {linkValid === false && (
          <div className="space-y-6">
            <p className="text-[13px] leading-relaxed text-white/75 bg-white/[0.04] border border-white/10 rounded-lg px-4 py-4">
              This reset link is invalid, already used, or has expired. Reset
              links are valid for 60 minutes.
            </p>
            <a
              href="/forgot-password"
              className="block text-center text-[13px] text-[#b2cca2] hover:text-white transition-colors"
            >
              Request a new link
            </a>
          </div>
        )}

        {linkValid === true && done && (
          <div className="space-y-6">
            <p className="text-[13px] leading-relaxed text-[#b2cca2] bg-[#b2cca2]/10 border border-[#b2cca2]/25 rounded-lg px-4 py-4">
              Password updated. You&apos;ve been signed out everywhere — taking
              you to the sign-in page…
            </p>
          </div>
        )}

        {linkValid === true && !done && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="reset-password"
                  className="block text-[13px] font-medium text-white/85"
                >
                  New password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[12px] text-[#b2cca2] hover:text-white transition-colors"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <input
                id="reset-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label
                htmlFor="reset-confirm-password"
                className="block text-[13px] font-medium text-white/85 mb-2"
              >
                Confirm new password
              </label>
              <input
                id="reset-confirm-password"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                autoComplete="new-password"
                className={INPUT_CLASS}
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-[#a3aa96] hover:bg-[#8f9681] text-[#494949] font-medium rounded-lg transition-colors text-sm flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
            >
              {isLoading ? "Saving..." : "Set new password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordClient() {
  // useSearchParams needs a Suspense boundary during static rendering.
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#050505]">
          <div className="text-[#b2cca2] text-xl animate-pulse">Loading...</div>
        </div>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
