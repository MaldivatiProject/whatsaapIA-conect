import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/features/auth/store/authStore";
import { ApiError } from "@/shared/lib/api/apiClient";
import type { ProblemDetails } from "@/shared/types/connector.types";

/**
 * Client for whatsaap-backend's rules API. Reuses the dashboard's single stored
 * apiKey — requires the same tenant:secret pair configured in both
 * whatsapp-connector's and whatsaap-backend's API_KEYS (tenant_id == ownerId).
 */
export const rulesApiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_RULES_API_URL ?? "/rules-api",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

rulesApiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const apiKey = useAuthStore.getState().apiKey;
  if (apiKey && config.headers) {
    config.headers["x-api-key"] = apiKey;
  }
  return config;
});

rulesApiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ProblemDetails>) => {
    const problem = error.response?.data;
    const message = problem?.detail ?? problem?.title ?? error.message ?? "Error desconocido";
    return Promise.reject(new ApiError(message, error.response?.status, problem?.correlationId));
  },
);
