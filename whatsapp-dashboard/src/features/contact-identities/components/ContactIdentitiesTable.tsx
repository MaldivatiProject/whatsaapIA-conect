"use client";

import { Pencil, Trash2 } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/shared/components/data/DataTable";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import type { ContactIdentity } from "@/features/contact-identities/types/contactIdentity.types";

interface ContactIdentitiesTableProps {
  identities: ContactIdentity[];
  onToggleEnabled: (id: string, enabled: boolean) => void;
  onEdit: (identity: ContactIdentity) => void;
  onDelete: (id: string) => void;
}

export function ContactIdentitiesTable({
  identities,
  onToggleEnabled,
  onEdit,
  onDelete,
}: ContactIdentitiesTableProps) {
  const columns: DataTableColumn<ContactIdentity>[] = [
    {
      id: "display_name",
      header: "Contacto",
      cell: (identity) => identity.display_name || "Sin nombre",
      exportValue: (identity) => identity.display_name || "Sin nombre",
      sortValue: (identity) => identity.display_name || "Sin nombre",
      cellClassName: "font-medium",
      pdfWidth: 130,
    },
    {
      id: "lid_jid",
      header: "LID entrante",
      cell: (identity) => identity.lid_jid,
      exportValue: (identity) => identity.lid_jid,
      sortValue: (identity) => identity.lid_jid,
      cellClassName: "font-mono text-xs text-muted-foreground",
      pdfWidth: 160,
    },
    {
      id: "phone_jid",
      header: "JID para responder",
      cell: (identity) => identity.phone_jid,
      exportValue: (identity) => identity.phone_jid,
      sortValue: (identity) => identity.phone_jid,
      cellClassName: "font-mono text-xs text-muted-foreground",
      pdfWidth: 160,
    },
    {
      id: "session_id",
      header: "Sesión",
      cell: (identity) => identity.session_id || "Todas",
      exportValue: (identity) => identity.session_id || "Todas",
      sortValue: (identity) => identity.session_id || "Todas",
      cellClassName: "text-muted-foreground",
      pdfWidth: 110,
    },
    {
      id: "enabled",
      header: "Estado",
      cell: (identity) => (
        <Badge variant={identity.enabled ? "success" : "outline"}>
          {identity.enabled ? "Activa" : "Inactiva"}
        </Badge>
      ),
      exportValue: (identity) => (identity.enabled ? "Activa" : "Inactiva"),
      sortValue: (identity) => identity.enabled,
      pdfWidth: 80,
    },
    {
      id: "actions",
      header: "Acciones",
      align: "right",
      exportable: false,
      cell: (identity) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onToggleEnabled(identity.id, !identity.enabled)}
          >
            {identity.enabled ? "Desactivar" : "Activar"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Editar identidad ${identity.lid_jid}`}
            onClick={() => onEdit(identity)}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Eliminar identidad ${identity.lid_jid}`}
            onClick={() => onDelete(identity.id)}
          >
            <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={identities}
      getRowKey={(identity) => identity.id}
      emptyMessage="No hay identidades configuradas todavía. Agregá un mapeo para que las reglas puedan reconocer remitentes que llegan como @lid."
      exportConfig={{ title: "Identidades", filename: "identidades" }}
    />
  );
}
