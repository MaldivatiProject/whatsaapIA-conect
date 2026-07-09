"use client";

import { RefreshCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { ReportsDashboard } from "@/features/reports/components/ReportsDashboard";
import { useReports } from "@/features/reports/hooks/useReports";
import type { ReportFilters } from "@/features/reports/types/report.types";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Skeleton } from "@/shared/components/ui/skeleton";

function toInputDate(date: Date) {
  return date.toISOString().slice(0, 16);
}

function defaultFrom() {
  const date = new Date();
  date.setHours(date.getHours() - 24);
  return toInputDate(date);
}

export default function ReportsPage() {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState("");
  const [sessionId, setSessionId] = useState("");

  const filters = useMemo<ReportFilters>(
    () => ({
      from: from || undefined,
      to: to || undefined,
      sessionId: sessionId.trim() || undefined,
      limit: 50,
    }),
    [from, to, sessionId],
  );
  const { reports, isLoading, isFetching, error, refetch } = useReports(filters);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Reportes</h1>
          <p className="text-sm text-muted-foreground">
            Seguimiento de mensajes procesados, categorías, reglas y estado de respuestas.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor="reports-from">Desde</Label>
            <Input
              id="reports-from"
              type="datetime-local"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="reports-to">Hasta</Label>
            <Input
              id="reports-to"
              type="datetime-local"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="reports-session">Sesión</Label>
            <Input
              id="reports-session"
              placeholder="test"
              value={sessionId}
              onChange={(event) => setSessionId(event.target.value)}
            />
          </div>
          <Button className="self-end gap-2" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            {isFetching ? "Actualizando…" : "Actualizar"}
          </Button>
        </div>
      </div>

      {isLoading && <Skeleton className="h-96 w-full" />}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          No se pudieron cargar los reportes: {error.message}
        </p>
      )}

      {reports && <ReportsDashboard reports={reports} />}
    </div>
  );
}

