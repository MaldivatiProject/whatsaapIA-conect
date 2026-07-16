"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { securitySettingsService } from "@/features/rules/services/securitySettingsService";
import { ApiError } from "@/shared/lib/api/apiClient";

const SECURITY_SETTINGS_QUERY_KEY = ["security-settings"] as const;

export function useSecuritySettings() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: SECURITY_SETTINGS_QUERY_KEY,
    queryFn: securitySettingsService.get,
  });

  const updateMutation = useMutation({
    mutationFn: (allow: boolean) => securitySettingsService.update(allow),
    onSuccess: (data) => {
      queryClient.setQueryData(SECURITY_SETTINGS_QUERY_KEY, data);
      toast.success(
        data.allow_hardcoded_script_secrets
          ? "Chequeo de credenciales hardcodeadas desactivado"
          : "Chequeo de credenciales hardcodeadas activado",
      );
    },
    onError: (error: ApiError) =>
      toast.error("No se pudo actualizar la configuración", { description: error.message }),
  });

  return {
    allowHardcodedScriptSecrets: query.data?.allow_hardcoded_script_secrets ?? false,
    isLoading: query.isLoading,
    error: query.error as ApiError | null,
    setAllowHardcodedScriptSecrets: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}
