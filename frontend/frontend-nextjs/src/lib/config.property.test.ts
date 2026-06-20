/**
 * Property-based tests for the deterministic URL resolver.
 *
 * Property 7: Deterministic URL resolution
 * Validates: Requirements 4.4, 4.5
 *
 * These tests drive the PURE resolvers (`resolveDashboardUrl` /
 * `resolveMarketingUrl`) with fast-check arbitraries that model the full
 * environment-variable and host input space (SSR `undefined`/`null`, empty,
 * whitespace-only, mixed-case `LocalHost`, hosts carrying a port suffix such
 * as `127.0.0.1:3000`, and arbitrary strings/domains). They assert:
 *
 * - DETERMINISM (Req 4.4): repeated calls with identical inputs return
 *   byte-for-byte identical strings.
 * - NON-EQUALITY (Req 4.5): the resolved dashboard and marketing base URLs are
 *   never byte-equal for any combination of inputs.
 * - PRECEDENCE (Req 4.1-4.3): trimmed env wins; otherwise a local host yields
 *   the localhost default and any other host yields the production default.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { resolveDashboardUrl, resolveMarketingUrl } from "./config";

const DASHBOARD_URL_DEV = "http://localhost:3000";
const DASHBOARD_URL_PROD = "https://dashboard.aivory.uk";

/**
 * Models the `NEXT_PUBLIC_*` environment-variable input space: unset
 * (`undefined`), explicit `null`, empty, whitespace-only, representative
 * URL-like values (including surrounding whitespace and mixed case), and
 * arbitrary strings.
 */
const envArb: fc.Arbitrary<string | null | undefined> = fc.oneof(
  fc.constant(undefined),
  fc.constant(null),
  fc.constant(""),
  fc.constantFrom("   ", "\t", "\n", " \t \n "), // whitespace-only -> treated as unset
  fc.constantFrom(
    "https://dashboard.aivory.uk",
    "http://localhost:3000",
    "https://custom.example.com",
    "  https://padded.example.com  ", // surrounding whitespace -> trimmed
    "HTTPS://UPPER.EXAMPLE.COM",
  ),
  fc.string(),
);

/**
 * Models the request-host input space: SSR (`undefined`/`null`), empty, the two
 * recognized local hosts in varied case and with port suffixes, well-known
 * non-local hosts, and arbitrary domains/strings.
 */
const hostArb: fc.Arbitrary<string | null | undefined> = fc.oneof(
  fc.constant(undefined),
  fc.constant(null),
  fc.constant(""),
  fc.constantFrom(
    "localhost",
    "LocalHost",
    "LOCALHOST",
    "localhost:3000",
    "LocalHost:9000",
    "127.0.0.1",
    "127.0.0.1:3000",
    "  localhost  ",
  ),
  fc.constantFrom(
    "aivory.uk",
    "dashboard.aivory.uk",
    "example.com:443",
    "192.168.1.10",
  ),
  fc.domain(),
  fc.string(),
);

/** Env values that resolve as "unset" (empty after trimming). */
const emptyEnvArb: fc.Arbitrary<string | null | undefined> = fc.constantFrom(
  undefined,
  null,
  "",
  "   ",
  "\t",
  "\n",
  " \t \n ",
);

/** Whitespace-only padding fragments used to wrap a non-empty core value. */
const paddingArb: fc.Arbitrary<string> = fc.constantFrom("", " ", "  ", "\t", "\n", " \t ");

/** A non-empty value containing no whitespace, so its trim equals itself. */
const coreArb: fc.Arbitrary<string> = fc
  .string({ minLength: 1 })
  .map((s) => s.replace(/\s+/g, "_"))
  .filter((s) => s.length > 0);

