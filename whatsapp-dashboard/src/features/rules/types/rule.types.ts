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
  type: "send_text" | "set_state" | "noop";
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
}

export interface UpdateRuleInput {
  enabled?: boolean;
  name?: string;
  category?: string;
  conditions?: RuleCondition[];
  actions?: RuleAction[];
}

/** The simplified single-condition shape the dashboard's form authors. */
export interface SimpleRuleFormValues {
  name: string;
  category: string;
  field: ConditionField;
  senderValue: string;
  isGroupValue: "true" | "false";
  textValue: string;
  replyText: string;
}
