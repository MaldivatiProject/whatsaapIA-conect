import { describe, it, expect } from "vitest";
import { sessionStatusLabel, sessionStatusVariant } from "./status";

describe("sessionStatusLabel", () => {
  it("translates known statuses to Spanish", () => {
    expect(sessionStatusLabel("open")).toBe("Conectado");
    expect(sessionStatusLabel("qr_ready")).toBe("Esperando QR");
    expect(sessionStatusLabel("disconnected")).toBe("Desconectado");
  });

  it("falls back to the raw value for unknown statuses instead of throwing", () => {
    expect(sessionStatusLabel("something_new")).toBe("something_new");
  });
});

describe("sessionStatusVariant", () => {
  it("maps open to the success (positive) badge variant", () => {
    expect(sessionStatusVariant("open")).toBe("success");
  });

  it("maps disconnected to destructive", () => {
    expect(sessionStatusVariant("disconnected")).toBe("destructive");
  });

  it("falls back to outline for unknown statuses", () => {
    expect(sessionStatusVariant("something_new")).toBe("outline");
  });
});
