"use client";

import { useQuery } from "@tanstack/react-query";
import { businessMessagesService } from "@/features/business-messages/services/businessMessagesService";
import type { BusinessMessageFilters } from "@/features/business-messages/types/businessMessage.types";
import { ApiError } from "@/shared/lib/api/apiClient";

export function useBusinessMessages(filters: BusinessMessageFilters = {}) {
  const query = useQuery({
    queryKey: ["business-messages", filters],
    queryFn: () => businessMessagesService.list(filters),
  });

  return {
    messages: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error as ApiError | null,
    refetch: query.refetch,
  };
}
