"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/components/ui/dialog";
import { Badge } from "@/shared/components/ui/badge";
import type { BusinessMessage } from "@/features/business-messages/types/businessMessage.types";

function formatFecha(iso: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(iso));
}

interface BusinessMessageDetailDialogProps {
  message: BusinessMessage | null;
  onOpenChange: (open: boolean) => void;
}

export function BusinessMessageDetailDialog({
  message,
  onOpenChange,
}: BusinessMessageDetailDialogProps) {
  return (
    <Dialog open={message !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalle del mensaje de negocio</DialogTitle>
          <DialogDescription>
            Todos los campos que devolvió la regla, sin recortar.
          </DialogDescription>
        </DialogHeader>

        {message && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <p className="text-xs text-muted-foreground">Categoría</p>
                <Badge variant="outline">{message.business_category}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Origen</p>
                <p>{message.source_origin}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Remitente</p>
                <p className="font-mono text-xs">{message.sender ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sesión</p>
                <p className="font-mono text-xs">{message.session_id ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Recibido</p>
                <p>{formatFecha(message.received_at)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Regla</p>
                <p className="font-mono text-xs break-all">{message.created_by ?? "—"}</p>
              </div>
            </div>

            <div>
              <p className="mb-1 text-xs text-muted-foreground">Datos devueltos por el script</p>
              <dl className="divide-y rounded-md border">
                {Object.entries(message.metadata).map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-4 px-3 py-2">
                    <dt className="shrink-0 font-mono text-xs text-muted-foreground">{key}</dt>
                    <dd className="text-right break-words">{String(value)}</dd>
                  </div>
                ))}
                {Object.keys(message.metadata).length === 0 && (
                  <p className="px-3 py-2 text-muted-foreground">Sin datos.</p>
                )}
              </dl>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