/** Hosts guaranteed not to be `localhost` or `127.0.0.1`. */
const nonLocalHostArb: fc.Arbitrary<string | null | undefined> = fc
  .oneof(
    fc.constant(undefined),
    fc.constant(null),
    fc.constant(""),
    fc.domain(),
    fc.constantFrom("aivory.uk", "dashboard.aivory.uk", "192.168.0.1", "example.com:8080"),
  )
  .filter((h) => {
    if (h == null || h === "") return true;
    const name = h.trim().toLowerCase().split(":")[0];
    return name !== "localhost" && name !== "127.0.0.1";
  });

describe("Property 7: Deterministic URL resolution", () => {
  describe("determinism (Req 4.4)", () => {
    it("resolves the dashboard URL byte-for-byte identically across repeated invocations", () => {
      fc.assert(
        fc.property(envArb, hostArb, (env, host) => {
          const first = resolveDashboardUrl(env, host);
          const second = resolveDashboardUrl(env, host);
          const third = resolveDashboardUrl(env, host);
          expect(second).toBe(first);
          expect(third).toBe(first);
        }),
      );
    });

    it("resolves the marketing URL byte-for-byte identically across repeated invocations", () => {
      fc.assert(
        fc.property(envArb, envArb, hostArb, (marketingEnv, dashboardEnv, host) => {
          const first = resolveMarketingUrl(marketingEnv, dashboardEnv, host);
          const second = resolveMarketingUrl(marketingEnv, dashboardEnv, host);
          const third = resolveMarketingUrl(marketingEnv, dashboardEnv, host);
          expect(second).toBe(first);
          expect(third).toBe(first);
        }),
      );
    });
  });

  describe("non-equality (Req 4.5)", () => {
    it("never resolves the dashboard and marketing URLs to byte-equal strings", () => {
      fc.assert(
        fc.property(envArb, envArb, hostArb, (marketingEnv, dashboardEnv, host) => {
          // The production `getMarketingUrl` reads the same NEXT_PUBLIC_DASHBOARD_URL
          // as `getDashboardUrl`, so the non-equality guarantee is exercised by
          // sharing `dashboardEnv` across both resolvers.
          const dashboard = resolveDashboardUrl(dashboardEnv, host);
          const marketing = resolveMarketingUrl(marketingEnv, dashboardEnv, host);
          expect(marketing).not.toBe(dashboard);
        }),
      );
    });

    it("keeps the URLs distinct even when both env vars are configured to the same value", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
          hostArb,
          (shared, host) => {
            const dashboard = resolveDashboardUrl(shared, host);
            const marketing = resolveMarketingUrl(shared, shared, host);
            expect(marketing).not.toBe(dashboard);
          },
        ),
      );
    });
  });

  describe("precedence rules (Req 4.1-4.3)", () => {
    it("returns the trimmed env value whenever it is non-empty after trimming (Req 4.1)", () => {
      fc.assert(
        fc.property(coreArb, paddingArb, paddingArb, hostArb, (core, left, right, host) => {
          const env = `${left}${core}${right}`;
          expect(resolveDashboardUrl(env, host)).toBe(core);
        }),
      );
    });

    it("defaults to the localhost dashboard URL for local hosts when env is unset (Req 4.2)", () => {
      const localHostArb = fc.constantFrom(
        "localhost",
        "LocalHost",
        "LOCALHOST",
        "localhost:3000",
        "LocalHost:9000",
        "127.0.0.1",
        "127.0.0.1:3000",
        "  localhost  ",
      );
      fc.assert(
        fc.property(emptyEnvArb, localHostArb, (env, host) => {
          expect(resolveDashboardUrl(env, host)).toBe(DASHBOARD_URL_DEV);
        }),
      );
    });

    it("defaults to the production dashboard URL for non-local hosts when env is unset (Req 4.3)", () => {
      fc.assert(
        fc.property(emptyEnvArb, nonLocalHostArb, (env, host) => {
          expect(resolveDashboardUrl(env, host)).toBe(DASHBOARD_URL_PROD);
        }),
      );
    });
  });
});
