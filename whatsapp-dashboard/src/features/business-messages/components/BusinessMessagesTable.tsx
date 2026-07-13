"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
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
}

export function BusinessMessagesTable({ messages }: BusinessMessagesTableProps) {
  const [selected, setSelected] = useState<BusinessMessage | null>(null);

  if (messages.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        No hay mensajes de negocio todavía. Van a aparecer acá cuando una regla con acción
        &quot;Ejecutar script Python&quot; devuelva datos estructurados (ej. un resultado de
        traslado de tienda).
      </p>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead>Remitente</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Detalle</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {messages.map((message) => {
            const estado = estadoDe(message);
            return (
              <TableRow key={message.id}>
                <TableCell className="text-muted-foreground">
                  {formatFecha(message.received_at)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{message.business_category}</Badge>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {message.sender ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={estadoVariant(estado)}>{estado}</Badge>
                </TableCell>
                <TableCell
                  className="max-w-96 truncate text-muted-foreground"
                  title={resumenDetalle(message)}
                >
                  {resumenDetalle(message)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Ver detalle del mensaje de ${message.sender ?? "remitente desconocido"}`}
                    onClick={() => setSelected(message)}
                  >
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <BusinessMessageDetailDialog
        message={selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </>
  );
}
