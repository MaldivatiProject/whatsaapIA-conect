"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { rulesService } from "@/features/rules/services/rulesService";
import { ApiError } from "@/shared/lib/api/apiClient";
import type { CreateRuleInput, UpdateRuleInput } from "@/features/rules/types/rule.types";

const RULES_QUERY_KEY = ["rules"] as const;

export function useRules() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: RULES_QUERY_KEY, queryFn: rulesService.list });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: RULES_QUERY_KEY });

  const createMutation = useMutation({
    mutationFn: (input: CreateRuleInput) => rulesService.create(input),
    onSuccess: () => {
      invalidate();
      toast.success("Regla creada");
    },
    onError: (error: ApiError) => toast.error("No se pudo crear la regla", { description: error.message }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateRuleInput }) => rulesService.update(id, input),
    onSuccess: (_data, variables) => {
      invalidate();
      if (variables.input.enabled === undefined) toast.success("Regla actualizada");
    },
    onError: (error: ApiError) =>
      toast.error("No se pudo actualizar la regla", { description: error.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => rulesService.remove(id),
    onSuccess: () => {
      invalidate();
      toast.success("Regla eliminada");
    },
    onError: (error: ApiError) => toast.error("No se pudo eliminar", { description: error.message }),
  });

  return {
    rules: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as ApiError | null,
    createRule: createMutation.mutate,
    isCreating: createMutation.isPending,
    toggleEnabled: (id: string, enabled: boolean) => updateMutation.mutate({ id, input: { enabled } }),
    updateRule: (id: string, input: UpdateRuleInput) => updateMutation.mutate({ id, input }),
    isUpdating: updateMutation.isPending,
    deleteRule: deleteMutation.mutate,
  };
}
