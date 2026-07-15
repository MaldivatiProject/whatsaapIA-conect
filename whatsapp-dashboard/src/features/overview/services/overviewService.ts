import { rulesApiClient } from "@/shared/lib/api/rulesApiClient";
import type {
  OverviewFilters,
  OverviewPayload,
} from "@/features/overview/types/overview.types";

function params(filters: OverviewFilters = {}) {
  return {
    ...(filters.from ? { from: filters.from } : {}),
    ...(filters.to ? { to: filters.to } : {}),
    ...(filters.sessionId ? { session_id: filters.sessionId } : {}),
    ...(filters.bucket ? { bucket: filters.bucket } : {}),
    ...(filters.limit ? { limit: filters.limit } : {}),
  };
}

export const overviewService = {
  async get(filters?: OverviewFilters): Promise<OverviewPayload> {
    const { data } = await rulesApiClient.get<OverviewPayload>("/api/v1/overview", {
      params: params(filters),
    });
    return data;
  },
};
