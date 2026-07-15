"use client";

import { Code2, MoreHorizontal, Power, PowerOff, Reply, Trash2 } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/shared/components/data/DataTable";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { RuleDetailPanel } from "@/features/rules/components/RuleDetailPanel";
import { categoryColorToken, conditionFieldIcon } from "@/features/rules/lib/presentation";
import { summarizeRuleActions, summarizeRuleConditions } from "@/features/rules/lib/mapping";
import type { CreateRuleInput, Rule } from "@/features/rules/types/rule.types";

interface RulesTableProps {
  rules: Rule[];
  onToggleEnabled: (id: string, enabled: boolean) => void;
  onSaveRule: (id: string, input: CreateRuleInput) => void;
  isSavingRule: boolean;
  onDelete: (id: string) => void;
}

export function RulesTable({ rules, onToggleEnabled, onSaveRule, isSavingRule, onDelete }: RulesTableProps) {
  const columns: DataTableColumn<Rule>[] = [
    {
      id: "priority",
      header: "Orden",
      title: "Menor número = se evalúa primero",
      cell: (rule) => (
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-muted px-1.5 font-mono text-xs text-muted-foreground">
          {rule.priority}
        </span>
      ),
      exportValue: (rule) => rule.priority,
      sortValue: (rule) => rule.priority,
      pdfWidth: 55,
    },
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
      cell: (rule) => {
        const isScript = rule.actions.some((action) => action.type === "run_script");
        return (
          <div className="flex items-center gap-2">
            {isScript ? (
              <Badge variant="outline" className="gap-1">
                <Code2 className="h-3 w-3" aria-hidden="true" />
                Script
              </Badge>
            ) : (
              <Reply className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            )}
            {summarizeRuleActions(rule)}
          </div>
        );
      },
      exportValue: (rule) => summarizeRuleActions(rule),
      sortValue: (rule) => summarizeRuleActions(rule),
      cellClassName: "text-muted-foreground",
      pdfWidth: 170,
    },
    {
      id: "enabled",
      header: "Estado",
      cell: (rule) => (
        <Badge variant={rule.enabled ? "success" : "outline"} className="gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${rule.enabled ? "bg-success-foreground" : "bg-muted-foreground"}`}
            aria-hidden="true"
          />
          {rule.enabled ? "Activa" : "Inactiva"}
        </Badge>
      ),
      exportValue: (rule) => (rule.enabled ? "Activa" : "Inactiva"),
      sortValue: (rule) => rule.enabled,
      pdfWidth: 75,
    },
    {
      id: "actions",
      header: "Acciones",
      align: "right",
      exportable: false,
      cell: (rule) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" aria-label={`Acciones para ${rule.name}`}>
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onToggleEnabled(rule.id, !rule.enabled)} className="gap-2">
              {rule.enabled ? (
                <PowerOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Power className="h-4 w-4" aria-hidden="true" />
              )}
              {rule.enabled ? "Desactivar" : "Activar"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(rule.id)}
              className="gap-2 text-destructive-text focus:text-destructive-text"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rules}
      getRowKey={(rule) => rule.id}
      emptyMessage="No hay reglas todavía. Creá una para auto-responder mensajes según el remitente, si es un grupo, o el contenido del texto."
      exportConfig={{ title: "Reglas", filename: "reglas" }}
      pagination={{ pageSize: 10 }}
      renderExpanded={(rule) => (
        <RuleDetailPanel
          rule={rule}
          isSaving={isSavingRule}
          onSave={(input) => onSaveRule(rule.id, input)}
        />
      )}
      expandAriaLabel={(rule) => `Ver detalle de ${rule.name}`}
    />
  );
}
