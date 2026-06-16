/// <reference types="vitest/globals" />

import type { Mock } from 'vitest';

declare global {
  const vi: {
    fn: <T = () => unknown>() => Mock<T>;
    mocked: <T = unknown>(item: T) => T;
    clearAllMocks: () => void;
  };
  const beforeEach: (fn: () => void | Promise<void>) => void;
  const describe: (name: string, fn: () => void) => void;
  const it: (name: string, fn: () => void | Promise<void>) => void;
  const expect: import('vitest').Expect;
}

export {};
