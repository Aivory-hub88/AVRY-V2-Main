/**
 * API Client
 *
 * Makes authenticated requests to the platform's microservices. Each function
 * targets the dedicated service that owns the resource (diagnostics, blueprint,
 * payments, backend) rather than a single monolith. The Supabase access token
 * is attached as a Bearer token.
 */

import { getServiceUrl, ServiceName } from "./services";
import { getToken } from "./auth";

/**
 * API Response interface
 */
export interface ApiResponse<T> {
  data: T;
  meta: {
    timestamp: string;
    version: string;
  };
  errors?: ApiError[];
}

/**
 * API Error interface
 */
export interface ApiError {
  code: string;
  message: string;
  field?: string;
}

/**
 * Paginated API Response interface
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Make an authenticated API request to a specific microservice.
 * @param service - Which microservice owns this endpoint
 * @param path - API endpoint path
 * @param options - Fetch options
 * @returns API response data
 */
export async function apiRequest<T>(
  service: ServiceName,
  path: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const token = typeof window !== "undefined" ? getToken() : null;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options?.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${getServiceUrl(service)}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.errors?.[0]?.message || `API error: ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Get dashboard data for a specific mode (diagnostics service).
 * @param mode - Dashboard mode (free, snapshot, blueprint, operate)
 */
export async function getDashboardData(mode: string) {
  return apiRequest("diagnostics", `/api/v1/diagnostic/${mode}`);
}

/**
 * Get blueprint data by ID (blueprint service).
 * @param id - Blueprint ID
 */
export async function getBlueprintData(id: string) {
  return apiRequest("blueprint", `/api/v1/blueprint/${id}`);
}

/**
 * Get user tier information (backend service).
 */
export async function getUserTier() {
  return apiRequest("backend", "/api/v1/tier");
}

/**
 * Get payment products (payments service).
 */
export async function getPaymentProducts() {
  return apiRequest("payments", "/api/v1/payments/products");
}

/**
 * Create payment transaction (payments service).
 * @param product - Product ID or name
 */
export async function createPaymentTransaction(product: string | number) {
  return apiRequest("payments", "/api/v1/payments/create", {
    method: "POST",
    body: JSON.stringify({ product }),
  });
}

/**
 * Get execution logs for a user (workflows service).
 * @param userId - User ID
 */
export async function getLogs(userId: string) {
  return apiRequest("workflows", `/api/v1/logs?user_id=${userId}`);
}

/**
 * Get error entries for a user (workflows service).
 * @param userId - User ID
 */
export async function getErrors(userId: string) {
  return apiRequest("workflows", `/api/v1/errors?user_id=${userId}`);
}
