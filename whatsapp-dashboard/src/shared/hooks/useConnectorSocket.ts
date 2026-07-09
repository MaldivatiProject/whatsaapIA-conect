"use client";

import { useEffect, useState } from "react";
import { connectorSocket } from "@/shared/lib/socket/connectorSocket";
import { useAuthStore } from "@/features/auth/store/authStore";

/** Owns the connectorSocket lifecycle for as long as it's mounted. Mount once, in the dashboard layout. */
export function useConnectorSocket() {
  const apiKey = useAuthStore((state) => state.apiKey);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!apiKey) return;
    connectorSocket.connect(apiKey);
    const unsubscribe = connectorSocket.onStatusChange(setConnected);
    return () => {
      unsubscribe();
      connectorSocket.disconnect();
      setConnected(false);
    };
  }, [apiKey]);

  return { connected };
}
