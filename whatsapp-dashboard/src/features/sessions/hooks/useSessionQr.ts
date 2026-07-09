"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import QRCode from "qrcode";
import { sessionsApi } from "@/entities/session/api/sessionsApi";
import { useConnectorEvent } from "@/shared/hooks/useConnectorEvent";

function qrQueryKey(sessionId: string) {
  return ["sessions", sessionId, "qr"] as const;
}

export function useSessionQr(sessionId: string | null) {
  const queryClient = useQueryClient();
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  const query = useQuery({
    queryKey: sessionId ? qrQueryKey(sessionId) : ["sessions", "qr", "disabled"],
    queryFn: () => sessionsApi.getQr(sessionId!),
    enabled: Boolean(sessionId),
    retry: 2,
    refetchInterval: (q) => {
      const expiresAt = q.state.data?.expiresAt;
      if (!expiresAt) return 5000;
      // Re-poll shortly after expiry in case QR_GENERATED event was missed.
      const msLeft = new Date(expiresAt).getTime() - Date.now();
      return msLeft > 0 ? Math.min(msLeft + 1000, 15000) : 3000;
    },
  });

  useConnectorEvent("QR_GENERATED", (event) => {
    if (event.sessionId === sessionId) {
      queryClient.invalidateQueries({ queryKey: qrQueryKey(sessionId) });
    }
  });

  useEffect(() => {
    if (!query.data?.qrCode) return;
    let cancelled = false;
    QRCode.toDataURL(query.data.qrCode, { margin: 1, width: 320 }).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [query.data?.qrCode]);

  return {
    dataUrl: query.data?.qrCode ? dataUrl : null,
    expiresAt: query.data?.expiresAt ?? null,
    isLoading: query.isLoading,
    error: query.error,
  };
}
