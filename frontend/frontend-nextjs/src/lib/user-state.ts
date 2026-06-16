/**
 * User State Management
 * Manages user state, tier, preferences, and diagnostics persistently
 */

import { User } from "./auth";

/**
 * User state interface
 */
export interface UserState {
  user: User | null;
  diagnostics: {
    completed: string[];
    current: string | null;
    drafts: string[];
  };
  preferences: {
    language: "en" | "id";
    theme: "light" | "dark";
    notifications: boolean;
  };
  lastUpdated: string;
}

/**
 * Language type
 */
export type Language = "en" | "id";

/**
 * User tier type
 */
export type UserTier = "free" | "snapshot" | "blueprint" | "enterprise";

/**
 * Default user state
 */
const DEFAULT_USER_STATE: UserState = {
  user: null,
  diagnostics: {
    completed: [],
    current: null,
    drafts: [],
  },
  preferences: {
    language: "en",
    theme: "light",
    notifications: true,
  },
  lastUpdated: new Date().toISOString(),
};

/**
 * Get user state from localStorage
 * @returns Current user state or default state
 */
export function getUserState(): UserState {
  if (typeof window === "undefined") {
    return DEFAULT_USER_STATE;
  }

  try {
    const stateJson = localStorage.getItem("user_state");
    if (stateJson) {
      const state = JSON.parse(stateJson) as UserState;
      // Also sync with user_data for the user object
      const userDataJson = localStorage.getItem("user_data");
      if (userDataJson) {
        const userData = JSON.parse(userDataJson) as User;
        state.user = userData;
      }
      return state;
    }
  } catch (e) {
    console.error("[UserState] Failed to parse user state:", e);
  }

  return DEFAULT_USER_STATE;
}

/**
 * Set user state in localStorage
 * @param state - User state to store
 */
export function setUserState(state: UserState): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const stateToStore = {
      ...state,
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem("user_state", JSON.stringify(stateToStore));
    
    // Dispatch update event
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("userState:update"));
    }
  } catch (e) {
    console.error("[UserState] Failed to set user state:", e);
  }
}

/**
 * Update user in state
 * @param user - User object to update
 */
export function setUserInState(user: User): void {
  const state = getUserState();
  state.user = user;
  setUserState(state);
}

/**
 * Add completed diagnostic
 * @param diagnosticId - ID of completed diagnostic
 */
export function addCompletedDiagnostic(diagnosticId: string): void {
  const state = getUserState();
  if (!state.diagnostics.completed.includes(diagnosticId)) {
    state.diagnostics.completed.push(diagnosticId);
  }
  setUserState(state);
}

/**
 * Set current diagnostic
 * @param diagnosticId - ID of current diagnostic or null
 */
export function setCurrentDiagnostic(diagnosticId: string | null): void {
  const state = getUserState();
  state.diagnostics.current = diagnosticId;
  setUserState(state);
}

/**
 * Add draft diagnostic
 * @param diagnosticId - ID of draft diagnostic
 */
export function addDraftDiagnostic(diagnosticId: string): void {
  const state = getUserState();
  if (!state.diagnostics.drafts.includes(diagnosticId)) {
    state.diagnostics.drafts.push(diagnosticId);
  }
  setUserState(state);
}

/**
 * Remove draft diagnostic
 * @param diagnosticId - ID of draft diagnostic to remove
 */
export function removeDraftDiagnostic(diagnosticId: string): void {
  const state = getUserState();
  state.diagnostics.drafts = state.diagnostics.drafts.filter(
    (id) => id !== diagnosticId
  );
  setUserState(state);
}

/**
 * Get user tier from state
 * @returns User tier or "free" if not set
 */
export function getUserTier(): UserTier {
  const state = getUserState();
  return (state.user?.tier as UserTier) || "free";
}

/**
 * Check if user has specific feature
 * @param feature - Feature to check ("diagnostic", "snapshot", "blueprint")
 * @returns boolean indicating if user has feature
 */
export function hasFeature(feature: "diagnostic" | "snapshot" | "blueprint"): boolean {
  const state = getUserState();
  if (!state.user) {
    return false;
  }

  switch (feature) {
    case "diagnostic":
      return state.user.has_diagnostic;
    case "snapshot":
      return state.user.has_snapshot;
    case "blueprint":
      return state.user.has_blueprint;
    default:
      return false;
  }
}

/**
 * Get user credits
 * @returns Current credits and max credits
 */
export function getCredits(): { current: number; max: number } {
  const state = getUserState();
  return {
    current: state.user?.credits || 0,
    max: state.user?.credits_max || 0,
  };
}

/**
 * Check if user has enough credits
 * @param required - Required credits
 * @returns boolean indicating if user has enough
 */
export function hasEnoughCredits(required: number): boolean {
  const { current } = getCredits();
  return current >= required;
}

/**
 * Set user preferences
 * @param preferences - Preferences to set
 */
export function setUserPreferences(preferences: Partial<UserState["preferences"]>): void {
  const state = getUserState();
  state.preferences = {
    ...state.preferences,
    ...preferences,
  };
  setUserState(state);
}

/**
 * Get user preferences
 * @returns User preferences
 */
export function getUserPreferences(): UserState["preferences"] {
  const state = getUserState();
  return state.preferences;
}

/**
 * Get current language
 * @returns Current language setting
 */
export function getLanguage(): Language {
  const prefs = getUserPreferences();
  return prefs.language;
}

/**
 * Clear user state (on logout)
 */
export function clearUserState(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.removeItem("user_state");
    localStorage.removeItem("user_data");
    localStorage.removeItem("auth_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("auth_timestamp");
  } catch (e) {
    console.error("[UserState] Failed to clear user state:", e);
  }
}

/**
 * Initialize user state from user data
 * Called after login/signup
 */
export function initializeUserState(user: User): void {
  const state = getUserState();
  state.user = user;
  state.lastUpdated = new Date().toISOString();
  setUserState(state);
}
