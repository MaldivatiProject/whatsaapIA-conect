"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useConnectorEvents } from "@/shared/hooks/useConnectorEvent";
import { SESSIONS_QUERY_KEY } from "@/entities/session/model/useSessionsQuery";
import type { ConnectorEventName } from "@/shared/types/connector.types";

const SESSION_LIFECYCLE_EVENTS: ConnectorEventName[] = [
  "SESSION_CREATED",
  "SESSION_CONNECTED",
  "SESSION_DISCONNECTED",
  "SESSION_RECONNECTED",
];

/** Keeps the sessions list query fresh as connector socket events arrive, without polling. */
export function useSessionsLiveSync() {
  const queryClient = useQueryClient();
  useConnectorEvents(SESSION_LIFECYCLE_EVENTS, () => {
    queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });
  });
}
