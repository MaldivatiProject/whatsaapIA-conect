"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { z } from "zod";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import type {
  ContactIdentityFormValues,
  ContactIdentityInput,
} from "@/features/contact-identities/types/contactIdentity.types";

const formSchema = z.object({
  sessionId: z.string().max(64),
  lidJid: z
    .string()
    .regex(/^\d+@lid$/, "Formato esperado: 99132626702366@lid"),
  phoneJid: z
    .string()
    .regex(/^\d+@s\.whatsapp\.net$/, "Formato esperado: 573243744739@s.whatsapp.net"),
  displayName: z.string().max(160),
  enabled: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

const EMPTY_VALUES: ContactIdentityFormValues = {
  sessionId: "",
  lidJid: "",
  phoneJid: "",
  displayName: "",
  enabled: true,
};

function toInput(values: FormValues): ContactIdentityInput {
  return {
    session_id: values.sessionId.trim() || null,
    lid_jid: values.lidJid.trim(),
    phone_jid: values.phoneJid.trim(),
    display_name: values.displayName.trim() || null,
    enabled: values.enabled,
  };
}

function ContactIdentityForm({
  defaultValues,
  submitLabel,
  pendingLabel,
  isPending,
  onSubmit,
}: {
  defaultValues: ContactIdentityFormValues;
  submitLabel: string;
  pendingLabel: string;
  isPending: boolean;
  onSubmit: (input: ContactIdentityInput) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues });

  function submit(values: FormValues) {
    onSubmit(toInput(values));
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="identity-lid">LID entrante</Label>
        <Input id="identity-lid" placeholder="99132626702366@lid" {...register("lidJid")} />
        {errors.lidJid && (
          <p role="alert" className="text-sm text-destructive">
            {errors.lidJid.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="identity-phone">JID para responder</Label>
        <Input
          id="identity-phone"
          placeholder="573243744739@s.whatsapp.net"
          {...register("phoneJid")}
        />
        {errors.phoneJid && (
          <p role="alert" className="text-sm text-destructive">
            {errors.phoneJid.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="identity-session">Sesión opcional</Label>
        <Input id="identity-session" placeholder="test" {...register("sessionId")} />
        <p className="text-xs text-muted-foreground">
          Vacío aplica a todas las sesiones del tenant. Usá un valor si el alias cambia por sesión.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="identity-name">Nombre visible opcional</Label>
        <Input id="identity-name" placeholder="Cliente prueba" {...register("displayName")} />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...register("enabled")} />
        Activa
      </label>

      <DialogFooter className="pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? pendingLabel : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function ContactIdentityFormDialog({
  onCreate,
  isCreating,
}: {
  onCreate: (input: ContactIdentityInput) => void;
  isCreating: boolean;
}) {
  const [open, setOpen] = useState(false);

  function handleSubmit(input: ContactIdentityInput) {
    onCreate(input);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nueva identidad
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva identidad WhatsApp</DialogTitle>
          <DialogDescription>
            Mapea el remitente <code>@lid</code> que llega en eventos al JID telefónico usado para
            reglas y respuestas automáticas.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <ContactIdentityForm
            defaultValues={EMPTY_VALUES}
            submitLabel="Guardar identidad"
            pendingLabel="Guardando…"
            isPending={isCreating}
            onSubmit={handleSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export function EditContactIdentityDialog({
  open,
  onOpenChange,
  defaultValues,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues: ContactIdentityFormValues;
  onSave: (input: ContactIdentityInput) => void;
  isSaving: boolean;
}) {
  function handleSubmit(input: ContactIdentityInput) {
    onSave(input);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar identidad WhatsApp</DialogTitle>
          <DialogDescription>
            Los cambios aplican a los próximos mensajes que evalúe el backend.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <ContactIdentityForm
            defaultValues={defaultValues}
            submitLabel="Guardar cambios"
            pendingLabel="Guardando…"
            isPending={isSaving}
            onSubmit={handleSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

