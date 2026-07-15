"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/shared/components/data/DataTable";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { BusinessMessageDetailDialog } from "@/features/business-messages/components/BusinessMessageDetailDialog";
import type { BusinessMessage } from "@/features/business-messages/types/businessMessage.types";

const SUCCESS_RESULTS = new Set(["GUARDADO", "YA_CORRECTA", "PROCESSED", "PARSED"]);
const FAILURE_RESULTS = new Set([
  "NO_ENCONTRADO",
  "TIENDA_NO_ENCONTRADA",
  "ERROR_GUARDADO",
  "ERROR",
  "SIN_EMAIL",
  "FAILED",
]);

function estadoVariant(estado: string): "success" | "destructive" | "outline" {
  if (SUCCESS_RESULTS.has(estado)) return "success";
  if (FAILURE_RESULTS.has(estado)) return "destructive";
  return "outline";
}

function estadoDe(message: BusinessMessage): string {
  const resultado = message.metadata["resultado"];
  return typeof resultado === "string" && resultado ? resultado : message.processing_status;
}

function resumenDetalle(message: BusinessMessage): string {
  const entries = Object.entries(message.metadata).filter(([key]) => key !== "resultado");
  if (entries.length === 0) return "—";
  return entries
    .slice(0, 4)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" · ");
}

function formatFecha(iso: string): string {
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(iso),
  );
}

interface BusinessMessagesTableProps {
  messages: BusinessMessage[];
  emptyMessage?: string;
}

export function BusinessMessagesTable({ messages, emptyMessage }: BusinessMessagesTableProps) {
  const [selected, setSelected] = useState<BusinessMessage | null>(null);
  const columns: DataTableColumn<BusinessMessage>[] = [
    {
      id: "received_at",
      header: "Fecha",
      cell: (message) => formatFecha(message.received_at),
      exportValue: (message) => formatFecha(message.received_at),
      sortValue: (message) => new Date(message.received_at),
      cellClassName: "text-muted-foreground",
      pdfWidth: 95,
    },
    {
      id: "business_category",
      header: "Categoría",
      cell: (message) => <Badge variant="outline">{message.business_category}</Badge>,
      exportValue: (message) => message.business_category,
      sortValue: (message) => message.business_category,
      pdfWidth: 95,
    },
    {
      id: "sender",
      header: "Remitente",
      cell: (message) => message.sender ?? "—",
      exportValue: (message) => message.sender ?? "",
      sortValue: (message) => message.sender ?? "",
      cellClassName: "font-mono text-xs text-muted-foreground",
      pdfWidth: 130,
    },
    {
      id: "status",
      header: "Estado",
      cell: (message) => {
        const estado = estadoDe(message);
        return <Badge variant={estadoVariant(estado)}>{estado}</Badge>;
      },
      exportValue: (message) => estadoDe(message),
      sortValue: (message) => estadoDe(message),
      pdfWidth: 95,
    },
    {
      id: "detail",
      header: "Detalle",
      cell: (message) => resumenDetalle(message),
      exportValue: (message) => resumenDetalle(message),
      sortValue: (message) => resumenDetalle(message),
      cellClassName: "max-w-96 truncate text-muted-foreground",
      pdfWidth: 260,
    },
    {
      id: "actions",
      header: "Acciones",
      align: "right",
      exportable: false,
      cell: (message) => (
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Ver detalle del mensaje de ${message.sender ?? "remitente desconocido"}`}
          onClick={() => setSelected(message)}
        >
          <Eye className="h-4 w-4" aria-hidden="true" />
        </Button>
      ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        rows={messages}
        getRowKey={(message) => message.id}
        emptyMessage={
          emptyMessage ??
          'No hay mensajes de negocio todavía. Van a aparecer acá cuando una regla con acción "Ejecutar script Python" devuelva datos estructurados.'
        }
        exportConfig={{ title: "Resultados", filename: "resultados" }}
        defaultSort={{ columnId: "received_at", direction: "desc" }}
        pagination={{ pageSize: 10 }}
      />
      <BusinessMessageDetailDialog
        message={selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </>
  );
}
