/**
 * Careers API Integration
 * Handles all API calls for the careers/vacancies system
 */

import { resolveFetchBase } from "./services";

/**
 * Base URL for the careers service, or null when this environment cannot
 * reach it — see `resolveFetchBase`. Resolved per call rather than once at
 * module load, because the same module is evaluated on both the server and
 * the client and the answer differs.
 */
function careersBase(): string | null {
  return resolveFetchBase("careers");
}

/**
 * Vacancy interface matching the avry-careers service response
 */
export interface Vacancy {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  employment_type: string | null;
  description: unknown; // Rich editor JSONB output
  requirements: unknown | null; // Rich editor JSONB output
  brief_description?: string;
  status: "draft" | "open" | "closed";
  posted_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch all open vacancies from the careers service
 * @returns Promise resolving to array of open vacancies
 */
export async function getVacancies(): Promise<Vacancy[]> {
  const base = careersBase();
  // No usable base means a build-time prerender, where the careers container
  // is not on the network at all. Serve the empty list the caller already
  // falls back to; ISR fills the page in on the first revalidation.
  if (!base) return [];

  try {
    // Short timeout so an unreachable internal service URL (e.g. a container
    // that is up but not yet accepting connections) fails fast instead of
    // hanging the caller — this function already degrades to [] below.
    const response = await fetch(`${base}/api/vacancies`, {
      headers: {
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch vacancies: ${response.status}`);
    }

    const vacancies: Vacancy[] = await response.json();
    return vacancies;
  } catch (error) {
    console.error("[CareersAPI] Fetch vacancies failed:", error);
    return [];
  }
}

/**
 * Fetch a single vacancy by ID
 * @param vacancyId - The vacancy UUID
 * @returns Promise resolving to vacancy detail or null
 */
export async function getVacancy(vacancyId: string): Promise<Vacancy | null> {
  const base = careersBase();
  if (!base) return null;

  try {
    const response = await fetch(`${base}/api/vacancies/${vacancyId}`, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to fetch vacancy: ${response.status}`);
    }

    const vacancy: Vacancy = await response.json();
    return vacancy;
  } catch (error) {
    console.error("[CareersAPI] Fetch vacancy failed:", error);
    return null;
  }
}

/**
 * Screening question as returned by the form schema endpoint
 */
export interface ScreeningQuestion {
  question: string;
  required: boolean;
  type: "text" | "textarea" | "select";
  options?: string[];
}

/**
 * Application form schema returned by the form endpoint
 */
export interface ApplicationFormSchema {
  vacancy_id: string;
  fields: {
    full_name: { required: boolean; label: string };
    email: { required: boolean; label: string };
    phone: { required: boolean; label: string };
    cover_letter: { required: boolean; label: string };
    github_url: { required: boolean; label: string };
    linkedin_url: { required: boolean; label: string };
    cv: { required: boolean; label: string; max_size_mb: number; accepted_formats: string[] };
  };
  screening_questions: ScreeningQuestion[];
}

/**
 * Fetch the application form schema for a vacancy (includes custom screening questions)
 * @param vacancyId - The vacancy UUID
 * @returns Promise resolving to the form schema or null on error
 */
export async function getApplicationFormSchema(
  vacancyId: string
): Promise<ApplicationFormSchema | null> {
  const base = careersBase();
  if (!base) return null;

  try {
    const response = await fetch(
      `${base}/api/vacancies/${vacancyId}/form`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to fetch form schema: ${response.status}`);
    }

    const schema: ApplicationFormSchema = await response.json();
    return schema;
  } catch (error) {
    console.error("[CareersAPI] Fetch form schema failed:", error);
    return null;
  }
}

/**
 * Error response from the application submission endpoint
 */
export interface ApplicationSubmitError {
  detail: string;
}

/**
 * Submit a job application via multipart form data
 * @param vacancyId - The vacancy UUID to apply to
 * @param formData - FormData containing all application fields and the CV file
 * @returns Object with success flag and optional error message
 */
export async function submitApplication(
  vacancyId: string,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const base = careersBase();
  if (!base) {
    return { success: false, error: "Applications are unavailable right now. Please try again shortly." };
  }

  try {
    const response = await fetch(
      `${base}/api/vacancies/${vacancyId}/apply`,
      {
        method: "POST",
        body: formData,
        // Do NOT set Content-Type header — browser sets it with multipart boundary
      }
    );

    if (response.status === 201) {
      return { success: true };
    }

    // Handle specific error responses
    const body: ApplicationSubmitError = await response.json().catch(() => ({
      detail: "An unexpected error occurred",
    }));

    if (response.status === 413) {
      return { success: false, error: body.detail || "File size exceeds 10 MB limit" };
    }

    if (response.status === 422) {
      return { success: false, error: body.detail || "Please check your form and try again" };
    }

    if (response.status === 404) {
      return { success: false, error: "This vacancy is no longer available" };
    }

    return { success: false, error: body.detail || `Submission failed (${response.status})` };
  } catch (error) {
    console.error("[CareersAPI] Submit application failed:", error);
    return { success: false, error: "Network error. Please check your connection and try again." };
  }
}
