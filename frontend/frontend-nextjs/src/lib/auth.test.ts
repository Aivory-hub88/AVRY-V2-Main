import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { isAuthenticated, getUser, getToken } from "./auth";

// Mock supabase module
vi.mock("./supabase", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(),
    },
  },
}));

// Mock services module
vi.mock("./services", () => ({
  getServiceUrl: vi.fn(() => "http://localhost:8081"),
}));

const STORAGE_KEY = "aivory_auth";

describe("Auth (Supabase-based)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("isAuthenticated", () => {
    it("should return false when no session is stored", () => {
      expect(isAuthenticated()).toBe(false);
    });

    it("should return true when a valid session is in localStorage", () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          access_token: "test-token",
          user: { id: "user-1", email: "test@example.com" },
        })
      );
      expect(isAuthenticated()).toBe(true);
    });

    it("should return false when session has no access_token", () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          user: { id: "user-1", email: "test@example.com" },
        })
      );
      expect(isAuthenticated()).toBe(false);
    });
  });

  describe("getUser", () => {
    it("should return null when no session is stored", () => {
      expect(getUser()).toBeNull();
    });

    it("should return a User object from persisted session", () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          access_token: "test-token",
          user: {
            id: "user-123",
            email: "test@example.com",
            created_at: "2024-01-01T00:00:00Z",
            user_metadata: {
              account_type: "free",
              tier: "free",
              company_name: "Test Corp",
            },
          },
        })
      );

      const user = getUser();
      expect(user).not.toBeNull();
      expect(user!.user_id).toBe("user-123");
      expect(user!.email).toBe("test@example.com");
      expect(user!.account_type).toBe("free");
      expect(user!.company_name).toBe("Test Corp");
      expect(user!.token).toBe("test-token");
    });

    it("should return null when session has no user", () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ access_token: "test-token" })
      );
      expect(getUser()).toBeNull();
    });
  });

  describe("getToken", () => {
    it("should return null when no session is stored", () => {
      expect(getToken()).toBeNull();
    });

    it("should return the access_token from persisted session", () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          access_token: "my-jwt-token",
          user: { id: "user-1" },
        })
      );
      expect(getToken()).toBe("my-jwt-token");
    });
  });
});
