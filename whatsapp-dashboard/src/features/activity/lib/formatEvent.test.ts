import { describe, it, expect } from "vitest";
import { eventDescription, EVENT_LABEL, MESSAGE_EVENT_NAMES } from "./formatEvent";
import type { ConnectorEvent } from "@/shared/types/connector.types";

function makeEvent(overrides: Partial<ConnectorEvent> = {}): ConnectorEvent {
  return {
    eventName: "MESSAGE_RECEIVED",
    occurredAt: "2026-07-08T12:00:00.000Z",
    sessionId: "mi-sesion",
    ...overrides,
  };
}

describe("eventDescription", () => {
  it("quotes the message text when the event has a sender and text", () => {
    const event = makeEvent({ from: "5491122334455@s.whatsapp.net", text: "Hola" });
    expect(eventDescription(event)).toBe('5491122334455@s.whatsapp.net: "Hola"');
  });

  it("shows just the sender when there's no text (e.g. media)", () => {
    const event = makeEvent({ eventName: "MEDIA_RECEIVED", from: "5491122334455@s.whatsapp.net" });
    expect(eventDescription(event)).toBe("de 5491122334455@s.whatsapp.net");
  });

  it("shows the recipient for outgoing events", () => {
    const event = makeEvent({ eventName: "MESSAGE_SENT", to: "5491122334455@s.whatsapp.net" });
    expect(eventDescription(event)).toBe("a 5491122334455@s.whatsapp.net");
  });

  it("returns null when there's no from/to (e.g. session lifecycle events)", () => {
    const event = makeEvent({ eventName: "SESSION_CONNECTED" });
    expect(eventDescription(event)).toBeNull();
  });
});

describe("EVENT_LABEL", () => {
  it("has a Spanish label for every event in MESSAGE_EVENT_NAMES", () => {
    for (const name of MESSAGE_EVENT_NAMES) {
      expect(EVENT_LABEL[name]).toBeTruthy();
    }
  });
});
