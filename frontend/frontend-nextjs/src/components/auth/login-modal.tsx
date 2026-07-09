"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { login, signup, getPostLoginRedirectUrl } from "@/lib/auth";

export interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthMode = "login" | "signup";

/**
 * Login Modal Component
 *
 * Follows the live-frontend-repo design exactly.
 * White card modal with 12px border radius, 40px padding.
 * Dark overlay with blur effect.
 * 
 * Features both login and signup flows with toggle between them.
 */
export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEmail("");
      setPassword("");
      setName("");
      setCompanyName("");
      setError("");
      setMode("login");
    }
  }, [isOpen]);

  const validateEmail = (value: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const validatePassword = (value: string): boolean => {
    // At least 8 characters
    return value.length >= 8;
  };

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
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
      const redirectUrl = await login(email, password);
      onClose();
      // Redirect to appropriate location (home for free users, admin dashboard for superadmin)
      window.location.href = getPostLoginRedirectUrl();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Login failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
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
    if (!validatePassword(password)) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);

    try {
      const redirectUrl = await signup(email, password, companyName || undefined);
      onClose();
      // Redirect to appropriate location (home for free users, admin dashboard for superadmin)
      window.location.href = getPostLoginRedirectUrl();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Sign up failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay - matches live-frontend-repo */}
      <div
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
        {/* Modal card - compact spacing matching design */}
        <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-[480px] bg-white rounded-3xl shadow-2xl" style={{
          padding: "48px",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)"
        }}>
          {/* Close button */}
          <button
            onClick={onClose}
            type="button"
            className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center text-gray-200 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-all"
            aria-label="Close modal"
            style={{ fontSize: "24px", lineHeight: "1" }}
          >
            ×
          </button>

          {/* Heading */}
          <h2 style={{
            fontSize: "32px",
            fontWeight: 400,
            color: "#000",
            margin: "0 0 8px 0",
            letterSpacing: "-0.5px"
          }}>
            {mode === "login" ? "Welcome Back" : "Create Account"}
          </h2>

          {/* Subtitle */}
          <p style={{
            fontSize: "16px",
            color: "#999",
            margin: "0 0 24px 0",
            fontWeight: 400
          }}>
            {mode === "login"
              ? "Log in to access your AI diagnostics"
              : "Sign up to save your diagnostic results"}
          </p>

          {/* Form */}
          <form onSubmit={mode === "login" ? handleLoginSubmit : handleSignupSubmit} style={{ marginBottom: "0" }}>
            {/* Email field */}
            <div style={{ marginBottom: "16px" }}>
              <label
                htmlFor="email"
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#000",
                  marginBottom: "8px"
                }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                autoComplete="email"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: "16px",
                  color: "#000",
                  backgroundColor: "#fff",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  boxSizing: "border-box",
                  transition: "border-color 0.2s ease"
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#c4c9b8"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#ddd"; }}
              />
            </div>

            {/* Company name field (signup only) */}
            {mode === "signup" && (
              <div style={{ marginBottom: "16px" }}>
                <label
                  htmlFor="company"
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#000",
                    marginBottom: "8px"
                  }}
                >
                  Company Name (Optional)
                </label>
                <input
                  id="company"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Your company name"
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    fontSize: "16px",
                    color: "#000",
                    backgroundColor: "#fff",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    boxSizing: "border-box",
                    transition: "border-color 0.2s ease"
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#c4c9b8"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "#ddd"; }}
                />
              </div>
            )}

            {/* Password field */}
            <div style={{ marginBottom: "16px" }}>
              <label
                htmlFor="password"
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#000",
                  marginBottom: "8px"
                }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "login" ? "Enter your password" : "At least 8 characters"}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: "16px",
                  color: "#000",
                  backgroundColor: "#fff",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  boxSizing: "border-box",
                  transition: "border-color 0.2s ease"
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#c4c9b8"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#ddd"; }}
              />
              {mode === "signup" && (
                <p style={{
                  fontSize: "12px",
                  color: "#999",
                  marginTop: "4px"
                }}>
                  Password must be at least 8 characters
                </p>
              )}
            </div>

            {/* Error message */}
            {error && (
              <div
                role="alert"
                style={{
                  backgroundColor: "#FFE5E5",
                  border: "1px solid #FF4444",
                  color: "#CC0000",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  marginBottom: "16px",
                  fontSize: "14px"
                }}
              >
                {error}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: "100%",
                padding: "14px 24px",
                fontSize: "16px",
                fontWeight: 600,
                color: "#fff",
                backgroundColor: "#c4c9b8",
                border: "none",
                borderRadius: "8px",
                cursor: isLoading ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                opacity: isLoading ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.backgroundColor = "#b2b8a6";
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.backgroundColor = "#c4c9b8";
                }
              }}
            >
              {isLoading ? (mode === "login" ? "Logging in..." : "Creating account...") : (mode === "login" ? "Log In" : "Sign Up")}
            </button>
          </form>

          {/* Footer text with mode toggle */}
          <div style={{
            marginTop: "24px",
            textAlign: "center",
            fontSize: "14px",
            color: "#666"
          }}>
            {mode === "login" ? (
              <>
                Don&apos;t have an account?{" "}
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setMode("signup");
                    setError("");
                  }}
                  style={{
                    color: "#c4c9b8",
                    textDecoration: "none",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.textDecoration = "underline";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.textDecoration = "none";
                  }}
                >
                  Sign up
                </a>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setMode("login");
                    setError("");
                  }}
                  style={{
                    color: "#c4c9b8",
                    textDecoration: "none",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.textDecoration = "underline";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.textDecoration = "none";
                  }}
                >
                  Log in
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
