"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { ErrorState } from "@/shared/components/layout/ErrorState";
import { useMetricsRaw } from "@/features/health/hooks/useHealth";

export function MetricsPanel() {
  const [open, setOpen] = useState(false);
  const { data, isLoading, error } = useMetricsRaw(open);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Métricas (Prometheus)</CardTitle>
      </CardHeader>
      <CardContent>
        <details onToggle={(event) => setOpen(event.currentTarget.open)}>
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors marker:content-none hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            <ChevronRight
              className="h-4 w-4 shrink-0 transition-transform"
              style={{ transform: open ? "rotate(90deg)" : undefined }}
              aria-hidden="true"
            />
            Ver métricas crudas de /metrics
          </summary>
          <div className="mt-3">
            {open && isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
            {open && error && <ErrorState message="No se pudo consultar /metrics." />}
            {open && data && (
              <pre className="max-h-80 overflow-auto rounded-md border bg-muted/30 p-3 text-xs">
                {data}
              </pre>
            )}
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
