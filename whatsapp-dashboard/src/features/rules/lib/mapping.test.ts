import { describe, it, expect } from "vitest";
import { buildCreateRuleInput, ruleToFormValues, summarizeRuleActions, summarizeRuleConditions } from "./mapping";
import type { Rule, SimpleRuleFormValues } from "@/features/rules/types/rule.types";

describe("buildCreateRuleInput", () => {
  const base: SimpleRuleFormValues = {
    name: "Auto-reply",
    category: "soporte",
    priority: 100,
    field: "sender",
    senderValue: "573243744739@s.whatsapp.net",
    isGroupValue: "true",
    textValue: "",
    actionType: "send_text",
    replyText: "Procesando tu solicitud...",
    scriptSource: "",
    scriptFileName: "",
    ackText: "",
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
    expect(input.priority).toBe(100);
  });

  it("builds an is_group-equals boolean condition", () => {
    const input = buildCreateRuleInput({ ...base, field: "is_group", isGroupValue: "false" });
    expect(input.conditions).toEqual([{ field: "is_group", operator: "equals", value: false }]);
  });

  it("builds a text-contains condition", () => {
    const input = buildCreateRuleInput({ ...base, field: "text", textValue: "cotización" });
    expect(input.conditions).toEqual([{ field: "text", operator: "contains", value: "cotización" }]);
  });

  it("builds a run_script action when actionType is run_script", () => {
    const script = "def handle(message):\n    return {}";
    const input = buildCreateRuleInput({ ...base, actionType: "run_script", scriptSource: script });
    expect(input.actions).toEqual([{ type: "run_script", params: { script } }]);
  });

  it("includes ack_text in run_script params only when set", () => {
    const script = "def handle(message):\n    return {}";
    const withAck = buildCreateRuleInput({
      ...base,
      actionType: "run_script",
      scriptSource: script,
      ackText: "Procesando...",
    });
    expect(withAck.actions).toEqual([
      { type: "run_script", params: { script, ack_text: "Procesando..." } },
    ]);

    const withoutAck = buildCreateRuleInput({ ...base, actionType: "run_script", scriptSource: script });
    expect(withoutAck.actions).toEqual([{ type: "run_script", params: { script } }]);
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
    expect(values.priority).toBe(100);
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

  it("round-trips a run_script action", () => {
    const script = "def handle(message):\n    return {}";
    const rule = makeRule({ actions: [{ type: "run_script", params: { script } }] });
    const values = ruleToFormValues(rule);
    expect(values.actionType).toBe("run_script");
    expect(values.scriptSource).toBe(script);

    const roundTripped = buildCreateRuleInput(values);
    expect(roundTripped.actions).toEqual([{ type: "run_script", params: { script } }]);
  });

  it("round-trips a run_script action's ack_text", () => {
    const script = "def handle(message):\n    return {}";
    const rule = makeRule({
      actions: [{ type: "run_script", params: { script, ack_text: "off" } }],
    });
    const values = ruleToFormValues(rule);
    expect(values.ackText).toBe("off");

    const roundTripped = buildCreateRuleInput(values);
    expect(roundTripped.actions).toEqual([
      { type: "run_script", params: { script, ack_text: "off" } },
    ]);
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

  it("summarizes a run_script action without leaking the source", () => {
    const rule = makeRule({
      actions: [{ type: "run_script", params: { script: "def handle(message): ..." } }],
    });
    const summary = summarizeRuleActions(rule);
    expect(summary).toBe("Ejecuta un script Python");
    expect(summary).not.toContain("def handle");
  });
});
