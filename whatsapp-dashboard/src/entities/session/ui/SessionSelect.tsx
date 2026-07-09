"use client";

import { useSessionsQuery } from "@/entities/session/model/useSessionsQuery";
import { sessionStatusLabel } from "@/entities/session/model/status";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

interface SessionSelectProps {
  id: string;
  value: string;
  onChange: (sessionId: string) => void;
  required?: boolean;
}

export function SessionSelect({ id, value, onChange, required }: SessionSelectProps) {
  const { data: sessions = [], isLoading } = useSessionsQuery();
  const placeholder = isLoading ? "Cargando sesiones…" : "Seleccioná una sesión";

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Sesión</Label>
      <Select
        value={value || null}
        onValueChange={(next) => onChange(next as string)}
        disabled={isLoading}
        required={required}
      >
        <SelectTrigger id={id} className="h-8 w-full">
          <SelectValue>
            {(v: unknown) => {
              const session = sessions.find((s) => s.id === v);
              return session ? `${session.id} — ${sessionStatusLabel(session.status)}` : placeholder;
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {sessions.map((session) => (
            <SelectItem key={session.id} value={session.id}>
              {session.id} — {sessionStatusLabel(session.status)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
