"use client";

import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  Check,
  Code2,
  Copy,
  MessageCircle,
  Pencil,
  Reply,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { RuleFormFields } from "@/features/rules/components/RuleFormFields";
import { conditionFieldIcon } from "@/features/rules/lib/presentation";
import { ruleToFormValues, summarizeCondition } from "@/features/rules/lib/mapping";
import type { CreateRuleInput, Rule } from "@/features/rules/types/rule.types";

interface RuleDetailPanelProps {
  rule: Rule;
  onSave: (input: CreateRuleInput) => void;
  isSaving: boolean;
}

function ScriptBlock({ source }: { source: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(source);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-background">
      <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-1.5">
        <span className="font-mono text-xs text-muted-foreground">script.py</span>
        <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-xs" onClick={handleCopy}>
          {copied ? (
            <>
              <Check className="h-3 w-3" aria-hidden="true" />
              Copiado
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" aria-hidden="true" />
              Copiar
            </>
          )}
        </Button>
      </div>
      <pre className="max-h-64 overflow-auto p-3 font-mono text-xs">{source}</pre>
    </div>
  );
}

function SectionCard({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </div>
      {children}
    </div>
  );
}

/** Inline replacement for the old edit modal — rendered by DataTable inside an
 * expanded row. Starts in a read-only detail view (full conditions/action,
 * not the truncated table summary) and switches to RuleFormFields on demand. */
export function RuleDetailPanel({ rule, onSave, isSaving }: RuleDetailPanelProps) {
  const [isEditing, setIsEditing] = useState(false);

  const sendText = rule.actions.find((action) => action.type === "send_text");
  const runScript = rule.actions.find((action) => action.type === "run_script");
  const ackText = runScript ? String(runScript.params.ack_text ?? "") : "";
  const conditionIcon = conditionFieldIcon(rule.conditions[0]?.field);

  function handleSubmit(input: CreateRuleInput) {
    onSave(input);
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <div className="max-w-2xl p-4">
        <RuleFormFields
          defaultValues={ruleToFormValues(rule)}
          submitLabel="Guardar cambios"
          pendingLabel="Guardando…"
          isPending={isSaving}
          onSubmit={handleSubmit}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">Detalle completo de la regla</p>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setIsEditing(true)}>
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          Editar
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-start">
        <SectionCard icon={conditionIcon} label="Cuándo">
          <ul className="space-y-1 text-sm">
            {rule.conditions.length > 0 ? (
              rule.conditions.map((condition, index) => <li key={index}>{summarizeCondition(condition)}</li>)
            ) : (
              <li className="text-muted-foreground">—</li>
            )}
          </ul>
        </SectionCard>

        <ArrowRight
          className="mt-6 hidden h-4 w-4 shrink-0 text-muted-foreground md:block"
          aria-hidden="true"
        />

        <SectionCard icon={runScript ? Code2 : Reply} label="Entonces">
          {sendText && <p className="text-sm whitespace-pre-wrap">{String(sendText.params.text ?? "")}</p>}
          {runScript && (
            <div className="space-y-2">
              <Badge variant="outline" className="gap-1">
                <Code2 className="h-3 w-3" aria-hidden="true" />
                Script Python
              </Badge>
              <ScriptBlock source={String(runScript.params.script ?? "")} />
              <div className="flex items-start gap-1.5 rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                <MessageCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="min-w-0">
                  Mensaje inmediato: {ackText ? <span className="text-foreground">&ldquo;{ackText}&rdquo;</span> : "(mensaje por defecto)"}
                </span>
              </div>
            </div>
          )}
          {!sendText && !runScript && <p className="text-sm text-muted-foreground">—</p>}
        </SectionCard>
      </div>
    </div>
  );
}
