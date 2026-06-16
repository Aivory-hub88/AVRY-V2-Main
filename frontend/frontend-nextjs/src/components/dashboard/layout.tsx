"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isAuthenticated, getUser, logout } from "@/lib/auth";
import { getUserState, UserState } from "@/lib/user-state";
import { getTranslations, Language } from "@/lib/translations";

/**
 * Dashboard Mode types
 */
export type DashboardMode = "free" | "snapshot" | "blueprint" | "operate";

/**
 * Dashboard Layout Props
 */
interface DashboardLayoutProps {
  children: ReactNode;
}

/**
 * Dashboard Layout Component
 * Provides navigation, mode switching, and layout structure for dashboard
 */
export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [userState, setUserState] = useState<UserState | null>(null);
  const [currentMode, setCurrentMode] = useState<DashboardMode>("free");
  const [language, setLanguage] = useState<Language>("en");
  const [isAuthenticatedUser, setIsAuthenticatedUser] = useState<boolean>(false);

  const t = getTranslations(language);

  // Initialize auth state and user state
  useEffect(() => {
    const initAuth = () => {
      const authenticated = isAuthenticated();
      setIsAuthenticatedUser(authenticated);
      
      if (authenticated) {
        const user = getUser();
        const state = getUserState();
        setUserState(state);
      }
    };

    initAuth();

    // Listen for AuthManager events
    if (typeof window !== "undefined") {
      window.addEventListener("authManager:login", initAuth);
      window.addEventListener("authManager:logout", initAuth);
      window.addEventListener("userState:update", initAuth);

      return () => {
        window.removeEventListener("authManager:login", initAuth);
        window.removeEventListener("authManager:logout", initAuth);
        window.removeEventListener("userState:update", initAuth);
      };
    }
  }, []);

  // Initialize language from user preferences
  useEffect(() => {
    const userLang = getUserPreferences();
    setLanguage(userLang.language);
  }, []);

  // Get language from user preferences
  function getUserPreferences() {
    const state = getUserState();
    return state?.preferences || {
      language: "en",
      theme: "light",
      notifications: true,
    };
  }

  // Handle mode switching
  const handleModeChange = (mode: DashboardMode) => {
    setCurrentMode(mode);
    router.push(`/dashboard/${mode}`);
  };

  // Handle login click
  const handleLogin = () => {
    if (!isAuthenticatedUser) {
      // Dispatch event to open login modal
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('openLoginModal'));
      }
    }
  };

  // Handle logout click
  const handleLogout = async () => {
    try {
      await logout(true); // logout with redirect to home
    } catch (error) {
      console.error("[Dashboard] Logout failed:", error);
      // Force redirect to home even if logout fails
      window.location.href = "/";
    }
  };

  // Get current mode from pathname
  useEffect(() => {
    const pathParts = pathname.split("/");
    const modeIndex = pathParts.indexOf("dashboard") + 1;
    
    if (modeIndex < pathParts.length) {
      const mode = pathParts[modeIndex] as DashboardMode;
      if (["free", "snapshot", "blueprint", "operate"].includes(mode)) {
        setCurrentMode(mode);
      }
    }
  }, [pathname]);

  // Dashboard mode configuration
  const modes: { id: DashboardMode; label: string; icon: string }[] = [
    { id: "free", label: t.dashboard.free.title, icon: "free" },
    { id: "snapshot", label: t.dashboard.snapshot.title, icon: "snapshot" },
    { id: "blueprint", label: t.dashboard.blueprint.title, icon: "blueprint" },
    { id: "operate", label: t.dashboard.operate.title, icon: "operate" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary">
      {/* Dashboard Header */}
      <header className="border-b border-border-default bg-bg-secondary">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center gap-4">
              <div className="text-brand-mint text-2xl font-bold">
                Aivory
              </div>
              <nav className="hidden md:flex items-center gap-6">
                <a href="/" className="text-text-secondary hover:text-text-primary transition-colors">
                  Home
                </a>
                <a href="http://localhost:9001" className="text-text-primary font-semibold">
                  Dashboard
                </a>
                <a href="/logs" className="text-text-secondary hover:text-text-primary transition-colors">
                  {t.nav.logs}
                </a>
              </nav>
            </div>

            {/* User Info and Actions */}
            <div className="flex items-center gap-4">
              {/* Language Toggle */}
              <button
                onClick={() => setLanguage(language === "en" ? "id" : "en")}
                className="px-3 py-1 rounded-md bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors text-sm"
              >
                {language === "en" ? "ID" : "EN"}
              </button>

              {/* User Info */}
              {isAuthenticatedUser && userState ? (
                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <div className="text-sm font-medium text-text-primary">
                      {userState.user?.email || "User"}
                    </div>
                    <div className="text-xs text-text-secondary">
                      {userState.user?.tier} Tier
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-brand-purple flex items-center justify-center text-white font-semibold">
                    {userState.user?.email?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="hidden sm:block px-3 py-1 rounded-md bg-bg-tertiary text-text-secondary hover:text-red-500 hover:bg-bg-secondary transition-colors text-sm"
                  >
                    {t.nav.logout}
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleLogin}
                  className="px-4 py-2 rounded-lg bg-brand-mint text-bg-primary font-semibold hover:bg-brand-mint-hover transition-all"
                >
                  {t.nav.signIn}
                </button>
              )}
            </div>
          </div>

          {/* Mode Navigation */}
          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2">
            {modes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => handleModeChange(mode.id)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                  ${currentMode === mode.id
                    ? "bg-brand-mint text-bg-primary shadow-glow"
                    : "bg-bg-tertiary text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
                  }
                `}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
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
