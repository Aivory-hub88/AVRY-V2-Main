"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { isAuthenticated, login as authLogin } from "@/lib/auth";

/**
 * Login Page Component
 *
 * Standalone login page matching the landing-site SignInModal dark design.
 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      router.push("/");
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
      router.push("/");
    } catch (err) {
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
        <div className="text-[#b2cca2] text-xl animate-pulse">Loading...</div>
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
          className="absolute top-5 right-5 text-white/40 hover:text-white transition-colors p-1"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <Image src="/Aivory_logo_2_2026.svg" alt="Aivory" width={100} height={32} className="h-[32px] w-auto opacity-90" priority />
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2 tracking-tight" style={{ fontFamily: "'Manrope', sans-serif" }}>
            Welcome back
          </h2>
          <p className="text-[#b2cca2] text-sm font-light">
            Only subscribed users can access their workspace.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="login-email" className="block text-[13px] font-medium text-white/70 mb-2">
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              autoComplete="email"
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-lg text-white placeholder-white/20 focus:outline-none focus:border-[#0ae8af] focus:ring-1 focus:ring-[#0ae8af] transition-all text-sm"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="login-password" className="block text-[13px] font-medium text-white/70">
                Password
              </label>
              <a href="#" onClick={(e) => e.preventDefault()} className="text-[12px] text-[#b2cca2] hover:text-white transition-colors">
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
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-lg text-white placeholder-white/20 focus:outline-none focus:border-[#0ae8af] focus:ring-1 focus:ring-[#0ae8af] transition-all text-sm tracking-widest"
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
            className="w-full py-3 px-4 bg-white hover:bg-gray-100 text-black font-semibold rounded-lg transition-colors text-sm flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
          >
            {isLoading ? "Signing in..." : "Sign In"}
            {!isLoading && (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-[13px] text-white/40">
            Don&apos;t have a subscription yet?{" "}
            <a href="/product" className="text-white hover:text-[#b2cca2] transition-colors font-medium">
              Explore plans &rarr;
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
