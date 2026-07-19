import type { CreateRuleInput, Rule, RuleCondition, SimpleRuleFormValues } from "@/features/rules/types/rule.types";

const HAS_CSV_ATTACHMENT_FIELD = "has_csv_attachment";

const FIELD_LABEL: Record<string, string> = {
  sender: "Remitente",
  is_group: "Es grupo",
  text: "El texto",
  [HAS_CSV_ATTACHMENT_FIELD]: "Adjunto CSV",
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

  const isBulk = values.actionType === "run_script_bulk";
  const isRunScript = values.actionType === "run_script" || isBulk;
  const isQuery = values.actionType === "query_traslado_status";
  const secretNames = values.secretsInput
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  return {
    name: values.name.trim(),
    category: values.category.trim() || "general",
    priority: values.priority,
    conditions: isBulk
      ? [condition, { field: HAS_CSV_ATTACHMENT_FIELD, operator: "equals", value: true }]
      : [condition],
    // Bulk is dashboard-only sugar over the same run_script action — see
    // ActionKind's doc comment in rule.types.ts.
    ...(isBulk ? { stop_on_match: true } : {}),
    actions: isRunScript
      ? [
          {
            type: "run_script",
            params: {
              script: values.scriptSource,
              ...(values.ackText.trim() ? { ack_text: values.ackText.trim() } : {}),
              ...(secretNames.length ? { secrets: secretNames } : {}),
            },
          },
        ]
      : isQuery
        ? [
            {
              type: "query_traslado_status",
              params: {
                ...(values.queryBusinessCategory.trim()
                  ? { business_category: values.queryBusinessCategory.trim() }
                  : {}),
              },
            },
          ]
        : [{ type: "send_text", params: { text: values.replyText.trim() } }],
  };
}

/** Reverse of buildCreateRuleInput — populates the edit form from an existing rule. */
export function ruleToFormValues(rule: Rule): SimpleRuleFormValues {
  const isBulk = isBulkCsvRule(rule);
  // The bulk rule's *primary* (user-facing) condition is whichever one isn't
  // the synthetic has_csv_attachment marker buildCreateRuleInput appended.
  const condition = isBulk
    ? rule.conditions.find((c) => c.field !== HAS_CSV_ATTACHMENT_FIELD)
    : rule.conditions[0];
  const sendText = rule.actions.find((action) => action.type === "send_text");
  const runScript = rule.actions.find((action) => action.type === "run_script");
  const queryTraslado = rule.actions.find((action) => action.type === "query_traslado_status");
  const replyText = sendText ? String(sendText.params.text ?? "") : "";
  const scriptSource = runScript ? String(runScript.params.script ?? "") : "";
  const ackText = runScript ? String(runScript.params.ack_text ?? "") : "";
  const secretsInput =
    runScript && Array.isArray(runScript.params.secrets)
      ? (runScript.params.secrets as unknown[]).map(String).join(", ")
      : "";
  const queryBusinessCategory = queryTraslado
    ? String(queryTraslado.params.business_category ?? "")
    : "";

  const base: SimpleRuleFormValues = {
    name: rule.name,
    category: rule.category || "general",
    priority: rule.priority,
    field: "sender",
    senderValue: "",
    isGroupValue: "true",
    textValue: "",
    actionType: isBulk
      ? "run_script_bulk"
      : queryTraslado
        ? "query_traslado_status"
        : runScript
          ? "run_script"
          : "send_text",
    replyText,
    scriptSource,
    scriptFileName: scriptSource ? "script.py (cargado)" : "",
    ackText,
    secretsInput,
    queryBusinessCategory,
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

/** Whether a rule is the dashboard-authored "bulk CSV" variant — see
 * ActionKind's doc comment. Used by RulesTable to badge it distinctly from a
 * plain run_script rule sharing the same trigger text. */
export function isBulkCsvRule(rule: Rule): boolean {
  return rule.conditions.some((c) => c.field === HAS_CSV_ATTACHMENT_FIELD);
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
  const runScript = rule.actions.find((action) => action.type === "run_script");
  if (runScript) {
    return "Ejecuta un script Python";
  }
  const queryTraslado = rule.actions.find((action) => action.type === "query_traslado_status");
  if (queryTraslado) {
    return "Consulta el estado de un traslado";
  }
  return rule.actions.map((action) => action.type).join(", ") || "—";
}
