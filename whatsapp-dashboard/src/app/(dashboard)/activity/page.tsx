"use client";

import { Button } from "@/shared/components/ui/button";
import { useActivityStore } from "@/features/activity/store/activityStore";
import { ActivityFeed } from "@/features/activity/components/ActivityFeed";

export default function ActivityPage() {
  const clear = useActivityStore((state) => state.clear);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Actividad</h1>
          <p className="text-sm text-muted-foreground">
            Todos los eventos en tiempo real emitidos por whatsapp-connector.
          </p>
        </div>
        <Button variant="outline" onClick={clear}>
          Limpiar
        </Button>
      </div>
      <ActivityFeed emptyMessage="Sin eventos todavía. Creá o conectá una sesión para empezar a ver actividad." />
    </div>
  );
}
