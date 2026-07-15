"use client";

import { useQuery } from "@tanstack/react-query";
import { overviewService } from "@/features/overview/services/overviewService";
import type { OverviewFilters } from "@/features/overview/types/overview.types";
import { ApiError } from "@/shared/lib/api/apiClient";

export function useOverview(filters: OverviewFilters) {
  const query = useQuery({
    queryKey: ["overview", filters],
    queryFn: () => overviewService.get(filters),
    refetchInterval: 60_000,
  });

  return {
    overview: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error as ApiError | null,
    refetch: query.refetch,
  };
}
