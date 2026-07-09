import { apiClient } from "@/shared/lib/api/apiClient";
import type { HealthResponse } from "@/shared/types/connector.types";

export const healthService = {
  async getHealth(): Promise<HealthResponse> {
    const { data } = await apiClient.get<HealthResponse>("/health");
    return data;
  },

  /** Prometheus text exposition format — kept as raw text, not parsed. */
  async getMetricsRaw(): Promise<string> {
    const { data } = await apiClient.get<string>("/metrics", {
      responseType: "text",
      transformResponse: (raw) => raw,
    });
    return data;
  },
};
