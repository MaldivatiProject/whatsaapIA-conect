"use client";

import { ShieldAlert, ShieldCheck } from "lucide-react";
import { useSecuritySettings } from "@/features/rules/hooks/useSecuritySettings";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";

/** Toggle for the platform-wide (not per-tenant) guard that blocks saving a
 * RUN_SCRIPT rule whose script contains a hardcoded-looking credential.
 * Disabling it is a deliberate, temporary exception (e.g. to edit a legacy
 * script pending migration to secrets), not a normal operating mode — the
 * UI leans on that with destructive styling when it's off. */
export function SecuritySettingsCard() {
  const { allowHardcodedScriptSecrets, isLoading, isUpdating, setAllowHardcodedScriptSecrets } =
    useSecuritySettings();

  if (isLoading) return null;

  const isProtected = !allowHardcodedScriptSecrets;

  return (
    <Card className={isProtected ? undefined : "ring-destructive/30"}>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          {isProtected ? (
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
          ) : (
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive-text" aria-hidden="true" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Chequeo de credenciales hardcodeadas</span>
              <Badge variant={isProtected ? "success" : "destructive"}>
                {isProtected ? "Activo" : "Desactivado"}
              </Badge>
            </div>
            <p className="max-w-2xl text-xs text-muted-foreground">
              Cuando está activo, no se puede crear ni editar una regla cuyo script contenga una
              credencial en texto plano (contraseña, API key, token). Aplica a toda la plataforma,
              no solo a una regla. Desactivarlo es una excepción temporal — por ejemplo, para
              editar un script existente mientras migrás su credencial a un secreto guardado.
            </p>
          </div>
        </div>
        <Button
          variant={isProtected ? "outline" : "destructive"}
          size="sm"
          disabled={isUpdating}
          onClick={() => setAllowHardcodedScriptSecrets(!allowHardcodedScriptSecrets)}
        >
          {isProtected ? "Desactivar" : "Reactivar protección"}
        </Button>
      </CardContent>
    </Card>
  );
}
