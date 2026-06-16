import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Lazily-initialized browser Supabase client.
 *
 * Auth is centralized on Supabase across the whole platform. The session is
 * persisted in localStorage so the access token can be sent as a Bearer token
 * to the backing microservices (which all verify Supabase JWTs). Because the
 * token is a self-contained JWT, this works seamlessly across separate domains
 * without cross-domain cookies.
 *
 * The client is created lazily on first use so that importing this module
 * during SSR/static prerender (when NEXT_PUBLIC_* env vars may be absent) never
 * triggers `createClient` and never throws.
 */

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  if (!url || !key) {
    // eslint-disable-next-line no-console
    console.error(
      "[auth] Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  _client = createClient(
    url || "https://placeholder.supabase.co",
    key || "public-anon-key-placeholder",
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: "aivory_auth",
      },
    }
  );
  return _client;
}

/**
 * Proxy that forwards property access to the lazily-created client. This keeps
 * the `supabase.auth.signInWithPassword(...)` call sites unchanged while
 * deferring client creation until first use (browser runtime).
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client as object, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
