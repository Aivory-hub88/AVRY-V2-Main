"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getUser } from "@/lib/auth";

/**
 * Auth Guard Props
 */
interface AuthGuardProps {
  children: ReactNode;
  /**
   * If true, redirects authenticated users to their dashboard
   */
  redirectIfAuthenticated?: boolean;
  /**
   * If true, redirects unauthenticated users to login page
   */
  requireAuth?: boolean;
}

/**
 * Authentication Guard Component
 * Protects routes by checking authentication status
 * 
 * Usage:
 * ```tsx
 * <AuthGuard requireAuth>
 *   <DashboardContent />
 * </AuthGuard>
 * ```
 */
export function AuthGuard({
  children,
  redirectIfAuthenticated = false,
  requireAuth = true,
}: AuthGuardProps) {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authenticated = isAuthenticated();
        setIsAuthed(authenticated);

        if (authenticated) {
          // If this is a login page and user is already authenticated
          if (redirectIfAuthenticated) {
            // ALL users go back to homepage
            window.location.href = "/";
            return;
          }
        } else {
          // User is not authenticated
          if (requireAuth) {
            // Redirect to login page
            router.replace("/login");
            return;
          }
        }
      } catch (error) {
        console.error("[AuthGuard] Auth check failed:", error);
        if (requireAuth) {
          router.replace("/login");
        }
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();

    // Listen for auth state changes
    if (typeof window !== "undefined") {
      const handleAuthChange = () => {
        checkAuth();
      };

      window.addEventListener("authManager:login", handleAuthChange);
      window.addEventListener("authManager:logout", handleAuthChange);

      return () => {
        window.removeEventListener("authManager:login", handleAuthChange);
        window.removeEventListener("authManager:logout", handleAuthChange);
      };
    }
  }, [requireAuth, redirectIfAuthenticated, router]);

  // Show loading state while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin">
          <div className="h-12 w-12 border-4 border-brand-mint border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  // If requiring auth and not authenticated, don't show content
  if (requireAuth && !isAuthed) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-primary mb-4">
            Redirecting to login...
          </h1>
          <p className="text-text-secondary">
            You are being redirected to the login page.
          </p>
        </div>
      </div>
    );
  }

  // Render children if all checks pass
  return <>{children}</>;
}

/**
 * Redirect Guard - redirects to dashboard if already authenticated
 * Used for login/signup pages
 */
export function RedirectGuard({ children }: { children: ReactNode }) {
  return (
    <AuthGuard requireAuth={false} redirectIfAuthenticated>
      {children}
    </AuthGuard>
  );
}

/**
 * Dashboard Guard - just verifies authentication
 * All authenticated users can access port 9001 dashboard
 * This guard is not strictly needed if redirecting to external port
 */
export function DashboardGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const authenticated = isAuthenticated();
        setIsAuthed(authenticated);

        if (!authenticated) {
          // Not authenticated - redirect to login
          router.replace("/login");
          return;
        }

        // Authenticated - allow access
        setIsCheckingAuth(false);
      } catch (error) {
        console.error("[DashboardGuard] Auth check failed:", error);
        router.replace("/login");
      }
    };

    checkAuth();

    // Listen for auth state changes
    if (typeof window !== "undefined") {
      window.addEventListener("authManager:login", checkAuth);
      window.addEventListener("authManager:logout", () => {
        router.replace("/login");
      });

      return () => {
        window.removeEventListener("authManager:login", checkAuth);
        window.removeEventListener("authManager:logout", () => {});
      };
    }
  }, [router]);

  // Show loading state while checking access
  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin">
          <div className="h-12 w-12 border-4 border-brand-mint border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  // If not authenticated, don't show content
  if (!isAuthed) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-primary mb-4">
            Redirecting to login...
          </h1>
          <p className="text-text-secondary">
            Please log in to access the dashboard.
          </p>
        </div>
      </div>
    );
  }

  // Render children if authenticated
  return <>{children}</>;
}
