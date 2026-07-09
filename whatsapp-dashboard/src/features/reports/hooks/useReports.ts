"use client";

import { useQuery } from "@tanstack/react-query";
import { reportsService } from "@/features/reports/services/reportsService";
import type { ReportFilters } from "@/features/reports/types/report.types";
import { ApiError } from "@/shared/lib/api/apiClient";

export function useReports(filters: ReportFilters) {
  const query = useQuery({
    queryKey: ["reports", filters],
    queryFn: () => reportsService.all(filters),
  });

  return {
    reports: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error as ApiError | null,
    refetch: query.refetch,
  };
}

