import { describe, it, expect } from "vitest";
import { buildCreateRuleInput, ruleToFormValues, summarizeRuleActions, summarizeRuleConditions } from "./mapping";
import type { Rule, SimpleRuleFormValues } from "@/features/rules/types/rule.types";

describe("buildCreateRuleInput", () => {
  const base: SimpleRuleFormValues = {
    name: "Auto-reply",
    category: "soporte",
    field: "sender",
    senderValue: "573243744739@s.whatsapp.net",
    isGroupValue: "true",
    textValue: "",
    replyText: "Procesando tu solicitud...",
  };

  it("builds a sender-equals condition", () => {
    const input = buildCreateRuleInput(base);
    expect(input.conditions).toEqual([
      { field: "sender", operator: "equals", value: "573243744739@s.whatsapp.net" },
    ]);
    expect(input.actions).toEqual([
      { type: "send_text", params: { text: "Procesando tu solicitud..." } },
    ]);
    expect(input.category).toBe("soporte");
  });

  it("builds an is_group-equals boolean condition", () => {
    const input = buildCreateRuleInput({ ...base, field: "is_group", isGroupValue: "false" });
    expect(input.conditions).toEqual([{ field: "is_group", operator: "equals", value: false }]);
  });

  it("builds a text-contains condition", () => {
    const input = buildCreateRuleInput({ ...base, field: "text", textValue: "cotización" });
    expect(input.conditions).toEqual([{ field: "text", operator: "contains", value: "cotización" }]);
  });
});

function makeRule(overrides: Partial<Rule> = {}): Rule {
  return {
    id: "1",
    tenant_id: "acme",
    name: "Auto-reply",
    description: null,
    category: "soporte",
    session_id: null,
    priority: 100,
    enabled: true,
    stop_on_match: false,
    version: 1,
    conditions: [{ field: "sender", operator: "equals", value: "573243744739@s.whatsapp.net" }],
    actions: [{ type: "send_text", params: { text: "Procesando tu solicitud..." } }],
    created_at: "2026-07-09T00:00:00Z",
    ...overrides,
  };
}

describe("summarizeRuleConditions", () => {
  it("renders a human-readable Spanish summary", () => {
    expect(summarizeRuleConditions(makeRule())).toBe(
      'Remitente es "573243744739@s.whatsapp.net"',
    );
  });

  it("renders boolean values as sí/no", () => {
    const rule = makeRule({ conditions: [{ field: "is_group", operator: "equals", value: true }] });
    expect(summarizeRuleConditions(rule)).toBe('Es grupo es "sí"');
  });
});

describe("ruleToFormValues", () => {
  it("round-trips a sender condition", () => {
    const values = ruleToFormValues(makeRule());
    expect(values.field).toBe("sender");
    expect(values.category).toBe("soporte");
    expect(values.senderValue).toBe("573243744739@s.whatsapp.net");
    expect(values.replyText).toBe("Procesando tu solicitud...");
  });

  it("round-trips an is_group condition", () => {
    const rule = makeRule({ conditions: [{ field: "is_group", operator: "equals", value: false }] });
    const values = ruleToFormValues(rule);
    expect(values.field).toBe("is_group");
    expect(values.isGroupValue).toBe("false");
  });

  it("round-trips a text condition", () => {
    const rule = makeRule({ conditions: [{ field: "text", operator: "contains", value: "horario" }] });
    const values = ruleToFormValues(rule);
    expect(values.field).toBe("text");
    expect(values.textValue).toBe("horario");
  });

  it("feeding buildCreateRuleInput(ruleToFormValues(rule)) reproduces the same condition", () => {
    const rule = makeRule();
    const roundTripped = buildCreateRuleInput(ruleToFormValues(rule));
    expect(roundTripped.conditions).toEqual(
      rule.conditions.map(({ field, operator, value }) => ({ field, operator, value })),
    );
  });
});

describe("summarizeRuleActions", () => {
  it("summarizes a send_text action, truncating long text", () => {
    const longText = "a".repeat(80);
    const rule = makeRule({ actions: [{ type: "send_text", params: { text: longText } }] });
    const summary = summarizeRuleActions(rule);
    expect(summary.startsWith("Responder:")).toBe(true);
    expect(summary).toContain("…");
  });
});
