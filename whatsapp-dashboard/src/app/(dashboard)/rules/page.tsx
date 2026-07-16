"use client";

import { useRules } from "@/features/rules/hooks/useRules";
import { RuleFormDialog } from "@/features/rules/components/RuleFormDialog";
import { RulesTable } from "@/features/rules/components/RulesTable";
import { SecuritySettingsCard } from "@/features/rules/components/SecuritySettingsCard";
import { Card } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ErrorState } from "@/shared/components/layout/ErrorState";

export default function RulesPage() {
  const { rules, isLoading, error, createRule, isCreating, toggleEnabled, updateRule, isUpdating, deleteRule } =
    useRules();

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

      <SecuritySettingsCard />

      {isLoading && <Skeleton className="h-64 w-full" />}

      {error && <ErrorState message={`No se pudieron cargar las reglas: ${error.message}`} />}

      {!isLoading && !error && (
        <Card className="gap-0 py-0">
          <RulesTable
            rules={rules}
            onToggleEnabled={toggleEnabled}
            onSaveRule={updateRule}
            isSavingRule={isUpdating}
            onDelete={(id) => {
              if (confirm("¿Eliminar esta regla? Esta acción no se puede deshacer.")) {
                deleteRule(id);
              }
            }}
          />
        </Card>
      )}
    </div>
  );
}
