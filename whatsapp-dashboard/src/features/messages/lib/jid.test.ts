import { describe, it, expect } from "vitest";
import { JID_PATTERN } from "./jid";

describe("JID_PATTERN", () => {
  it("accepts individual, group and lid JIDs", () => {
    expect(JID_PATTERN.test("5491122334455@s.whatsapp.net")).toBe(true);
    expect(JID_PATTERN.test("123456789@g.us")).toBe(true);
    expect(JID_PATTERN.test("99132626702366@lid")).toBe(true);
  });

  it("rejects malformed or unsupported JIDs", () => {
    expect(JID_PATTERN.test("not-a-jid")).toBe(false);
    expect(JID_PATTERN.test("5491122334455@c.us")).toBe(false);
    expect(JID_PATTERN.test("")).toBe(false);
  });
});
