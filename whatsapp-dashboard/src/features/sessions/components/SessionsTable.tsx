"use client";

import { MoreHorizontal, QrCode, Unplug, Trash2 } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { sessionStatusLabel, sessionStatusVariant } from "@/entities/session/model/status";
import type { Session } from "@/shared/types/connector.types";

interface SessionsTableProps {
  sessions: Session[];
  onViewQr: (sessionId: string) => void;
  onDisconnect: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
}

export function SessionsTable({ sessions, onViewQr, onDisconnect, onDelete }: SessionsTableProps) {
  if (sessions.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        No hay sesiones todavía. Creá una para empezar a vincular un número.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Creada</TableHead>
          <TableHead>Actualizada</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sessions.map((session) => (
          <TableRow key={session.id}>
            <TableCell className="font-medium">{session.id}</TableCell>
            <TableCell>
              <Badge variant={sessionStatusVariant(session.status)}>
                {sessionStatusLabel(session.status)}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {new Date(session.createdAt).toLocaleString()}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {new Date(session.updatedAt).toLocaleString()}
            </TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon" aria-label={`Acciones para ${session.id}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onViewQr(session.id)} className="gap-2">
                    <QrCode className="h-4 w-4" aria-hidden="true" />
                    Ver QR
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDisconnect(session.id)} className="gap-2">
                    <Unplug className="h-4 w-4" aria-hidden="true" />
                    Desconectar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete(session.id)}
                    className="gap-2 text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
