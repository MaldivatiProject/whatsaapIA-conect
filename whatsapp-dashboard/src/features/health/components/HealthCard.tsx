"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ErrorState } from "@/shared/components/layout/ErrorState";
import { useHealth } from "@/features/health/hooks/useHealth";

export function HealthCard() {
  const { data, isLoading, error } = useHealth();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estado del servicio</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <Skeleton className="h-6 w-32" />}

        {error && <ErrorState message="No se pudo consultar /health." />}

        {data && (
          <>
            <Badge variant={data.status === "ok" ? "success" : "destructive"}>
              {data.status}
            </Badge>
            <dl className="space-y-1 text-sm">
              {Object.entries(data.info ?? {}).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">{key}</dt>
                  <dd>
                    <Badge variant={value.status === "up" ? "success" : "destructive"}>
                      {value.status}
                      {"activeSessions" in value ? ` · ${value.activeSessions}` : ""}
                    </Badge>
                  </dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </CardContent>
    </Card>
  );
}
