import { rulesApiClient } from "@/shared/lib/api/rulesApiClient";
import type {
  ReportCategory,
  ReportDelivery,
  ReportFilters,
  ReportMessage,
  ReportRule,
  ReportsPayload,
  ReportSummary,
} from "@/features/reports/types/report.types";

function params(filters: ReportFilters = {}) {
  return {
    ...(filters.from ? { from: filters.from } : {}),
    ...(filters.to ? { to: filters.to } : {}),
    ...(filters.sessionId ? { session_id: filters.sessionId } : {}),
    ...(filters.limit ? { limit: filters.limit } : {}),
  };
}

export const reportsService = {
  async summary(filters?: ReportFilters): Promise<ReportSummary> {
    const { data } = await rulesApiClient.get<ReportSummary>("/api/v1/reports/summary", {
      params: params(filters),
    });
    return data;
  },

  async messages(filters?: ReportFilters): Promise<ReportMessage[]> {
    const { data } = await rulesApiClient.get<ReportMessage[]>("/api/v1/reports/messages", {
      params: params(filters),
    });
    return data;
  },

  async categories(filters?: ReportFilters): Promise<ReportCategory[]> {
    const { data } = await rulesApiClient.get<ReportCategory[]>("/api/v1/reports/categories", {
      params: params(filters),
    });
    return data;
  },

  async rules(filters?: ReportFilters): Promise<ReportRule[]> {
    const { data } = await rulesApiClient.get<ReportRule[]>("/api/v1/reports/rules", {
      params: params(filters),
    });
    return data;
  },

  async deliveries(filters?: ReportFilters): Promise<ReportDelivery[]> {
    const { data } = await rulesApiClient.get<ReportDelivery[]>("/api/v1/reports/deliveries", {
      params: params(filters),
    });
    return data;
  },

  async all(filters?: ReportFilters): Promise<ReportsPayload> {
    const [summary, messages, categories, rules, deliveries] = await Promise.all([
      this.summary(filters),
      this.messages({ ...filters, limit: filters?.limit ?? 50 }),
      this.categories(filters),
      this.rules(filters),
      this.deliveries(filters),
    ]);
    return { summary, messages, categories, rules, deliveries };
  },
};

