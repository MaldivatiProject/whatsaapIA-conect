"use client";

import { RotateCcw } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/shared/components/data/DataTable";
import { Button } from "@/shared/components/ui/button";
import { categoryColorToken, conditionFieldIcon } from "@/features/rules/lib/presentation";
import { summarizeRuleActions, summarizeRuleConditions } from "@/features/rules/lib/mapping";
import type { Rule } from "@/features/rules/types/rule.types";

function formatDeletedAt(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(iso),
  );
}

interface DeletedRulesTableProps {
  rules: Rule[];
  onRestore: (id: string) => void;
  isRestoring: boolean;
}

export function DeletedRulesTable({ rules, onRestore, isRestoring }: DeletedRulesTableProps) {
  const columns: DataTableColumn<Rule>[] = [
    {
      id: "name",
      header: "Nombre",
      cell: (rule) => (
        <div className="flex flex-col">
          <span className="font-medium">{rule.name}</span>
          <span
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
            title={`Categoría: ${rule.category || "general"}`}
          >
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: categoryColorToken(rule.category) }}
              aria-hidden="true"
            />
            {rule.category || "general"}
          </span>
        </div>
      ),
      exportValue: (rule) => rule.name,
      sortValue: (rule) => rule.name,
      pdfWidth: 150,
    },
    {
      id: "condition",
      header: "Condición",
      hideBelow: "lg",
      cell: (rule) => {
        const Icon = conditionFieldIcon(rule.conditions[0]?.field);
        return (
          <span className="inline-flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            {summarizeRuleConditions(rule)}
          </span>
        );
      },
      exportValue: (rule) => summarizeRuleConditions(rule),
      sortValue: (rule) => summarizeRuleConditions(rule),
      cellClassName: "text-muted-foreground",
      pdfWidth: 190,
    },
    {
      id: "action",
      header: "Acción",
      hideBelow: "md",
      cell: (rule) => summarizeRuleActions(rule),
      exportValue: (rule) => summarizeRuleActions(rule),
      sortValue: (rule) => summarizeRuleActions(rule),
      cellClassName: "text-muted-foreground",
      pdfWidth: 170,
    },
    {
      id: "deleted_at",
      header: "Eliminada el",
      hideBelow: "sm",
      cell: (rule) => formatDeletedAt(rule.deleted_at),
      exportValue: (rule) => formatDeletedAt(rule.deleted_at),
      sortValue: (rule) => rule.deleted_at ?? "",
      cellClassName: "text-muted-foreground",
      pdfWidth: 110,
    },
    {
      id: "actions",
      header: "Acciones",
      align: "right",
      exportable: false,
      cell: (rule) => (
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          disabled={isRestoring}
          onClick={() => onRestore(rule.id)}
          aria-label={`Restaurar ${rule.name}`}
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Restaurar
        </Button>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rules}
      getRowKey={(rule) => rule.id}
      emptyMessage="No hay reglas eliminadas."
      exportConfig={{ title: "Reglas eliminadas", filename: "reglas-eliminadas" }}
      defaultSort={{ columnId: "deleted_at", direction: "desc" }}
      pagination={{ pageSize: 10 }}
    />
  );
}
