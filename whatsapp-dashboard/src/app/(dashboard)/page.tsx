"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useSessionsQuery } from "@/entities/session/model/useSessionsQuery";
import { useSessionsLiveSync } from "@/features/sessions/hooks/useSessionsLiveSync";
import { HealthCard } from "@/features/health/components/HealthCard";
import { MetricsPanel } from "@/features/health/components/MetricsPanel";
import { ActivityFeed } from "@/features/activity/components/ActivityFeed";

export default function OverviewPage() {
  useSessionsLiveSync();
  const { data: sessions = [] } = useSessionsQuery();
  const openCount = sessions.filter((s) => s.status === "open").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Resumen</h1>
        <p className="text-sm text-muted-foreground">
          Estado general de whatsapp-connector y su actividad reciente.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <HealthCard />
        <Card>
          <CardHeader>
            <CardTitle>Sesiones</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {openCount}
              <span className="text-base font-normal text-muted-foreground"> / {sessions.length} conectadas</span>
            </p>
            <Link href="/sessions" className="text-sm text-primary underline-offset-4 hover:underline">
              Administrar sesiones →
            </Link>
          </CardContent>
        </Card>
        <MetricsPanel />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Actividad reciente</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityFeed maxItems={10} emptyMessage="Sin actividad todavía." />
        </CardContent>
      </Card>
    </div>
  );
}
