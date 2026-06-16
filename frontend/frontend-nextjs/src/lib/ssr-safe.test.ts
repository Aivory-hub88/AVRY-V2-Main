import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fc from "fast-check";
import {
  isServerRender,
  isBrowser,
  getWindow,
  getNavigator,
  getAuthManager,
  getUserStateManager,
} from "./ssr-safe";

// These tests run under jsdom, where `window` and `navigator` are defined,
// so they cover the browser-available paths plus the legacy-global guards.

const mockAuthManager = { isAuthenticated: () => true };
const mockUserStateManager = { getUserState: () => null };

describe("SSR-Safe Browser-Global Accessors", () => {
  beforeEach(() => {
    if (window.AuthManager) {
      delete (window as any).AuthManager;
    }
    if (window.UserStateManager) {
      delete (window as any).UserStateManager;
    }
  });

  describe("isServerRender / isBrowser", () => {
    it("should report a browser environment under jsdom", () => {
      expect(isBrowser()).toBe(true);
      expect(isServerRender()).toBe(false);
    });

    it("should be exact logical complements", () => {
      expect(isServerRender()).toBe(!isBrowser());
    });
  });

  describe("getWindow", () => {
    it("should return the window object in the browser", () => {
      expect(getWindow()).toBe(window);
    });
  });

  describe("getNavigator", () => {
    it("should return the navigator object in the browser", () => {
      expect(getNavigator()).toBe(navigator);
    });
  });

  describe("getAuthManager", () => {
    it("should return null when AuthManager is not defined", () => {
      expect(getAuthManager()).toBeNull();
    });

    it("should return the AuthManager instance when present", () => {
      window.AuthManager = mockAuthManager;
      expect(getAuthManager()).toBe(mockAuthManager);
    });

    it("should not throw when accessed", () => {
      expect(() => getAuthManager()).not.toThrow();
    });
  });

  describe("getUserStateManager", () => {
    it("should return null when UserStateManager is not defined", () => {
      expect(getUserStateManager()).toBeNull();
    });

    it("should return the UserStateManager instance when present", () => {
      window.UserStateManager = mockUserStateManager;
      expect(getUserStateManager()).toBe(mockUserStateManager);
    });

    it("should not throw when accessed", () => {
      expect(() => getUserStateManager()).not.toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// SSR (server-render) PATH
//
// Property 5: SSR safety (both apps).
// Validates: Requirements 10.1, 10.2, 10.5
//
// The runner uses jsdom, where `window`/`navigator` are defined. To exercise
// the server-render path we temporarily stub those globals to `undefined`
// (simulating SSR), assert the accessors return server-safe defaults and never
// throw, then restore every global in afterEach.
// ---------------------------------------------------------------------------
describe("SSR (server-render) path — server-safe defaults", () => {
  afterEach(() => {
    // Always restore the real jsdom globals after every test.
    vi.unstubAllGlobals();
  });

  describe("with window and navigator undefined (simulated SSR)", () => {
    beforeEach(() => {
      vi.stubGlobal("window", undefined);
      vi.stubGlobal("navigator", undefined);
    });

    it("isServerRender() is true and isBrowser() is false during SSR (Req 10.1)", () => {
      expect(isServerRender()).toBe(true);
      expect(isBrowser()).toBe(false);
      // Exact logical complements.
      expect(isServerRender()).toBe(!isBrowser());
    });

    it("getWindow() returns its server-safe default (undefined) without throwing (Req 10.5)", () => {
      expect(() => getWindow()).not.toThrow();
      expect(getWindow()).toBeUndefined();
    });

    it("getNavigator() returns its server-safe default (null) without throwing (Req 10.2, 10.5)", () => {
      expect(() => getNavigator()).not.toThrow();
      expect(getNavigator()).toBeNull();
    });

    it("getAuthManager() returns null (server-safe) without throwing (Req 10.2, 10.5)", () => {
      expect(() => getAuthManager()).not.toThrow();
      expect(getAuthManager()).toBeNull();
    });

    it("getUserStateManager() returns null (server-safe) without throwing (Req 10.2, 10.5)", () => {
      expect(() => getUserStateManager()).not.toThrow();
      expect(getUserStateManager()).toBeNull();
    });

    it("no accessor reads the missing globals or throws during SSR (Req 10.2, 10.5)", () => {
      expect(() => {
        isServerRender();
        isBrowser();
        getWindow();
        getNavigator();
        getAuthManager();
        getUserStateManager();
      }).not.toThrow();
    });
  });

  // Property-style: for ARBITRARY states of the legacy globals, the accessors
  // never throw and always return their server-safe defaults during SSR.
  describe("property: accessors are SSR-safe for arbitrary legacy-global states", () => {
    // An arbitrary value that the legacy globals might hold (object, function,
    // primitive, null, undefined). These are irrelevant during SSR because
    // `window` itself is undefined, but we vary them to prove robustness.
    const legacyGlobalArb = fc.oneof(
      fc.constant(undefined),
      fc.constant(null),
      fc.constant({ isAuthenticated: () => true }),
      fc.constant({ getUserState: () => null }),
      fc.string(),
      fc.integer(),
      fc.boolean(),
    );

    it("Property 5 — accessors never throw and return server-safe defaults during SSR", () => {
      fc.assert(
        fc.property(legacyGlobalArb, legacyGlobalArb, (authMgr, userMgr) => {
          // Simulate SSR: window/navigator are undefined. Any stubbed legacy
          // manager is unreachable because there is no `window` to hang it off.
          vi.stubGlobal("window", undefined);
          vi.stubGlobal("navigator", undefined);
          // Also stub bare globals so a naive read would still be defined-ish;
          // the accessors must rely on `window` absence, not these.
          vi.stubGlobal("AuthManager", authMgr);
          vi.stubGlobal("UserStateManager", userMgr);

          try {
            expect(isServerRender()).toBe(true);
            expect(isBrowser()).toBe(false);
            expect(getWindow()).toBeUndefined();
            expect(getNavigator()).toBeNull();
            expect(getAuthManager()).toBeNull();
            expect(getUserStateManager()).toBeNull();
          } finally {
            vi.unstubAllGlobals();
          }
        }),
        { numRuns: 200 },
      );
    });
  });
});
