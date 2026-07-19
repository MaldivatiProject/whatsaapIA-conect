"use client";

import { useRules } from "@/features/rules/hooks/useRules";
import { useDeletedRules } from "@/features/rules/hooks/useDeletedRules";
import { RuleFormDialog } from "@/features/rules/components/RuleFormDialog";
import { RulesTable } from "@/features/rules/components/RulesTable";
import { DeletedRulesTable } from "@/features/rules/components/DeletedRulesTable";
import { SecuritySettingsCard } from "@/features/rules/components/SecuritySettingsCard";
import { Card } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ErrorState } from "@/shared/components/layout/ErrorState";
import { ConfirmDialog } from "@/shared/components/layout/ConfirmDialog";
import { useConfirmDialog } from "@/shared/hooks/useConfirmDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";

export default function RulesPage() {
  const { rules, isLoading, error, createRule, isCreating, toggleEnabled, updateRule, isUpdating, deleteRule } =
    useRules();
  const { confirm, confirmDialogProps } = useConfirmDialog();
  const {
    deletedRules,
    isLoading: isLoadingDeleted,
    error: deletedError,
    restoreRule,
    isRestoring,
  } = useDeletedRules();

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

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Activas</TabsTrigger>
          <TabsTrigger value="deleted">Eliminadas</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-6">
          {isLoading && <Skeleton className="h-64 w-full" />}
          {error && <ErrorState message={`No se pudieron cargar las reglas: ${error.message}`} />}
          {!isLoading && !error && (
            <Card className="gap-0 py-0">
              <RulesTable
                rules={rules}
                onToggleEnabled={toggleEnabled}
                onSaveRule={updateRule}
                isSavingRule={isUpdating}
                onDelete={async (id) => {
                  const confirmed = await confirm({
                    title: "Eliminar esta regla",
                    description: 'Podrás restaurarla luego desde la pestaña "Eliminadas".',
                    confirmLabel: "Eliminar",
                    variant: "destructive",
                  });
                  if (confirmed) deleteRule(id);
                }}
              />
            </Card>
          )}
        </TabsContent>

        <TabsContent value="deleted" className="space-y-6">
          {isLoadingDeleted && <Skeleton className="h-64 w-full" />}
          {deletedError && (
            <ErrorState
              message={`No se pudieron cargar las reglas eliminadas: ${deletedError.message}`}
            />
          )}
          {!isLoadingDeleted && !deletedError && (
            <Card className="gap-0 py-0">
              <DeletedRulesTable rules={deletedRules} onRestore={restoreRule} isRestoring={isRestoring} />
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}
