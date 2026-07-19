"use client";

import { useState } from "react";
import {
  ContactIdentityFormDialog,
  EditContactIdentityDialog,
} from "@/features/contact-identities/components/ContactIdentityFormDialog";
import { ContactIdentitiesTable } from "@/features/contact-identities/components/ContactIdentitiesTable";
import { useContactIdentities } from "@/features/contact-identities/hooks/useContactIdentities";
import type {
  ContactIdentity,
  ContactIdentityFormValues,
} from "@/features/contact-identities/types/contactIdentity.types";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ErrorState } from "@/shared/components/layout/ErrorState";
import { ConfirmDialog } from "@/shared/components/layout/ConfirmDialog";
import { useConfirmDialog } from "@/shared/hooks/useConfirmDialog";

function toFormValues(identity: ContactIdentity): ContactIdentityFormValues {
  return {
    sessionId: identity.session_id ?? "",
    lidJid: identity.lid_jid,
    phoneJid: identity.phone_jid,
    displayName: identity.display_name ?? "",
    enabled: identity.enabled,
  };
}

export default function IdentitiesPage() {
  const {
    identities,
    isLoading,
    error,
    createIdentity,
    isCreating,
    updateIdentity,
    isUpdating,
    toggleEnabled,
    deleteIdentity,
  } = useContactIdentities();
  const [editingIdentity, setEditingIdentity] = useState<ContactIdentity | null>(null);
  const { confirm, confirmDialogProps } = useConfirmDialog();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Identidades WhatsApp</h1>
          <p className="text-sm text-muted-foreground">
            Mapeos configurables para resolver remitentes <code>@lid</code> hacia JIDs telefónicos.
          </p>
        </div>
        <ContactIdentityFormDialog onCreate={createIdentity} isCreating={isCreating} />
      </div>

      <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
        Si un evento llega como <code>99132626702366@lid</code>, acá lo vinculás con{" "}
        <code>573243744739@s.whatsapp.net</code>. Luego las reglas pueden usar el JID telefónico y
        el backend responderá a ese destino.
      </div>

      {isLoading && <Skeleton className="h-64 w-full" />}

      {error && <ErrorState message={`No se pudieron cargar las identidades: ${error.message}`} />}

      {!isLoading && !error && (
        <ContactIdentitiesTable
          identities={identities}
          onToggleEnabled={toggleEnabled}
          onEdit={setEditingIdentity}
          onDelete={async (id) => {
            const confirmed = await confirm({
              title: "Eliminar esta identidad",
              description: "Esta acción no se puede deshacer.",
              confirmLabel: "Eliminar",
              variant: "destructive",
            });
            if (confirmed) deleteIdentity(id);
          }}
        />
      )}

      {editingIdentity && (
        <EditContactIdentityDialog
          open={Boolean(editingIdentity)}
          onOpenChange={(open) => !open && setEditingIdentity(null)}
          defaultValues={toFormValues(editingIdentity)}
          isSaving={isUpdating}
          onSave={(input) => updateIdentity(editingIdentity.id, input)}
        />
      )}
      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}

