/**
 * Centralised authentication (Postgres-backed).
 *
 * Auth runs on the backend auth service (Postgres). login/signup call the
 * backend and persist the returned session (access token + user) to
 * localStorage under storageKey "aivory_auth", so the access token is
 * available synchronously and can be sent as a Bearer token to the backing
 * microservices, which all verify the same self-contained JWT. This works
 * seamlessly across separate domains because the token is a self-contained JWT.
 *
 * The synchronous helpers (`getToken`, `getUser`, `isAuthenticated`) read the
 * persisted session from localStorage.
 */

import { getServiceUrl } from "./services";

const STORAGE_KEY = "aivory_auth";

/**
 * A tier as stored against a user.
 *
 * Three things are conflated in this one field by the backend and are kept
 * together for that reason: the no-plan value (`free`), the one-time products
 * that grant a feature flag (`snapshot`, `blueprint`), and the subscription
 * tiers (`operational`, `business`, `enterprise`). The subscription names are
 * the 2026 rebrand ids; `foundation` and `pro` are their pre-rebrand aliases
 * and may still appear on rows written before the rename.
 */
export type UserTier =
  | "free"
  | "snapshot"
  | "blueprint"
  | "operational"
  | "business"
  | "enterprise"
  // Pre-rebrand aliases, still present on older rows.
  | "foundation"
  | "pro";

/**
 * User interface — derived from the Supabase user. `account_type`/`tier` live
 * in Supabase user_metadata; completion flags default to false until the user
 * profile endpoint provides them.
 */
export interface User {
  user_id: string;
  email: string;
  account_type: "free" | "demo" | "superadmin" | "admin";
  company_name?: string;
  created_at: string;
  tier: UserTier;
  is_subscribed: boolean;
  has_diagnostic: boolean;
  has_snapshot: boolean;
  has_blueprint: boolean;
  credits: number;
  credits_max: number;
  token?: string;
  /** Per-account module allowlist for restricted (demo) accounts. */
  allowed_modules?: string[];
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
    // Normalize both shapes: a session stored directly, or wrapped as
    // { currentSession, expiresAt }.
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
    allowed_modules: (meta.allowed_modules as string[]) ?? undefined,
  };
}

/**
 * Whether a JWT's `exp` has passed.
 *
 * Read without a library: a JWT payload is base64url JSON, and this only needs
 * the expiry claim. Signature verification is the server's job — the point here
 * is not to trust the token, it is to stop presenting an expired one as a live
 * session. A token we cannot parse is treated as live so a malformed-but-
 * accepted token is never silently discarded on the client.
 *
 * The 30-second grace absorbs clock skew between the browser and the issuer.
 */
function isTokenExpired(token: string | undefined | null): boolean {
  if (!token) return true;
  const segment = token.split('.')[1];
  if (!segment) return false;
  try {
    const json = atob(segment.replace(/-/g, '+').replace(/_/g, '/'));
    const exp = (JSON.parse(json) as { exp?: number }).exp;
    if (typeof exp !== 'number') return false;
    return Date.now() / 1000 > exp + 30;
  } catch {
    return false;
  }
}

/**
 * Check if a live user session is present (synchronous).
 *
 * This used to return true whenever a token merely existed, so an expired
 * session still looked signed in: the navbar showed the user's name while every
 * authenticated call came back 401. Checkout was where that surfaced worst — a
 * customer solved the bot challenge, pressed pay, and got "Invalid or expired
 * token" from the gateway with no way to tell what had gone wrong.
 */
