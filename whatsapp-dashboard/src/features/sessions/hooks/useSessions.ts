"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { sessionsApi } from "@/entities/session/api/sessionsApi";
import { SESSIONS_QUERY_KEY, useSessionsQuery } from "@/entities/session/model/useSessionsQuery";
import { ApiError } from "@/shared/lib/api/apiClient";

export function useSessions() {
  const queryClient = useQueryClient();
  const query = useSessionsQuery();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });

  const createMutation = useMutation({
    mutationFn: (sessionId: string) => sessionsApi.create(sessionId),
    onSuccess: () => {
      invalidate();
      toast.success("Sesión creada. Esperá unos segundos por el QR.");
    },
    onError: (error: ApiError) => toast.error("No se pudo crear la sesión", { description: error.message }),
  });

  const disconnectMutation = useMutation({
    mutationFn: (sessionId: string) => sessionsApi.disconnect(sessionId),
    onSuccess: () => {
      invalidate();
      toast.success("Sesión desconectada");
    },
    onError: (error: ApiError) => toast.error("No se pudo desconectar", { description: error.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (sessionId: string) => sessionsApi.remove(sessionId),
    onSuccess: () => {
      invalidate();
      toast.success("Sesión eliminada");
    },
    onError: (error: ApiError) => toast.error("No se pudo eliminar", { description: error.message }),
  });

  return {
    sessions: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as ApiError | null,
    refetch: query.refetch,
    createSession: createMutation.mutate,
    isCreating: createMutation.isPending,
    disconnectSession: disconnectMutation.mutate,
    isDisconnecting: disconnectMutation.isPending,
    deleteSession: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    invalidate,
  };
}
