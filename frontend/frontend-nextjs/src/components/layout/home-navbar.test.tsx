// @ts-nocheck
/**
 * DOM tests for the homepage navbar (`home-navbar.tsx`).
 *
 * Homepage legacy parity — Requirements 3.3, 4.3, 6.7, 10.1.
 *
 * These are CI-safe, browser-free assertions (jsdom + Testing Library) that pin
 * the legacy-parity contract of the navbar without a screenshot diff:
 *
 *  - Req 3.3  — the `Sign In` link and `Dashboard` control are both present.
 *  - Req 4.3  — Manrope is applied to `Sign In` and `Dashboard` via the
 *               `font-manrope` token utility (replacing the inline
 *               `"Manrope", sans-serif`).
 *  - Req 10.1 — the brand mark is the legacy SVG `BrandLogo` (an image with the
 *               accessible name "Aivory").
 *  - Req 6.7  — at <=768px the nav container is a centered single column
 *               (Tailwind base styles, switching to a spread row at `md:`), and
 *               the Dashboard control shrinks to `13px` font-size / `0 16px`
 *               padding (`text-[13px] px-[16px]`, restored to `15px`/`28px` at
 *               `md:`).
 *
 * `next/navigation` (`useRouter`), `@/lib/auth`, and `next/image` (used by
 * `BrandLogo`) are mocked so the client component renders in isolation.
 */

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mocks (hoisted so the factories can reference them safely)
// ---------------------------------------------------------------------------

const { pushMock, isAuthenticatedMock, logoutMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  isAuthenticatedMock: vi.fn<[], boolean>(() => false),
  logoutMock: vi.fn(),
}));

// Mock next/navigation — the navbar reads `useRouter()` for navigation.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

// Mock @/lib/auth — the navbar's auth state is driven by `isAuthenticated`.
vi.mock("@/lib/auth", () => ({
  isAuthenticated: isAuthenticatedMock,
  logout: logoutMock,
}));

// Mock next/image — BrandLogo renders the SVG via next/image. Render a plain
// <img> and drop non-DOM props (priority/unoptimized) to avoid React warnings.
vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    className,
  }: {
    src: string;
    alt: string;
    className?: string;
  }) => React.createElement("img", { src, alt, className }),
}));

import { HomeNavbar } from "./home-navbar";

describe("HomeNavbar — legacy parity DOM", () => {
  beforeEach(() => {
    pushMock.mockClear();
    logoutMock.mockClear();
    // Default: unauthenticated, so the `Sign In` link is rendered.
    isAuthenticatedMock.mockReturnValue(false);
  });

  // -------------------------------------------------------------------------
  // Req 3.3 — required labels present
  // -------------------------------------------------------------------------
  describe("required labels (Req 3.3)", () => {
    it("renders a `Sign In` link", () => {
      render(<HomeNavbar />);
      const signIn = screen.getByRole("link", { name: /sign in/i });
      expect(signIn).toBeInTheDocument();
    });

    it("renders a `Dashboard` control", () => {
      render(<HomeNavbar />);
      const dashboard = screen.getByRole("button", { name: /dashboard/i });
      expect(dashboard).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Req 4.3 — Manrope token applied to Sign In + Dashboard
  // -------------------------------------------------------------------------
  describe("Manrope typography token (Req 4.3)", () => {
    it("applies `font-manrope` to the Sign In link", () => {
      render(<HomeNavbar />);
      const signIn = screen.getByRole("link", { name: /sign in/i });
      expect(signIn).toHaveClass("font-manrope");
    });

    it("applies `font-manrope` to the Dashboard control", () => {
      render(<HomeNavbar />);
      const dashboard = screen.getByRole("button", { name: /dashboard/i });
      expect(dashboard).toHaveClass("font-manrope");
    });

    it("does not use the brittle inline `Manrope` font-family string", () => {
      render(<HomeNavbar />);
      const signIn = screen.getByRole("link", { name: /sign in/i });
      const dashboard = screen.getByRole("button", { name: /dashboard/i });
      // The token utility replaces the inline `fontFamily: '"Manrope", ...'`.
      expect(signIn.style.fontFamily).toBe("");
      expect(dashboard.style.fontFamily).toBe("");
    });
  });

  // -------------------------------------------------------------------------
  // Req 10.1 — legacy SVG brand logo present
  // -------------------------------------------------------------------------
  describe("brand logo (Req 10.1)", () => {
    it("renders the brand logo image with the accessible name `Aivory`", () => {
      render(<HomeNavbar />);
      const logo = screen.getByAltText("Aivory");
      expect(logo).toBeInTheDocument();
      expect(logo.tagName).toBe("IMG");
      expect(logo).toHaveAttribute("src", "/aivory-logo-2026.svg");
    });
  });

  // -------------------------------------------------------------------------
  // Req 6.7 — <=768px mobile layout rules
  // -------------------------------------------------------------------------
  describe("responsive mobile layout (Req 6.7)", () => {
    it("centers the nav container in a single column at <=768px (row at md)", () => {
      render(<HomeNavbar />);
      const nav = screen.getByRole("navigation");
      const container = nav.querySelector("div");
      expect(container).not.toBeNull();
      // Base (<=768px): centered single column.
      expect(container).toHaveClass(
        "flex",
        "flex-col",
        "items-center",
        "justify-center",
      );
      // md (>=768px): legacy spread row.
      expect(container).toHaveClass(
        "md:flex-row",
        "md:justify-between",
      );
    });

    it("shrinks the Dashboard control to 13px / 0 16px at <=768px (restored at md)", () => {
      render(<HomeNavbar />);
      const dashboard = screen.getByRole("button", { name: /dashboard/i });
      // Base (<=768px): legacy mobile sizing.
      expect(dashboard).toHaveClass("text-[13px]", "px-[16px]");
      // md (>=768px): desktop sizing restored.
      expect(dashboard).toHaveClass("md:text-[15px]", "md:px-[28px]");
    });
  });

  // -------------------------------------------------------------------------
  // Stable region identifier + auth-aware enhancement (supporting coverage)
  // -------------------------------------------------------------------------
  describe("region identifier & auth state", () => {
    it("exposes the <nav> landmark as the stable queryable region", () => {
      render(<HomeNavbar />);
      expect(screen.getByRole("navigation")).toBeInTheDocument();
    });

    it("renders the Logout enhancement instead of Sign In when authenticated", () => {
      isAuthenticatedMock.mockReturnValue(true);
      render(<HomeNavbar />);
      expect(
        screen.getByRole("button", { name: /logout/i }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: /sign in/i }),
      ).not.toBeInTheDocument();
      // Dashboard remains present regardless of auth state.
      expect(
        screen.getByRole("button", { name: /dashboard/i }),
      ).toBeInTheDocument();
    });
  });
});
