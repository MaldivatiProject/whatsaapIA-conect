import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ActivityFeed } from "./ActivityFeed";
import { useActivityStore } from "@/features/activity/store/activityStore";
import type { ConnectorEvent } from "@/shared/types/connector.types";

function pushEvent(overrides: Partial<ConnectorEvent>) {
  useActivityStore.getState().push({
    eventName: "SESSION_CONNECTED",
    occurredAt: new Date().toISOString(),
    sessionId: "mi-sesion",
    ...overrides,
  });
}

describe("ActivityFeed", () => {
  beforeEach(() => {
    useActivityStore.getState().clear();
  });

  it("shows the empty message when there are no events", () => {
    render(<ActivityFeed emptyMessage="Nada por acá" />);
    expect(screen.getByText("Nada por acá")).toBeInTheDocument();
  });

  it("renders pushed events with their Spanish label, most recent first", () => {
    pushEvent({ eventName: "SESSION_CREATED" });
    pushEvent({ eventName: "SESSION_CONNECTED" });
    render(<ActivityFeed />);

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Sesión conectada");
    expect(items[1]).toHaveTextContent("Sesión creada");
  });

  it("filters events by the given event names", () => {
    pushEvent({ eventName: "SESSION_CREATED" });
    pushEvent({ eventName: "MESSAGE_SENT", to: "5491122334455@s.whatsapp.net" });
    render(<ActivityFeed filterEventNames={["MESSAGE_SENT"]} />);

    expect(screen.getByText("Mensaje enviado")).toBeInTheDocument();
    expect(screen.queryByText("Sesión creada")).not.toBeInTheDocument();
  });
});
