"use client";

import { useMemo, useState } from "react";
import { RefreshCcw, Search } from "lucide-react";
import { BusinessMessagesTable } from "@/features/business-messages/components/BusinessMessagesTable";
import { useBusinessMessages } from "@/features/business-messages/hooks/useBusinessMessages";
import type { BusinessMessage } from "@/features/business-messages/types/businessMessage.types";
import { useRules } from "@/features/rules/hooks/useRules";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ErrorState } from "@/shared/components/layout/ErrorState";

function matchesSearch(
  message: BusinessMessage,
  term: string,
  ruleNameById: Record<string, string>,
): boolean {
  const ruleId = message.created_by?.startsWith("rule:") ? message.created_by.slice(5) : null;
  const haystack = [
    message.sender,
    message.business_category,
    message.processing_status,
    message.conversation_id,
    ruleId ? (ruleNameById[ruleId] ?? "") : "",
    ...Object.values(message.metadata).map((value) => String(value)),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(term);
}

export default function BusinessMessagesPage() {
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const { messages, isLoading, isFetching, error, refetch } = useBusinessMessages({
    category: category.trim() || undefined,
    limit: 200,
  });
  const { rules } = useRules();

  const ruleNameById = useMemo(
    () => Object.fromEntries(rules.map((rule) => [rule.id, rule.name])),
    [rules],
  );

  const filteredMessages = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return messages;
    return messages.filter((message) => matchesSearch(message, term, ruleNameById));
  }, [messages, search, ruleNameById]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Log</h1>
          <p className="text-sm text-muted-foreground">
            Datos estructurados que las reglas con acción &quot;Ejecutar script Python&quot;
            devuelven — ej. el resultado de un traslado de tienda.
          </p>
        </div>

        <div className="flex items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="business-messages-search">Buscar</Label>
            <div className="relative">
              <Search
                className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="business-messages-search"
                placeholder="correo, cédula, remitente…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="business-messages-category">Categoría</Label>
            <Input
              id="business-messages-category"
              placeholder="traslado_tienda"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            />
          </div>
          <Button className="gap-2" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            {isFetching ? "Actualizando…" : "Actualizar"}
          </Button>
        </div>
      </div>

      {isLoading && <Skeleton className="h-64 w-full" />}

      {error && <ErrorState message={`No se pudieron cargar los resultados: ${error.message}`} />}

      {!isLoading && !error && (
        <Card className="gap-0 py-0">
          <BusinessMessagesTable
            messages={filteredMessages}
            ruleNameById={ruleNameById}
            emptyMessage={
              messages.length > 0
                ? "Ningún resultado coincide con la búsqueda."
                : undefined
            }
          />
        </Card>
      )}
    </div>
  );
}
