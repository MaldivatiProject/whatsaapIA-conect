"use client";

import { useState } from "react";
import { useRules } from "@/features/rules/hooks/useRules";
import { EditRuleDialog, RuleFormDialog } from "@/features/rules/components/RuleFormDialog";
import { RulesTable } from "@/features/rules/components/RulesTable";
import { Card } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { TablePagination } from "@/shared/components/layout/TablePagination";
import { ErrorState } from "@/shared/components/layout/ErrorState";
import { usePagination } from "@/shared/hooks/usePagination";
import { ruleToFormValues } from "@/features/rules/lib/mapping";
import type { Rule } from "@/features/rules/types/rule.types";

export default function RulesPage() {
  const { rules, isLoading, error, createRule, isCreating, toggleEnabled, updateRule, isUpdating, deleteRule } =
    useRules();
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const { page, setPage, pageCount, pageItems, totalItems, pageSize } = usePagination(rules, 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Reglas</h1>
          <p className="text-sm text-muted-foreground">
            Auto-respuestas según remitente, grupo o contenido del mensaje.
          </p>
        </div>
        <RuleFormDialog onCreate={createRule} isCreating={isCreating} />
      </div>

      {isLoading && <Skeleton className="h-64 w-full" />}

      {error && <ErrorState message={`No se pudieron cargar las reglas: ${error.message}`} />}

      {!isLoading && !error && rules.length === 0 && (
        <RulesTable rules={[]} onToggleEnabled={() => {}} onEdit={() => {}} onDelete={() => {}} />
      )}

      {!isLoading && !error && rules.length > 0 && (
        <Card className="gap-0 py-0">
          <RulesTable
            rules={pageItems}
            onToggleEnabled={toggleEnabled}
            onEdit={setEditingRule}
            onDelete={(id) => {
              if (confirm("¿Eliminar esta regla? Esta acción no se puede deshacer.")) {
                deleteRule(id);
              }
            }}
          />
          <TablePagination
            page={page}
            pageCount={pageCount}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </Card>
      )}

      {editingRule && (
        <EditRuleDialog
          open={Boolean(editingRule)}
          onOpenChange={(open) => !open && setEditingRule(null)}
          defaultValues={ruleToFormValues(editingRule)}
          isSaving={isUpdating}
          onSave={(input) => updateRule(editingRule.id, input)}
        />
      )}
    </div>
  );
}
