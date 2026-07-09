"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { contactIdentitiesService } from "@/features/contact-identities/services/contactIdentitiesService";
import { ApiError } from "@/shared/lib/api/apiClient";
import type {
  ContactIdentityInput,
  ContactIdentityUpdateInput,
} from "@/features/contact-identities/types/contactIdentity.types";

const CONTACT_IDENTITIES_QUERY_KEY = ["contact-identities"] as const;

export function useContactIdentities() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: CONTACT_IDENTITIES_QUERY_KEY,
    queryFn: contactIdentitiesService.list,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: CONTACT_IDENTITIES_QUERY_KEY });

  const createMutation = useMutation({
    mutationFn: (input: ContactIdentityInput) => contactIdentitiesService.create(input),
    onSuccess: () => {
      invalidate();
      toast.success("Identidad guardada");
    },
    onError: (error: ApiError) =>
      toast.error("No se pudo guardar la identidad", { description: error.message }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ContactIdentityUpdateInput }) =>
      contactIdentitiesService.update(id, input),
    onSuccess: (_data, variables) => {
      invalidate();
      if (variables.input.enabled === undefined) toast.success("Identidad actualizada");
    },
    onError: (error: ApiError) =>
      toast.error("No se pudo actualizar la identidad", { description: error.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => contactIdentitiesService.remove(id),
    onSuccess: () => {
      invalidate();
      toast.success("Identidad eliminada");
    },
    onError: (error: ApiError) =>
      toast.error("No se pudo eliminar", { description: error.message }),
  });

  return {
    identities: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as ApiError | null,
    createIdentity: createMutation.mutate,
    isCreating: createMutation.isPending,
    updateIdentity: (id: string, input: ContactIdentityUpdateInput) =>
      updateMutation.mutate({ id, input }),
    isUpdating: updateMutation.isPending,
    toggleEnabled: (id: string, enabled: boolean) =>
      updateMutation.mutate({ id, input: { enabled } }),
    deleteIdentity: deleteMutation.mutate,
  };
}

