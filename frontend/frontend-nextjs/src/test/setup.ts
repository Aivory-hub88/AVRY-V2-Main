import { expect, afterEach, vi, beforeEach } from "vitest";
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";

expect.extend(matchers);

// Mock Next.js Link component
vi.mock('next/link', () => {
  const React = require('react');
  return {
    default: ({ children, href, className, target, rel }: { children: React.ReactNode; href: string; className?: string; target?: string; rel?: string }) => {
      return React.createElement('a', { href, className, target, rel }, children);
    },
  };
});

// Cleanup after each test
afterEach(() => {
  cleanup();
});
