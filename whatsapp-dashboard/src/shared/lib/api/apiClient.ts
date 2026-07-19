import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/features/auth/store/authStore";
import { connectorApiOrigin } from "@/shared/lib/api/connectorOrigin";
import type { ProblemDetails } from "@/shared/types/connector.types";

export class ApiError extends Error {
  status?: number;
  correlationId?: string;

  constructor(message: string, status?: number, correlationId?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.correlationId = correlationId;
  }
}

export const apiClient = axios.create({
  baseURL: connectorApiOrigin(),
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const apiKey = useAuthStore.getState().apiKey;
  if (apiKey && config.headers) {
    config.headers["x-api-key"] = apiKey;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ProblemDetails>) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clear();
    }
    const problem = error.response?.data;
    const message = problem?.detail ?? problem?.title ?? error.message ?? "Error desconocido";
    return Promise.reject(new ApiError(message, error.response?.status, problem?.correlationId));
  },
);
