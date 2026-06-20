/**
 * Centralized Supabase authentication.
 *
 * Auth is centralized on Supabase across the whole platform (homepage, user
 * dashboard and admin dashboard). The Supabase browser client persists the
 * session in localStorage (storageKey "aivory_auth"), so the access token is
 * available synchronously and can be sent as a Bearer token to the backing
 * microservices, which all verify Supabase JWTs. This works seamlessly across
 * separate domains because the token is a self-contained JWT.
 *
 * The synchronous helpers (`getToken`, `getUser`, `isAuthenticated`) read the
 * persisted Supabase session from localStorage to preserve the existing call
 * sites; `getCurrentUser` performs a fresh async fetch.
 */

import { supabase } from "./supabase";
import { getServiceUrl } from "./services";

const STORAGE_KEY = "aivory_auth";

/**
 * User interface — derived from the Supabase user. `account_type`/`tier` live
 * in Supabase user_metadata; completion flags default to false until the user
 * profile endpoint provides them.
 */
export interface User {
  user_id: string;
  email: string;
  account_type: "free" | "superadmin" | "admin";
  company_name?: string;
  created_at: string;
  tier: "free" | "snapshot" | "blueprint" | "enterprise";
  is_subscribed: boolean;
  has_diagnostic: boolean;
  has_snapshot: boolean;
  has_blueprint: boolean;
  credits: number;
  credits_max: number;
  token?: string;
}

/** Shape of the Supabase session blob persisted in localStorage. */
interface PersistedSession {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  user?: {
    id: string;
    email?: string;
    created_at?: string;
    user_metadata?: Record<string, unknown>;
    app_metadata?: Record<string, unknown>;
  };
}

/** Read the persisted Supabase session synchronously from localStorage. */
function readPersistedSession(): PersistedSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // supabase-js stores { currentSession, expiresAt } or the session directly
    // depending on version; normalize both.
    return (parsed?.currentSession ?? parsed) as PersistedSession;
  } catch {
    return null;
  }
}

function mapUser(
  su: NonNullable<PersistedSession["user"]>,
  token?: string
): User {
  const meta = (su.user_metadata ?? {}) as Record<string, unknown>;
  const app = (su.app_metadata ?? {}) as Record<string, unknown>;
  const accountType =
    (meta.account_type as User["account_type"]) ??
    (app.account_type as User["account_type"]) ??
    "free";
  const tier = (meta.tier as User["tier"]) ?? "free";
  return {
    user_id: su.id,
    email: su.email ?? "",
    account_type: accountType,
    company_name: (meta.company_name as string) ?? undefined,
    created_at: su.created_at ?? new Date().toISOString(),
    tier,
    is_subscribed: Boolean(meta.is_subscribed),
    has_diagnostic: Boolean(meta.has_diagnostic),
    has_snapshot: Boolean(meta.has_snapshot),
    has_blueprint: Boolean(meta.has_blueprint),
    credits: Number(meta.credits ?? 0),
    credits_max: Number(meta.credits_max ?? 0),
    token,
  };
}

/** Check if a user session is present (synchronous). */
export function isAuthenticated(): boolean {
  const session = readPersistedSession();
  return Boolean(session?.access_token);
}

/** Get the current user from the persisted session (synchronous). */
export function getUser(): User | null {
  const session = readPersistedSession();
  if (!session?.user) return null;
  return mapUser(session.user, session.access_token);
}

/** Get the current access token from the persisted session (synchronous). */
export function getToken(): string | null {
  const session = readPersistedSession();
  return session?.access_token ?? null;
}

/** Check whether the current user is an admin/superadmin. */
export function isAdmin(): boolean {
  const user = getUser();
  return user?.account_type === "superadmin" || user?.account_type === "admin";
}

/** Get user role ("user" or "admin"). */
export function getUserRole(): "user" | "admin" | null {
  if (!isAuthenticated()) return null;
  return isAdmin() ? "admin" : "user";
}

/**
 * Determine redirect URL after login. All users return to the homepage;
 * the dashboard is accessed via the dashboard button.
 */
export function getPostLoginRedirectUrl(): string {
  return "/";
}

