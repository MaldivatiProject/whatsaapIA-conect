"use client";

import { MoreHorizontal, QrCode, Unplug, Trash2 } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/shared/components/data/DataTable";
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
  const columns: DataTableColumn<Session>[] = [
    {
      id: "id",
      header: "ID",
      cell: (session) => session.id,
      exportValue: (session) => session.id,
      sortValue: (session) => session.id,
      cellClassName: "font-medium",
      pdfWidth: 150,
    },
    {
      id: "status",
      header: "Estado",
      cell: (session) => (
        <Badge variant={sessionStatusVariant(session.status)}>
          {sessionStatusLabel(session.status)}
        </Badge>
      ),
      exportValue: (session) => sessionStatusLabel(session.status),
      sortValue: (session) => sessionStatusLabel(session.status),
      pdfWidth: 100,
    },
    {
      id: "createdAt",
      header: "Creada",
      cell: (session) => new Date(session.createdAt).toLocaleString(),
      exportValue: (session) => new Date(session.createdAt).toLocaleString(),
      sortValue: (session) => new Date(session.createdAt),
      cellClassName: "text-muted-foreground",
      pdfWidth: 130,
    },
    {
      id: "updatedAt",
      header: "Actualizada",
      cell: (session) => new Date(session.updatedAt).toLocaleString(),
      exportValue: (session) => new Date(session.updatedAt).toLocaleString(),
      sortValue: (session) => new Date(session.updatedAt),
      cellClassName: "text-muted-foreground",
      pdfWidth: 130,
    },
    {
      id: "actions",
      header: "Acciones",
      align: "right",
      exportable: false,
      cell: (session) => (
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
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={sessions}
      getRowKey={(session) => session.id}
      emptyMessage="No hay sesiones todavía. Creá una para empezar a vincular un número."
      exportConfig={{ title: "Sesiones", filename: "sesiones" }}
      pagination={{ pageSize: 10 }}
    />
  );
}
