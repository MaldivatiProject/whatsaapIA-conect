"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
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
  if (identities.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        No hay identidades configuradas todavía. Agregá un mapeo para que las reglas puedan
        reconocer remitentes que llegan como <code>@lid</code>.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Contacto</TableHead>
          <TableHead>LID entrante</TableHead>
          <TableHead>JID para responder</TableHead>
          <TableHead>Sesión</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {identities.map((identity) => (
          <TableRow key={identity.id}>
            <TableCell className="font-medium">{identity.display_name || "Sin nombre"}</TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">
              {identity.lid_jid}
            </TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">
              {identity.phone_jid}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {identity.session_id || "Todas"}
            </TableCell>
            <TableCell>
              <Badge variant={identity.enabled ? "success" : "outline"}>
                {identity.enabled ? "Activa" : "Inactiva"}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
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
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

