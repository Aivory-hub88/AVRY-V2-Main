"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { isAuthenticated, login as authLogin, PaymentRequiredError } from "@/lib/auth";
import { RollButton } from "@/components/ui/RollButton";

/**
 * Login Page Component
 *
 * Standalone login page matching the landing-site SignInModal dark design.
 */
/**
 * Where to go after signing in: `?next=` when it is a same-site path (the
 * free-analysis page sends `/dashboard/diagnostics`), else the homepage.
 * Paths outside this Next app (/dashboard, /admin) need a full navigation.
 */
function nextTarget(): string {
  if (typeof window === "undefined") return "/";
  const next = new URLSearchParams(window.location.search).get("next") || "";
  return /^\/(?!\/)[^\s\\]*$/.test(next) ? next : "/";
}

function goNext(router: ReturnType<typeof useRouter>): void {
  const target = nextTarget();
  if (target === "/") router.push("/");
  else window.location.assign(target);
}

export default function LoginClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      goNext(router);
    } else {
      setIsInitializing(false);
    }
  }, [router]);

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
    if (!password) {
      setError("Password is required");
      return;
    }

    setIsLoading(true);
    try {
      await authLogin(email, password);
      goNext(router);
    } catch (err) {
      if (err instanceof PaymentRequiredError) {
        router.push(`/complete-payment?deadline=${encodeURIComponent(err.deadlineAt)}`);
        return;
      }
      setError(
        err instanceof Error ? err.message : "Login failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <div className="text-white/50 text-xl animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] px-4 py-12">
      {/* Backdrop with blur */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" aria-hidden="true" />

      {/* Dark modal card (matches landing SignInModal) */}
      <div className="relative w-full max-w-[420px] bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl p-8 sm:p-10">
        {/* Close button */}
        <button
          onClick={() => router.push("/")}
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
            <img src="/aivory-wordmark.svg" alt="Aivory" width={205} height={30} className="h-[24px] w-auto opacity-90" />
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2 tracking-tight" style={{ fontFamily: "var(--font-manrope), 'Manrope', sans-serif" }}>
            Welcome back
          </h2>
          <p className="text-white/55 text-sm font-light">
            Sign in to your Aivory workspace
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="login-email" className="block text-[13px] font-medium text-white/85 mb-2">
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              autoComplete="email"
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-lg text-white placeholder-white/20 focus:outline-none focus:border-[#8b7cf6] focus:ring-1 focus:ring-[#8b7cf6] transition-all text-sm"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="login-password" className="block text-[13px] font-medium text-white/85">
                Password
              </label>
              <a href="/forgot-password" className="text-[12px] text-[#b9b0ff] hover:text-white transition-colors">
                Forgot password?
              </a>
            </div>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-lg text-white placeholder-white/20 focus:outline-none focus:border-[#8b7cf6] focus:ring-1 focus:ring-[#8b7cf6] transition-all text-sm tracking-widest"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center" role="alert">
              {error}
            </p>
          )}

          <div className="mt-2">
            <RollButton type="submit" disabled={isLoading} tone="light" className="py-3 text-sm">
              {isLoading ? "Signing in..." : "Sign In"}
            </RollButton>
          </div>
        </form>

        <div className="mt-8 text-center">
          <p className="text-[13px] text-white/60">
            New to Aivory?{" "}
            <a href="/free-diagnostic" className="text-white hover:text-[#b9b0ff] transition-colors font-medium">
              Create a free account &rarr;
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
