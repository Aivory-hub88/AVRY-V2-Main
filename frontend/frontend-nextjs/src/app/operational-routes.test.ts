import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Requirement 1.4: IF a client requests an operational dashboard path
 * (`app/dashboard/*`, `app/console`, `app/workflows`, `app/logs`, `app/settings`)
 * at `aivory.uk`, THEN THE Marketing_Site SHALL respond with a not-found result
 * and SHALL NOT render any operational dashboard page.
 *
 * In the Next.js App Router, a route is only served when a matching segment
 * directory contains a `page` module under `src/app`. When no such file exists,
 * the router returns its built-in not-found page for that path and renders no
 * page component. These filesystem assertions therefore verify that the
 * operational routes were removed and resolve to not-found, while no operational
 * dashboard page module remains importable under `src/app`.
 */

// This test file lives in `src/app`, so its own directory is the app root.
const APP_DIR = dirname(fileURLToPath(import.meta.url));

// Operational dashboard routes that MUST have been removed from the marketing app.
const REMOVED_OPERATIONAL_ROUTES = [
  "dashboard",
  "console",
  "workflows",
  "logs",
  "settings",
] as const;

// Page module extensions the App Router recognizes for a servable route.
const PAGE_EXTENSIONS = ["tsx", "ts", "jsx", "js"] as const;

// Routes that the marketing site KEEPS and must continue to serve.
const KEPT_ROUTES = ["diagnostic", "login", "payment"] as const;

describe("Operational dashboard routes removed from the marketing app (Req 1.4)", () => {
  describe("removed operational route folders are absent", () => {
    it.each(REMOVED_OPERATIONAL_ROUTES)(
      "does not contain a `%s` route folder under src/app",
      (route) => {
        expect(existsSync(join(APP_DIR, route))).toBe(false);
      },
    );
  });

  describe("removed operational routes expose no servable page module", () => {
    it.each(REMOVED_OPERATIONAL_ROUTES)(
      "has no page module for the `%s` route (resolves to not-found)",
      (route) => {
        for (const ext of PAGE_EXTENSIONS) {
          expect(existsSync(join(APP_DIR, route, `page.${ext}`))).toBe(false);
        }
      },
    );
  });

  it("dashboard sub-routes are fully removed (app/dashboard/*)", () => {
    // The entire `dashboard` segment is gone, so any nested operational
    // sub-route (e.g. dashboard/console, dashboard/workflows) is unreachable.
    const dashboardDir = join(APP_DIR, "dashboard");
    expect(existsSync(dashboardDir)).toBe(false);
  });

  describe("no operational route page module is importable under src/app", () => {
    it("cannot import a default page export from any removed operational route", async () => {
      for (const route of REMOVED_OPERATIONAL_ROUTES) {
        for (const ext of PAGE_EXTENSIONS) {
          const modulePath = join(APP_DIR, route, `page.${ext}`);
          // The file must not exist, so importing it must reject.
          expect(existsSync(modulePath)).toBe(false);
          await expect(import(/* @vite-ignore */ modulePath)).rejects.toBeTruthy();
        }
      }
    });
  });

  describe("kept marketing routes are still served (sanity check, Req 1.1)", () => {
    it("retains the root marketing page", () => {
      const hasRootPage = PAGE_EXTENSIONS.some((ext) =>
        existsSync(join(APP_DIR, `page.${ext}`)),
      );
      expect(hasRootPage).toBe(true);
    });

    it.each(KEPT_ROUTES)("retains the `%s` route page", (route) => {
      const hasPage = PAGE_EXTENSIONS.some((ext) =>
        existsSync(join(APP_DIR, route, `page.${ext}`)),
      );
      expect(hasPage).toBe(true);
    });
  });
});
