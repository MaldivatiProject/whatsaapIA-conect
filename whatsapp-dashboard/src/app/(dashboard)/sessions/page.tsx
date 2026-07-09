"use client";

import { useState } from "react";
import { useSessions } from "@/features/sessions/hooks/useSessions";
import { useSessionsLiveSync } from "@/features/sessions/hooks/useSessionsLiveSync";
import { CreateSessionDialog } from "@/features/sessions/components/CreateSessionDialog";
import { SessionsTable } from "@/features/sessions/components/SessionsTable";
import { QrDialog } from "@/features/sessions/components/QrDialog";
import { Card } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { TablePagination } from "@/shared/components/layout/TablePagination";
import { ErrorState } from "@/shared/components/layout/ErrorState";
import { usePagination } from "@/shared/hooks/usePagination";

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
  const { page, setPage, pageCount, pageItems, totalItems, pageSize } = usePagination(sessions, 10);

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

      {!isLoading && !error && sessions.length === 0 && (
        <SessionsTable sessions={[]} onViewQr={setQrSessionId} onDisconnect={() => {}} onDelete={() => {}} />
      )}

      {!isLoading && !error && sessions.length > 0 && (
        <Card className="gap-0 py-0">
          <SessionsTable
            sessions={pageItems}
            onViewQr={setQrSessionId}
            onDisconnect={(id) => {
              if (confirm(`¿Desconectar la sesión "${id}"? Podrás reconectarla sin volver a escanear el QR.`)) {
                disconnectSession(id);
              }
            }}
            onDelete={(id) => {
              if (confirm(`¿Eliminar la sesión "${id}"? Esta acción no se puede deshacer.`)) {
                deleteSession(id);
              }
            }}
          />
          <TablePagination
            page={page}
            pageCount={pageCount}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </Card>
      )}

      <QrDialog sessionId={qrSessionId} onOpenChange={(open) => !open && setQrSessionId(null)} />
    </div>
  );
}
