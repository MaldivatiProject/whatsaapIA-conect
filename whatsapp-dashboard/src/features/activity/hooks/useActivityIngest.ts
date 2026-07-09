"use client";

import { useConnectorEvents } from "@/shared/hooks/useConnectorEvent";
import { useActivityStore } from "@/features/activity/store/activityStore";
import { CONNECTOR_EVENT_NAMES } from "@/shared/types/connector.types";

/** Mount once (dashboard layout) to keep the activity ring buffer populated regardless of the active page. */
export function useActivityIngest() {
  const push = useActivityStore((state) => state.push);
  useConnectorEvents([...CONNECTOR_EVENT_NAMES], push);
}
