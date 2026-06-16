/**
 * SSR-Safe Browser-Global Accessors
 *
 * Provides guarded accessors for browser-only globals (`window`, `navigator`)
 * and the legacy global managers (`AuthManager`, `UserStateManager`).
 *
 * During a server render (when `window`/`navigator` are undefined), these
 * accessors return server-safe defaults (`undefined`/`null`/no-op) instead of
 * throwing a `ReferenceError`. This guarantees SSR safety so that `next build`
 * and the initial server response never crash on client-only globals.
 *
 * Note: the legacy globals `window.AuthManager` and `window.UserStateManager`
 * are injected by legacy scripts loaded in the browser. They may be undefined
 * even in the browser (before the legacy script loads), so the wrappers always
 * access them safely off `window` and tolerate their absence.
 *
 * _Requirements: 10.2, 10.5_
 */

declare global {
  interface Window {
    AuthManager: any;
    UserStateManager: any;
  }
}

/**
 * Determine whether code is currently executing during a server render.
 *
 * A server render is detected by the absence of the `window` global, which is
 * only defined in a browser environment.
 *
 * @returns `true` when running on the server (no `window`), otherwise `false`
 */
export function isServerRender(): boolean {
  return typeof window === "undefined";
}

/**
 * Determine whether code is currently executing in a browser environment.
 *
 * @returns `true` when running in the browser (`window` is defined), otherwise `false`
 */
export function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/**
 * Safely access the `window` global.
 *
 * @returns the `Window` object in the browser, or `undefined` during SSR
 */
export function getWindow(): (Window & typeof globalThis) | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  return window;
}

/**
 * Safely access the `navigator` global.
 *
 * Returns `null` during SSR or when `navigator` is otherwise unavailable, so
 * callers can use a single nullish check before reading navigator properties.
 *
 * @returns the `Navigator` object in the browser, or `null` during SSR
 */
export function getNavigator(): Navigator | null {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return null;
  }
  return navigator;
}

/**
 * Safely access the legacy `window.AuthManager` global.
 *
 * Returns `null` during SSR or when the legacy script has not yet defined the
 * manager, rather than throwing a `ReferenceError`.
 *
 * @returns the `AuthManager` instance when present, otherwise `null`
 */
export function getAuthManager(): any | null {
  const win = getWindow();
  if (!win || typeof win.AuthManager === "undefined") {
    return null;
  }
  return win.AuthManager;
}

/**
 * Safely access the legacy `window.UserStateManager` global.
 *
 * Returns `null` during SSR or when the legacy script has not yet defined the
 * manager, rather than throwing a `ReferenceError`.
 *
 * @returns the `UserStateManager` instance when present, otherwise `null`
 */
export function getUserStateManager(): any | null {
  const win = getWindow();
  if (!win || typeof win.UserStateManager === "undefined") {
    return null;
  }
  return win.UserStateManager;
}
