"use client";

import { useMemo } from "react";
import { useActivityStore } from "@/features/activity/store/activityStore";
import { EVENT_LABEL, eventDescription } from "@/features/activity/lib/formatEvent";
import { Badge } from "@/shared/components/ui/badge";
import type { ConnectorEventName } from "@/shared/types/connector.types";

interface ActivityFeedProps {
  filterEventNames?: ConnectorEventName[];
  emptyMessage?: string;
  maxItems?: number;
}

export function ActivityFeed({
  filterEventNames,
  emptyMessage = "Todavía no hay eventos.",
  maxItems,
}: ActivityFeedProps) {
  const events = useActivityStore((state) => state.events);

  const filtered = useMemo(() => {
    const list = filterEventNames
      ? events.filter((event) => filterEventNames.includes(event.eventName))
      : events;
    return maxItems ? list.slice(0, maxItems) : list;
  }, [events, filterEventNames, maxItems]);

  if (filtered.length === 0) {
    return <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ol className="flex flex-col gap-2" aria-label="Feed de actividad">
      {filtered.map((event, index) => (
        <li
          key={`${event.eventName}-${event.sessionId}-${event.occurredAt}-${index}`}
          className="flex items-start justify-between gap-3 rounded-md border p-3 text-sm"
        >
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{event.sessionId}</Badge>
              <span className="font-medium">{EVENT_LABEL[event.eventName]}</span>
            </div>
            {eventDescription(event) && (
              <p className="truncate text-muted-foreground">{eventDescription(event)}</p>
            )}
          </div>
          <time
            dateTime={event.occurredAt}
            className="shrink-0 text-xs text-muted-foreground"
          >
            {new Date(event.occurredAt).toLocaleTimeString()}
          </time>
        </li>
      ))}
    </ol>
  );
}
