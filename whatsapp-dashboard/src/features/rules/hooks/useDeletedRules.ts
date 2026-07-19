"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { rulesService } from "@/features/rules/services/rulesService";
import { ApiError } from "@/shared/lib/api/apiClient";

const DELETED_RULES_QUERY_KEY = ["rules", "deleted"] as const;
const RULES_QUERY_KEY = ["rules"] as const;

export function useDeletedRules() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: DELETED_RULES_QUERY_KEY, queryFn: rulesService.listDeleted });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => rulesService.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DELETED_RULES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: RULES_QUERY_KEY });
      toast.success("Regla restaurada", {
        description: "Quedó inactiva: actívala desde la pestaña Activas si corresponde.",
      });
    },
    onError: (error: ApiError) =>
      toast.error("No se pudo restaurar la regla", { description: error.message }),
  });

  return {
    deletedRules: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as ApiError | null,
    restoreRule: restoreMutation.mutate,
    isRestoring: restoreMutation.isPending,
  };
}
