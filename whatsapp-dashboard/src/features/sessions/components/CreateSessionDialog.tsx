"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";
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

const createSessionSchema = z.object({
  sessionId: z
    .string()
    .min(1, "Requerido")
    .max(64, "Máximo 64 caracteres")
    .regex(/^[a-zA-Z0-9_-]+$/, "Solo letras, números, guiones y guiones bajos"),
});

type CreateSessionForm = z.infer<typeof createSessionSchema>;

interface CreateSessionDialogProps {
  onCreate: (sessionId: string) => void;
  isCreating: boolean;
}

export function CreateSessionDialog({ onCreate, isCreating }: CreateSessionDialogProps) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateSessionForm>({ resolver: zodResolver(createSessionSchema) });

  function onSubmit(values: CreateSessionForm) {
    onCreate(values.sessionId);
    reset();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nueva sesión
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear sesión de WhatsApp</DialogTitle>
          <DialogDescription>
            Elegí un identificador único. Vas a poder vincularla escaneando un QR en el paso
            siguiente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-2">
          <Label htmlFor="sessionId">ID de sesión</Label>
          <Input
            id="sessionId"
            autoComplete="off"
            required
            aria-required="true"
            aria-invalid={errors.sessionId ? "true" : "false"}
            aria-describedby={errors.sessionId ? "sessionId-error" : undefined}
            placeholder="mi-sesion"
            {...register("sessionId")}
          />
          {errors.sessionId && (
            <p id="sessionId-error" role="alert" className="text-sm text-destructive">
              {errors.sessionId.message}
            </p>
          )}
          <DialogFooter className="pt-2">
            <Button type="submit" disabled={isCreating}>
              {isCreating ? "Creando…" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
