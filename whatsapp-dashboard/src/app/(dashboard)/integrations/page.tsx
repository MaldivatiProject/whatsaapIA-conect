"use client";

import { GoogleDriveSettingsForm } from "@/features/integrations/components/GoogleDriveSettingsForm";
import { useDriveIntegration } from "@/features/integrations/hooks/useDriveIntegration";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ErrorState } from "@/shared/components/layout/ErrorState";

export default function IntegrationsPage() {
  const {
    config,
    isLoading,
    error,
    saveConfig,
    isSavingConfig,
    saveCredentials,
    isSavingCredentials,
    deleteConfig,
    isDeleting,
    testConnection,
    isTesting,
    testResult,
  } = useDriveIntegration();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Integraciones</h1>
        <p className="text-sm text-muted-foreground">
          Conectá fuentes de datos externas que el backend puede consultar.
        </p>
      </div>

      {isLoading && <Skeleton className="h-96 w-full" />}

      {error && (
        <ErrorState
          message={`No se pudo cargar la integración: ${error.message}`}
        />
      )}

      {!isLoading && !error && (
        <GoogleDriveSettingsForm
          config={config}
          isLoading={isLoading}
          isSavingConfig={isSavingConfig}
          isSavingCredentials={isSavingCredentials}
          isDeleting={isDeleting}
          isTesting={isTesting}
          testResult={testResult}
          onSaveConfig={saveConfig}
          onSaveCredentials={saveCredentials}
          onDelete={() => {
            if (confirm("¿Desactivar la integración con Google Drive?")) {
              deleteConfig();
            }
          }}
          onTestConnection={() => testConnection()}
        />
      )}
    </div>
  );
}
