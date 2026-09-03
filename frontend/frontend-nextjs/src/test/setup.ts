/**
 * Vitest setup — referenced by `vitest.config.ts` as `setupFiles`.
 *
 * The config had pointed at this path for some time while the file itself was
 * absent and untracked, so every one of the 43 test files failed at collection
 * with "Failed to load url .../src/test/setup.ts" and the suite reported no
 * tests at all. It registers jest-dom's matchers and unmounts React trees
 * between tests so component state cannot leak across cases.
 */
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

/**
 * Web Storage polyfill.
 *
 * Node 22+ ships its own `localStorage` global, and from Node 25 it is present
 * in the jsdom environment too — where it shadows jsdom's implementation. The
 * one that wins is only half a Storage: `window.localStorage.clear` and
 * `.getItem` are `undefined`, and the run logs "`--localstorage-file` was
 * provided without a valid path". Anything touching storage therefore died on
 * "localStorage.clear is not a function" (src/lib/auth.test.ts, all 8) or
 * "localStorage.getItem is not a function" (CommentSection.test.tsx, 12).
 *
 * Installing a plain in-memory Storage is more predictable than trying to coax
 * jsdom's back into place, and it is what the tests actually need.
 */
function createStorage(): Storage {
  let store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    key(index: number): string | null {
      return Array.from(store.keys())[index] ?? null;
    },
    getItem(key: string): string | null {
      return store.has(String(key)) ? (store.get(String(key)) as string) : null;
    },
    setItem(key: string, value: string): void {
      store.set(String(key), String(value));
    },
    removeItem(key: string): void {
      store.delete(String(key));
    },
    clear(): void {
      store = new Map<string, string>();
    },
  } as Storage;
}

const localStorageMock = createStorage();
const sessionStorageMock = createStorage();

for (const [name, value] of [
  ['localStorage', localStorageMock],
  ['sessionStorage', sessionStorageMock],
] as const) {
  // configurable so a test that wants to stub storage itself still can.
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  if (typeof window !== 'undefined' && window !== globalThis) {
    Object.defineProperty(window, name, { value, configurable: true, writable: true });
  }
}

beforeEach(() => {
  // Storage outlives a render, so without this a key written by one test is
  // still there for the next one.
  localStorageMock.clear();
  sessionStorageMock.clear();
});

afterEach(() => {
  cleanup();
});
