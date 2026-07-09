"use client";

import { useQuery } from "@tanstack/react-query";
import { healthService } from "@/features/health/services/healthService";

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: healthService.getHealth,
    refetchInterval: 15000,
  });
}

export function useMetricsRaw(enabled: boolean) {
  return useQuery({
    queryKey: ["metrics", "raw"],
    queryFn: healthService.getMetricsRaw,
    enabled,
    staleTime: 5000,
  });
}
