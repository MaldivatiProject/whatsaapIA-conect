"use client";

import { useEffect, useRef } from "react";
import { connectorSocket } from "@/shared/lib/socket/connectorSocket";
import type { ConnectorEvent, ConnectorEventName } from "@/shared/types/connector.types";

/** Subscribes to a single connector socket event for the lifetime of the component. */
export function useConnectorEvent(eventName: ConnectorEventName, handler: (event: ConnectorEvent) => void) {
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    return connectorSocket.subscribe(eventName, (event) => handlerRef.current(event));
  }, [eventName]);
}

/** Subscribes to several connector socket events with the same handler. `eventNames` must be stable. */
export function useConnectorEvents(eventNames: ConnectorEventName[], handler: (event: ConnectorEvent) => void) {
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    const unsubscribers = eventNames.map((name) =>
      connectorSocket.subscribe(name, (event) => handlerRef.current(event)),
    );
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- eventNames expected to be a stable module-level array
  }, []);
}
