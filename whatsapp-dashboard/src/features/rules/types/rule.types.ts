/**
 * Mirrors whatsaap-backend's presentation/api/schemas.py. The dashboard only
 * exposes a simplified subset for authoring (single condition, send_text
 * action) — the backend's rule engine supports more (multiple conditions,
 * more operators, set_state), reachable later via a richer editor if needed.
 */

export type ConditionField = "sender" | "is_group" | "text";
export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "starts_with"
  | "ends_with"
  | "in"
  | "exists";

export interface RuleCondition {
  field: string;
  operator: ConditionOperator;
  value: unknown;
  case_sensitive?: boolean;
}

export interface RuleAction {
  type: "send_text" | "set_state" | "noop" | "run_script";
  params: Record<string, unknown>;
}

export interface Rule {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  category: string;
  session_id: string | null;
  priority: number;
  enabled: boolean;
  stop_on_match: boolean;
  version: number;
  conditions: RuleCondition[];
  actions: RuleAction[];
  created_at: string;
}

export interface CreateRuleInput {
  name: string;
  category?: string;
  conditions: RuleCondition[];
  actions: RuleAction[];
  session_id?: string | null;
  priority?: number;
}

export interface UpdateRuleInput {
  enabled?: boolean;
  name?: string;
  category?: string;
  conditions?: RuleCondition[];
  actions?: RuleAction[];
  priority?: number;
}

export type ActionKind = "send_text" | "run_script";

/** The simplified single-condition shape the dashboard's form authors. */
export interface SimpleRuleFormValues {
  name: string;
  category: string;
  /** Orden de evaluación: menor se evalúa primero. Mismo campo que el backend usa para ordenar reglas activas. */
  priority: number;
  field: ConditionField;
  senderValue: string;
  isGroupValue: "true" | "false";
  textValue: string;
  actionType: ActionKind;
  replyText: string;
  /** Full UTF-8 source of an uploaded .py script (run_script action only). */
  scriptSource: string;
  /** Display-only — the backend stores no filename, just the source. */
  scriptFileName: string;
  /** Mensaje inmediato enviado al matchear la regla, antes de correr el script. Vacío = default del backend; "off" = sin ack. */
  ackText: string;
}