/** Register a new user — uses the backend auth service (works locally without Supabase). */
export async function signup(
  email: string,
  password: string,
  company_name?: string
): Promise<User> {
  const backendUrl = getServiceUrl("backend");
  const res = await fetch(`${backendUrl}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, company_name }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Registration failed");
  }

  const data = await res.json();
  // Backend returns { user, tokens: { access_token, refresh_token } }
  const session: PersistedSession = {
    access_token: data.tokens?.access_token,
    refresh_token: data.tokens?.refresh_token,
    user: {
      id: data.user?.user_id || "",
      email: data.user?.email || email,
      created_at: data.user?.created_at,
      user_metadata: {
        account_type: data.user?.account_type || "free",
        tier: data.user?.tier || "free",
        company_name: data.user?.company_name || company_name,
      },
    },
  };
  // Persist to localStorage so getToken/getUser/isAuthenticated work
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    setAuthCookies(data);
    window.dispatchEvent(new Event("authManager:login"));
  }
  return mapUser(session.user!, session.access_token);
}

/**
 * Set shared cookies so the user & admin dashboards (path-based, same host as
 * the landing) recognize the session without a second sign-in.
 * - admin middleware reads `aivory_access_token` (raw JWT, decoded for account_type)
 * - user dashboard authManager reads `aivory_session_token` + `aivory_user` (JSON)
 * Host-only, path=/ so they are sent to /dashboard and /admin on the same host.
 */
function setAuthCookies(data: any): void {
  if (typeof document === "undefined") return;
  const at = data?.tokens?.access_token || "";
  const acct = data?.user?.account_type || "free";
  const u = {
    id: data?.user?.user_id || "",
    email: data?.user?.email || "",
    account_type: acct,
    role: acct,
  };
  const attrs = "path=/; max-age=604800; SameSite=Lax";
  document.cookie = `aivory_access_token=${at}; ${attrs}`;
  document.cookie = `aivory_session_token=${encodeURIComponent(JSON.stringify(at))}; ${attrs}`;
  document.cookie = `aivory_user=${encodeURIComponent(JSON.stringify(u))}; ${attrs}`;
}

function clearAuthCookies(): void {
  if (typeof document === "undefined") return;
  for (const k of ["aivory_access_token", "aivory_session_token", "aivory_user"]) {
    document.cookie = `${k}=; path=/; max-age=0; SameSite=Lax`;
  }
}

/** Login with email + password — uses the backend auth service (works locally without Supabase). */
export async function login(email: string, password: string): Promise<User> {
  const backendUrl = getServiceUrl("backend");
  const res = await fetch(`${backendUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Login failed");
  }

  const data = await res.json();
  const session: PersistedSession = {
    access_token: data.tokens?.access_token,
    refresh_token: data.tokens?.refresh_token,
    user: {
      id: data.user?.user_id || "",
      email: data.user?.email || email,
      created_at: data.user?.created_at,
      user_metadata: {
        account_type: data.user?.account_type || "free",
        tier: data.user?.tier || "free",
        company_name: data.user?.company_name,
      },
    },
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    setAuthCookies(data);
    window.dispatchEvent(new Event("authManager:login"));
  }
  return mapUser(session.user!, session.access_token);
}

/** Logout — clears localStorage and optionally redirects home. */
export async function logout(redirect: boolean = true): Promise<void> {
  try {
    // Attempt backend logout (best-effort)
    const token = getToken();
    const refresh = typeof window !== "undefined" ? JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}").refresh_token : null;
    if (token && refresh) {
      const backendUrl = getServiceUrl("backend");
      await fetch(`${backendUrl}/api/v1/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh }),
      }).catch(() => {});
    }
  } finally {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
      clearAuthCookies();
      window.dispatchEvent(new Event("authManager:logout"));
      if (redirect) {
        setTimeout(() => {
          window.location.href = "/";
        }, 100);
      }
    }
  }
}

/** Fetch the current user fresh from Supabase (async). */
export async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return null;
  }
  const { data: sessionData } = await supabase.auth.getSession();
  return mapUser(
    data.user as PersistedSession["user"] & object,
    sessionData.session?.access_token
  );
}
