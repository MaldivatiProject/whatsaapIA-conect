import type { CreateRuleInput, Rule, RuleCondition, SimpleRuleFormValues } from "@/features/rules/types/rule.types";

const FIELD_LABEL: Record<string, string> = {
  sender: "Remitente",
  is_group: "Es grupo",
  text: "El texto",
};

const OPERATOR_LABEL: Record<string, string> = {
  equals: "es",
  not_equals: "no es",
  contains: "contiene",
  starts_with: "empieza con",
  ends_with: "termina con",
  in: "está en",
  exists: "existe",
};

export function buildCreateRuleInput(values: SimpleRuleFormValues): CreateRuleInput {
  let condition: RuleCondition;
  switch (values.field) {
    case "sender":
      condition = { field: "sender", operator: "equals", value: values.senderValue.trim() };
      break;
    case "is_group":
      condition = { field: "is_group", operator: "equals", value: values.isGroupValue === "true" };
      break;
    case "text":
      condition = { field: "text", operator: "contains", value: values.textValue.trim() };
      break;
  }

  return {
    name: values.name.trim(),
    category: values.category.trim() || "general",
    conditions: [condition],
    actions: [{ type: "send_text", params: { text: values.replyText.trim() } }],
  };
}

/** Reverse of buildCreateRuleInput — populates the edit form from an existing rule. */
export function ruleToFormValues(rule: Rule): SimpleRuleFormValues {
  const condition = rule.conditions[0];
  const sendText = rule.actions.find((action) => action.type === "send_text");
  const replyText = sendText ? String(sendText.params.text ?? "") : "";

  const base: SimpleRuleFormValues = {
    name: rule.name,
    category: rule.category || "general",
    field: "sender",
    senderValue: "",
    isGroupValue: "true",
    textValue: "",
    replyText,
  };

  if (!condition) return base;

  switch (condition.field) {
    case "is_group":
      return { ...base, field: "is_group", isGroupValue: condition.value ? "true" : "false" };
    case "text":
      return { ...base, field: "text", textValue: String(condition.value ?? "") };
    default:
      return { ...base, field: "sender", senderValue: String(condition.value ?? "") };
  }
}

export function summarizeCondition(condition: RuleCondition): string {
  const field = FIELD_LABEL[condition.field] ?? condition.field;
  const operator = OPERATOR_LABEL[condition.operator] ?? condition.operator;
  const value =
    typeof condition.value === "boolean" ? (condition.value ? "sí" : "no") : String(condition.value ?? "");
  return `${field} ${operator} "${value}"`;
}

export function summarizeRuleConditions(rule: Rule): string {
  return rule.conditions.map(summarizeCondition).join(" Y ") || "—";
}

export function summarizeRuleActions(rule: Rule): string {
  const sendText = rule.actions.find((action) => action.type === "send_text");
  if (sendText) {
    const text = String(sendText.params.text ?? "");
    return `Responder: "${text.length > 60 ? `${text.slice(0, 60)}…` : text}"`;
  }
  return rule.actions.map((action) => action.type).join(", ") || "—";
}