export function isAuthenticated(): boolean {
  const session = readPersistedSession();
  return Boolean(session?.access_token) && !isTokenExpired(session?.access_token);
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
        allowed_modules: data.user?.allowed_modules,
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
 * the landing) recognise the session without a second sign-in.
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
    allowed_modules: data?.user?.allowed_modules,
  };
  // Expire any legacy domain-wide variants first (older builds stamped
  // domain=.aivory.id copies; duplicates with different scopes poisoned the
  // dashboards), then set fresh host-only cookies.
  for (const k of ["aivory_access_token", "aivory_session_token", "aivory_user"]) {
    document.cookie = `${k}=; path=/; domain=.aivory.id; max-age=0; SameSite=Lax`;
  }
  const attrs = "path=/; max-age=604800; SameSite=Lax";
  document.cookie = `aivory_access_token=${at}; ${attrs}`;
  document.cookie = `aivory_session_token=${encodeURIComponent(JSON.stringify(at))}; ${attrs}`;
  document.cookie = `aivory_user=${encodeURIComponent(JSON.stringify(u))}; ${attrs}`;
}

function clearAuthCookies(): void {
  if (typeof document === "undefined") return;
  for (const k of ["aivory_access_token", "aivory_session_token", "aivory_user"]) {
    document.cookie = `${k}=; path=/; max-age=0; SameSite=Lax`;
    document.cookie = `${k}=; path=/; domain=.aivory.id; max-age=0; SameSite=Lax`;
  }
}

/** Login with email + password — uses the backend auth service (works locally without Supabase). */
/** Thrown by login() when the account is inside its 32h no-purchase window. */
export class PaymentRequiredError extends Error {
  deadlineAt: string;
  constructor(deadlineAt: string) {
    super("payment_required");
    this.deadlineAt = deadlineAt;
  }
}

export async function login(email: string, password: string): Promise<User> {
  const backendUrl = getServiceUrl("backend");
  const res = await fetch(`${backendUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = err.detail;
    if (res.status === 402 && detail && typeof detail === "object" && detail.error === "payment_required") {
      throw new PaymentRequiredError(detail.deadline_at);
    }
    throw new Error(typeof detail === "string" ? detail : "Login failed");
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
        allowed_modules: data.user?.allowed_modules,
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

/**
 * Ask the backend to email a password reset link.
 *
 * Resolves for any address. The backend deliberately answers identically
 * whether or not the email is registered — surfacing a difference here would
 * hand anyone an account-enumeration oracle from an unauthenticated page — so
 * the caller must show the same "check your inbox" message either way.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const backendUrl = getServiceUrl("backend");
  const res = await fetch(`${backendUrl}/api/v1/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, audience: "user" }),
  });

  // Only a transport/server failure is worth reporting; a 200 says nothing
  // about whether the address exists, by design.
  if (!res.ok) {
    throw new Error("Could not start the reset. Please try again.");
  }
}

/**
 * Check whether a reset link is still usable, without consuming it, so the
 * page can say "this link has expired" before the user types a new password.
 */
export async function checkResetToken(
  token: string
): Promise<{ valid: boolean; email?: string }> {
  const backendUrl = getServiceUrl("backend");
  try {
    const res = await fetch(
      `${backendUrl}/api/v1/auth/reset-password/check?token=${encodeURIComponent(token)}`
    );
    if (!res.ok) return { valid: false };
    const data = await res.json();
    return { valid: Boolean(data?.valid), email: data?.email };
  } catch {
    return { valid: false };
  }
}

/**
 * Redeem a reset link and set the new password.
 *
 * The backend drops every session for the account on success, so any persisted
 * session in this browser is stale afterwards and is cleared here.
 */
export async function resetPassword(
  token: string,
  newPassword: string
): Promise<void> {
  const backendUrl = getServiceUrl("backend");
  const res = await fetch(`${backendUrl}/api/v1/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, new_password: newPassword }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Could not reset the password");
  }

  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
    clearAuthCookies();
  }
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

/**
 * Return the current user (async wrapper kept for API compatibility).
 *
 * Auth now runs entirely on the Postgres-backed backend auth service; the
 * session (access token + user) is persisted to localStorage by login/signup.
 * There is no separate session provider to fetch from, so this resolves the
 * persisted user directly.
 */
export async function getCurrentUser(): Promise<User | null> {
  return getUser();
}
