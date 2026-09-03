"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Shown when login is blocked because the account is inside its 32h
 * no-purchase window (see auth.ts's PaymentRequiredError / avry-backend's
 * app/services/account_cleanup.py). No dashboard access is granted here —
 * the only way past this page is to finish checkout.
 */
function formatRemaining(ms: number): string {
  if (ms <= 0) return "0h 0m";
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

export default function CompletePaymentClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deadlineParam = searchParams.get("deadline");

  const deadline = useMemo(() => {
    if (!deadlineParam) return null;
    const parsed = new Date(deadlineParam);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [deadlineParam]);

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const remainingMs = deadline ? deadline.getTime() - now : null;
  const expired = remainingMs !== null && remainingMs <= 0;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] px-4 py-12">
      <div className="relative w-full max-w-[460px] bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl p-8 sm:p-10">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img
              src="/Aivory_logo_2_2026.svg"
              alt="Aivory"
              width={383}
              height={79}
              className="h-[32px] w-auto opacity-90"
            />
          </div>
          <h2
            className="text-2xl font-semibold text-white mb-3 tracking-tight"
            style={{ fontFamily: "var(--font-manrope), 'Manrope', sans-serif" }}
          >
            Finish your purchase to continue
          </h2>
          <p className="text-white/70 text-sm font-light leading-relaxed">
            Your account isn&rsquo;t active yet &mdash; it needs a completed
            purchase before you can access the dashboard.
            {remainingMs !== null && !expired && (
              <>
                {" "}You have{" "}
                <span className="text-[#b2cca2] font-medium">
                  {formatRemaining(remainingMs)}
                </span>{" "}
                left before the account is automatically removed.
              </>
            )}
            {expired && (
              <> This window has passed and the account may already have been removed.</>
            )}
          </p>
        </div>

        <button
          onClick={() => router.push("/pricing")}
          className="w-full py-3 rounded-lg bg-[#b2cca2] text-[#0f1310] font-semibold text-sm hover:bg-[#c4d9b5] transition-colors"
        >
          Choose a plan
        </button>

        <button
          onClick={() => router.push("/")}
          className="w-full mt-3 py-3 rounded-lg border border-white/10 text-white/70 font-medium text-sm hover:text-white hover:border-white/20 transition-colors"
        >
          Back to homepage
        </button>
      </div>
    </div>
  );
}
