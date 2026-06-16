"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, login as authLogin } from "@/lib/auth";

/**
 * Login Page Component
 *
 * Standalone login page matching the legacy auth-modals.js design.
 * White card modal centered on a dark backdrop.
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

  const validateEmail = (value: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

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
        <div className="text-brand-mint text-xl animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] px-4 py-12">
      {/* Backdrop with blur */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div className="relative bg-white rounded-3xl shadow-2xl p-12 max-w-[480px] w-full">
        {/* Close button */}
        <button
          onClick={() => router.push("/")}
          className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all text-2xl"
          aria-label="Close"
        >
          &times;
        </button>

        <h2 className="text-4xl font-light text-black mb-3">
          Welcome Back
        </h2>
        <p className="text-gray-500 text-lg mb-10">
          Log in to access your AI diagnostics
        </p>

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div className="mb-6">
            <label
              htmlFor="login-email"
              className="block mb-2.5 font-semibold text-black text-base"
            >
              Email
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              autoComplete="email"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base text-black bg-white placeholder:text-gray-400 focus:outline-none focus:border-brand-mint focus:ring-1 focus:ring-brand-mint transition-colors"
            />
          </div>

          {/* Password */}
          <div className="mb-6">
            <label
              htmlFor="login-password"
              className="block mb-2.5 font-semibold text-black text-base"
            >
              Password
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base text-black bg-white placeholder:text-gray-400 focus:outline-none focus:border-brand-mint focus:ring-1 focus:ring-brand-mint transition-colors"
            />
          </div>

          {/* Error */}
          {error && (
            <div
              className="bg-[#FFE5E5] border border-[#FF4444] text-[#CC0000] px-4 py-3 rounded-lg mb-5 text-sm"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-[#07D197] text-white rounded-xl text-base font-semibold hover:bg-[#06B882] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? "Logging in..." : "Log In"}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-8 text-center text-gray-600 text-base">
          Don&apos;t have an account?{" "}
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="text-[#07D197] font-semibold no-underline hover:underline"
          >
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}
