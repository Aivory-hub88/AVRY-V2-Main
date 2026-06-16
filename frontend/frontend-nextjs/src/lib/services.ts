/**
 * Microservice base URLs (client-side).
 *
 * Each domain is its own service with its own domain in production. These are
 * NEXT_PUBLIC_* vars because the browser calls the services directly with the
 * Supabase Bearer token. Each falls back to NEXT_PUBLIC_API_BASE_URL (and then
 * a local dev default) so a single backend still works during development.
 *
 * No trailing slash.
 */

const SHARED =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8081";

function svc(specific: string | undefined): string {
  return (specific || SHARED).replace(/\/$/, "");
}

export const SERVICE_URLS = {
  backend: svc(process.env.NEXT_PUBLIC_BACKEND_URL),
  payments: svc(process.env.NEXT_PUBLIC_PAYMENTS_URL),
  diagnostics: svc(process.env.NEXT_PUBLIC_DIAGNOSTICS_URL),
  blueprint: svc(process.env.NEXT_PUBLIC_BLUEPRINT_URL),
  roadmap: svc(process.env.NEXT_PUBLIC_ROADMAP_URL),
  workflows: svc(process.env.NEXT_PUBLIC_WORKFLOWS_URL),
  blog: svc(process.env.NEXT_PUBLIC_BLOG_URL),
  careers: svc(process.env.NEXT_PUBLIC_CAREERS_URL),
} as const;

export type ServiceName = keyof typeof SERVICE_URLS;

export function getServiceUrl(name: ServiceName): string {
  return SERVICE_URLS[name];
}
