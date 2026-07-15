"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, XCircle } from "lucide-react";
import { z } from "zod";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { cn } from "@/shared/lib/utils/cn";
import type {
  DriveConnectionTestResult,
  DriveIntegrationConfig,
  DriveIntegrationFormValues,
} from "@/features/integrations/types/driveIntegration.types";

const formSchema = z.object({
  fileId: z
    .string()
    .min(10, "El File ID de Drive suele tener 20+ caracteres")
    .max(128),
  credentialsSecretName: z
    .string()
    .regex(/^[A-Z][A-Z0-9_]{1,127}$/, "Debe ser MAYUSCULAS_CON_GUION_BAJO"),
  enabled: z.boolean(),
  cacheTtlSeconds: z.number().int().min(30).max(3600),
  serviceAccountJson: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

const EMPTY_VALUES: DriveIntegrationFormValues = {
  fileId: "",
  credentialsSecretName: "GOOGLE_DRIVE_SERVICE_ACCOUNT",
  enabled: true,
  cacheTtlSeconds: 300,
  serviceAccountJson: "",
};

function toFormValues(
  config: DriveIntegrationConfig | null,
): DriveIntegrationFormValues {
  if (!config) return EMPTY_VALUES;
  return {
    fileId: config.file_id,
    credentialsSecretName: config.credentials_secret_name,
    enabled: config.enabled,
    cacheTtlSeconds: config.cache_ttl_seconds,
    serviceAccountJson: "",
  };
}

export function GoogleDriveSettingsForm({
  config,
  isLoading,
  isSavingConfig,
  isSavingCredentials,
  isDeleting,
  isTesting,
  testResult,
  onSaveConfig,
  onSaveCredentials,
  onDelete,
  onTestConnection,
}: {
  config: DriveIntegrationConfig | null;
  isLoading: boolean;
  isSavingConfig: boolean;
  isSavingCredentials: boolean;
  isDeleting: boolean;
  isTesting: boolean;
  testResult: DriveConnectionTestResult | null;
  onSaveConfig: (input: {
    file_id: string;
    credentials_secret_name: string;
    enabled: boolean;
    cache_ttl_seconds: number;
  }) => void;
  onSaveCredentials: (input: {
    secretName: string;
    serviceAccountJson: string;
  }) => void;
  onDelete: () => void;
  onTestConnection: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    values: toFormValues(config),
  });

  function submit(values: FormValues) {
    onSaveConfig({
      file_id: values.fileId.trim(),
      credentials_secret_name: values.credentialsSecretName.trim(),
      enabled: values.enabled,
      cache_ttl_seconds: values.cacheTtlSeconds,
    });
    if (values.serviceAccountJson.trim()) {
      onSaveCredentials({
        secretName: values.credentialsSecretName.trim(),
        serviceAccountJson: values.serviceAccountJson.trim(),
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Google Drive</CardTitle>
        <CardDescription>
          Permite que el backend lea el contenido de un único archivo de Drive
          (por ejemplo, una lista de precios o FAQ) usando una cuenta de
          servicio — sin costo dentro de la cuota gratuita de la API de Drive.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(submit)} noValidate>
        <CardContent className="space-y-4">
          {config && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Credenciales:</span>
              {config.has_credentials ? (
                <Badge variant="success">Configuradas</Badge>
              ) : (
                <Badge variant="destructive">Faltan</Badge>
              )}
              <span className="text-muted-foreground">Estado:</span>
              <Badge variant={config.enabled ? "success" : "secondary"}>
                {config.enabled ? "Activa" : "Inactiva"}
              </Badge>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="drive-file-id">Drive File ID</Label>
            <Input
              id="drive-file-id"
              placeholder="1AbCdEfGhIjKlMnOpQrStUvWxYz"
              {...register("fileId")}
            />
            <p className="text-xs text-muted-foreground">
              Se toma de la URL para compartir el archivo:{" "}
              <code>https://drive.google.com/file/d/&lt;FILE_ID&gt;/view</code>
            </p>
            {errors.fileId && (
              <p role="alert" className="text-sm text-destructive">
                {errors.fileId.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="drive-service-account">
              Credenciales de la cuenta de servicio (JSON)
            </Label>
            <textarea
              id="drive-service-account"
              rows={5}
              placeholder={
                config?.has_credentials
                  ? "Ya configuradas — dejá vacío para no cambiarlas, o pegá un JSON nuevo para rotarlas"
                  : '{"type": "service_account", "client_email": "...", ...}'
              }
              className={cn(
                "w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 font-mono text-xs transition-colors outline-none placeholder:font-sans placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30",
              )}
              {...register("serviceAccountJson")}
            />
            <p className="text-xs text-muted-foreground">
              Se guarda cifrado en la base de datos y nunca se vuelve a mostrar.
              Compartí el archivo de Drive con el <code>client_email</code> de
              esta cuenta de servicio (solo lectura).
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="drive-secret-name">Nombre de la credencial</Label>
              <Input
                id="drive-secret-name"
                {...register("credentialsSecretName")}
              />
              {errors.credentialsSecretName && (
                <p role="alert" className="text-sm text-destructive">
                  {errors.credentialsSecretName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="drive-cache-ttl">Caché (segundos)</Label>
              <Input
                id="drive-cache-ttl"
                type="number"
                min={30}
                max={3600}
                {...register("cacheTtlSeconds", { valueAsNumber: true })}
              />
              {errors.cacheTtlSeconds && (
                <p role="alert" className="text-sm text-destructive">
                  {errors.cacheTtlSeconds.message}
                </p>
              )}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("enabled")} />
            Integración activa
          </label>

          {testResult && (
            <div
              className={cn(
                "flex items-start gap-2 rounded-md border p-3 text-sm",
                testResult.ok
                  ? "border-success/30 bg-success/10 text-success-foreground"
                  : "border-destructive/30 bg-destructive/10 text-destructive-text",
              )}
            >
              {testResult.ok ? (
                <CheckCircle2
                  className="mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
              ) : (
                <XCircle
                  className="mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
              )}
              <div className="space-y-1">
                {testResult.ok ? (
                  <>
                    <p className="font-medium">
                      Conexión exitosa: {testResult.name}
                    </p>
                    {testResult.preview && (
                      <p className="text-xs text-muted-foreground">
                        Vista previa: “{testResult.preview.slice(0, 140)}
                        {testResult.preview.length > 140 ? "…" : ""}”
                      </p>
                    )}
                  </>
                ) : (
                  <p>{testResult.error}</p>
                )}
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-wrap items-center justify-between gap-2 pt-4">
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={isLoading || isSavingConfig || isSavingCredentials}
            >
              {isSavingConfig || isSavingCredentials ? "Guardando…" : "Guardar"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!config || isTesting}
              onClick={onTestConnection}
            >
              {isTesting ? "Probando…" : "Probar conexión"}
            </Button>
          </div>
          {config && (
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={onDelete}
            >
              {isDeleting ? "Desactivando…" : "Desactivar integración"}
            </Button>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
