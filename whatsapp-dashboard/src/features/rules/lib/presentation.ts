import { MessageSquareText, User, Users, type LucideIcon } from "lucide-react";
import type { ConditionField } from "@/features/rules/types/rule.types";

const CONDITION_FIELD_ICON: Record<ConditionField, LucideIcon> = {
  sender: User,
  is_group: Users,
  text: MessageSquareText,
};

/** Icon that best represents a rule's first condition field, for quick visual
 * scanning in the table. Falls back to a generic icon for backend-only fields
 * the dashboard's simple editor doesn't author (e.g. set_state conditions). */
export function conditionFieldIcon(field: string | undefined): LucideIcon {
  return CONDITION_FIELD_ICON[field as ConditionField] ?? MessageSquareText;
}

const CHART_TOKEN_COUNT = 5;

/** Deterministic chart-color index (1-5) so the same category always renders
 * with the same accent dot across sessions, without maintaining a lookup table. */
export function categoryColorToken(category: string): string {
  const normalized = category.trim().toLowerCase() || "general";
  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0;
  }
  const index = (hash % CHART_TOKEN_COUNT) + 1;
  return `var(--chart-${index})`;
}
