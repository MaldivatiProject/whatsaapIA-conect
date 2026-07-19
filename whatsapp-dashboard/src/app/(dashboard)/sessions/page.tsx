"use client";

import { useState } from "react";
import { useSessions } from "@/features/sessions/hooks/useSessions";
import { useSessionsLiveSync } from "@/features/sessions/hooks/useSessionsLiveSync";
import { CreateSessionDialog } from "@/features/sessions/components/CreateSessionDialog";
import { SessionsTable } from "@/features/sessions/components/SessionsTable";
import { QrDialog } from "@/features/sessions/components/QrDialog";
import { Card } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ErrorState } from "@/shared/components/layout/ErrorState";
import { ConfirmDialog } from "@/shared/components/layout/ConfirmDialog";
import { useConfirmDialog } from "@/shared/hooks/useConfirmDialog";

export default function SessionsPage() {
  useSessionsLiveSync();
  const {
    sessions,
    isLoading,
    error,
    createSession,
    isCreating,
    disconnectSession,
    deleteSession,
  } = useSessions();
  const [qrSessionId, setQrSessionId] = useState<string | null>(null);
  const { confirm, confirmDialogProps } = useConfirmDialog();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Sesiones</h1>
          <p className="text-sm text-muted-foreground">
            Crear, vincular y administrar sesiones de WhatsApp.
          </p>
        </div>
        <CreateSessionDialog onCreate={createSession} isCreating={isCreating} />
      </div>

      {isLoading && <Skeleton className="h-64 w-full" />}

      {error && <ErrorState message={`No se pudieron cargar las sesiones: ${error.message}`} />}

      {!isLoading && !error && (
        <Card className="gap-0 py-0">
          <SessionsTable
            sessions={sessions}
            onViewQr={setQrSessionId}
            onDisconnect={async (id) => {
              const confirmed = await confirm({
                title: `Desconectar la sesión "${id}"`,
                description: "Podrás reconectarla sin volver a escanear el QR.",
                confirmLabel: "Desconectar",
                variant: "destructive",
              });
              if (confirmed) disconnectSession(id);
            }}
            onDelete={async (id) => {
              const confirmed = await confirm({
                title: `Eliminar la sesión "${id}"`,
                description: "Esta acción no se puede deshacer.",
                confirmLabel: "Eliminar",
                variant: "destructive",
              });
              if (confirmed) deleteSession(id);
            }}
          />
        </Card>
      )}

      <QrDialog sessionId={qrSessionId} onOpenChange={(open) => !open && setQrSessionId(null)} />
      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}
