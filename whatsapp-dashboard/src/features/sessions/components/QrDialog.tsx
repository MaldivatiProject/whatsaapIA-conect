"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useSessionQr } from "@/features/sessions/hooks/useSessionQr";

interface QrDialogProps {
  sessionId: string | null;
  onOpenChange: (open: boolean) => void;
}

function useCountdown(expiresAt: string | null) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!expiresAt) return;
    const target = new Date(expiresAt).getTime();
    const tick = () => setSecondsLeft(Math.max(0, Math.round((target - Date.now()) / 1000)));
    const interval = setInterval(tick, 1000);
    tick();
    return () => clearInterval(interval);
  }, [expiresAt]);

  return expiresAt ? secondsLeft : null;
}

export function QrDialog({ sessionId, onOpenChange }: QrDialogProps) {
  const { dataUrl, expiresAt, isLoading, error } = useSessionQr(sessionId);
  const secondsLeft = useCountdown(expiresAt);

  return (
    <Dialog open={Boolean(sessionId)} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col items-center gap-4">
        <DialogHeader className="w-full">
          <DialogTitle>Vincular {sessionId}</DialogTitle>
          <DialogDescription>
            Escaneá este código desde WhatsApp → Dispositivos vinculados → Vincular un
            dispositivo.
          </DialogDescription>
        </DialogHeader>

        {isLoading && !dataUrl && <Skeleton className="h-80 w-80" />}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            No se pudo obtener el QR todavía. Se reintenta automáticamente.
          </p>
        )}

        {dataUrl && (
          <Image
            src={dataUrl}
            alt={`Código QR para vincular la sesión ${sessionId}`}
            width={320}
            height={320}
            unoptimized
            className="rounded-md border"
          />
        )}

        {secondsLeft !== null && (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {secondsLeft > 0
              ? `Expira en ${secondsLeft}s`
              : "Expirado, generando uno nuevo…"}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
