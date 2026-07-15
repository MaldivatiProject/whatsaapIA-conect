"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { driveIntegrationService } from "@/features/integrations/services/driveIntegrationService";
import { ApiError } from "@/shared/lib/api/apiClient";
import type {
  DriveConnectionTestResult,
  DriveIntegrationConfigInput,
} from "@/features/integrations/types/driveIntegration.types";

const DRIVE_INTEGRATION_QUERY_KEY = ["integrations", "google-drive"] as const;

export function useDriveIntegration() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: DRIVE_INTEGRATION_QUERY_KEY,
    queryFn: driveIntegrationService.getConfig,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: DRIVE_INTEGRATION_QUERY_KEY });

  const saveConfigMutation = useMutation({
    mutationFn: (input: DriveIntegrationConfigInput) =>
      driveIntegrationService.saveConfig(input),
    onSuccess: () => {
      invalidate();
      toast.success("Configuración de Google Drive guardada");
    },
    onError: (error: ApiError) =>
      toast.error("No se pudo guardar la configuración", {
        description: error.message,
      }),
  });

  const saveCredentialsMutation = useMutation({
    mutationFn: ({
      secretName,
      serviceAccountJson,
    }: {
      secretName: string;
      serviceAccountJson: string;
    }) =>
      driveIntegrationService.saveCredentials(secretName, serviceAccountJson),
    onSuccess: () => {
      invalidate();
      toast.success("Credenciales guardadas de forma cifrada");
    },
    onError: (error: ApiError) =>
      toast.error("No se pudieron guardar las credenciales", {
        description: error.message,
      }),
  });

  const deleteConfigMutation = useMutation({
    mutationFn: () => driveIntegrationService.deleteConfig(),
    onSuccess: () => {
      invalidate();
      toast.success("Integración desactivada");
    },
    onError: (error: ApiError) =>
      toast.error("No se pudo desactivar", { description: error.message }),
  });

  const testConnectionMutation = useMutation({
    mutationFn: () => driveIntegrationService.testConnection(),
    onSuccess: (result: DriveConnectionTestResult) => {
      if (result.ok) {
        toast.success(`Conexión OK: ${result.name ?? "archivo"}`);
      } else {
        toast.error("La prueba de conexión falló", {
          description: result.error ?? undefined,
        });
      }
    },
    onError: (error: ApiError) =>
      toast.error("No se pudo probar la conexión", {
        description: error.message,
      }),
  });

  return {
    config: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error as ApiError | null,
    saveConfig: saveConfigMutation.mutate,
    isSavingConfig: saveConfigMutation.isPending,
    saveCredentials: saveCredentialsMutation.mutate,
    isSavingCredentials: saveCredentialsMutation.isPending,
    deleteConfig: deleteConfigMutation.mutate,
    isDeleting: deleteConfigMutation.isPending,
    testConnection: testConnectionMutation.mutate,
    isTesting: testConnectionMutation.isPending,
    testResult: testConnectionMutation.data ?? null,
  };
}
