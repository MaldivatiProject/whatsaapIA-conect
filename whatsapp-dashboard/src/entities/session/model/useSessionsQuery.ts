"use client";

import { useQuery } from "@tanstack/react-query";
import { sessionsApi } from "@/entities/session/api/sessionsApi";

export const SESSIONS_QUERY_KEY = ["sessions"] as const;

/** Read-only sessions list, shared by any feature that needs to know what sessions exist. */
export function useSessionsQuery() {
  return useQuery({
    queryKey: SESSIONS_QUERY_KEY,
    queryFn: sessionsApi.list,
    refetchInterval: 15000,
  });
}
