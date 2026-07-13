"use client";

import { Code2, Pencil, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { summarizeRuleActions, summarizeRuleConditions } from "@/features/rules/lib/mapping";
import type { Rule } from "@/features/rules/types/rule.types";

interface RulesTableProps {
  rules: Rule[];
  onToggleEnabled: (id: string, enabled: boolean) => void;
  onEdit: (rule: Rule) => void;
  onDelete: (id: string) => void;
}

export function RulesTable({ rules, onToggleEnabled, onEdit, onDelete }: RulesTableProps) {
  if (rules.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        No hay reglas todavía. Creá una para auto-responder mensajes según el remitente, si es un
        grupo, o el contenido del texto.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead title="Menor número = se evalúa primero">Orden</TableHead>
          <TableHead>Nombre</TableHead>
          <TableHead>Categoría</TableHead>
          <TableHead>Condición</TableHead>
          <TableHead>Acción</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rules.map((rule) => (
          <TableRow key={rule.id}>
            <TableCell className="font-mono text-xs text-muted-foreground">{rule.priority}</TableCell>
            <TableCell className="font-medium">{rule.name}</TableCell>
            <TableCell>
              <Badge variant="outline">{rule.category || "general"}</Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">{summarizeRuleConditions(rule)}</TableCell>
            <TableCell className="text-muted-foreground">
              <div className="flex items-center gap-2">
                {rule.actions.some((action) => action.type === "run_script") && (
                  <Badge variant="outline" className="gap-1">
                    <Code2 className="h-3 w-3" aria-hidden="true" />
                    Script
                  </Badge>
                )}
                {summarizeRuleActions(rule)}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={rule.enabled ? "success" : "outline"}>
                {rule.enabled ? "Activa" : "Inactiva"}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onToggleEnabled(rule.id, !rule.enabled)}
                >
                  {rule.enabled ? "Desactivar" : "Activar"}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Editar regla ${rule.name}`}
                  onClick={() => onEdit(rule)}
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Eliminar regla ${rule.name}`}
                  onClick={() => onDelete(rule.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
