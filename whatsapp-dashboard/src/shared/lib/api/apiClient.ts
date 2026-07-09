import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/features/auth/store/authStore";
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
  baseURL: process.env.NEXT_PUBLIC_CONNECTOR_API_URL ?? "http://localhost:3000",
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
