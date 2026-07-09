"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { buildCreateRuleInput } from "@/features/rules/lib/mapping";
import type { CreateRuleInput, ConditionField, SimpleRuleFormValues } from "@/features/rules/types/rule.types";

const formSchema = z
  .object({
    name: z.string().min(1, "Requerido").max(160),
    category: z.string().max(80),
    field: z.enum(["sender", "is_group", "text"]),
    senderValue: z.string(),
    isGroupValue: z.enum(["true", "false"]),
    textValue: z.string(),
    replyText: z.string().min(1, "Requerido").max(4096),
  })
  .refine((v) => v.field !== "sender" || v.senderValue.trim().length > 0, {
    message: "Ingresá el JID del remitente",
    path: ["senderValue"],
  })
  .refine((v) => v.field !== "text" || v.textValue.trim().length > 0, {
    message: "Ingresá el texto a buscar",
    path: ["textValue"],
  });

type FormValues = z.infer<typeof formSchema>;

const FIELD_LABELS: Record<ConditionField, string> = {
  sender: "el remitente es exactamente…",
  is_group: "es un mensaje de grupo…",
  text: "el texto contiene…",
};

const IS_GROUP_LABELS: Record<"true" | "false", string> = {
  true: "Sí, es un grupo",
  false: "No, es un chat individual",
};

const EMPTY_VALUES: SimpleRuleFormValues = {
  name: "",
  category: "general",
  field: "sender",
  senderValue: "",
  isGroupValue: "true",
  textValue: "",
  replyText: "",
};

function RuleFormFields({
  defaultValues,
  submitLabel,
  pendingLabel,
  isPending,
  onSubmit,
}: {
  defaultValues: SimpleRuleFormValues;
  submitLabel: string;
  pendingLabel: string;
  isPending: boolean;
  onSubmit: (input: CreateRuleInput) => void;
}) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues });
  const field = useWatch({ control, name: "field" }) as ConditionField;
  const isGroupValue = useWatch({ control, name: "isGroupValue" });

  function submit(values: FormValues) {
    onSubmit(buildCreateRuleInput(values));
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="rule-name">Nombre</Label>
        <Input id="rule-name" placeholder="Auto-respuesta soporte" {...register("name")} />
        {errors.name && (
          <p role="alert" className="text-sm text-destructive">
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="rule-category">Categoría para reportes</Label>
        <Input id="rule-category" placeholder="soporte, ventas, seguimiento…" {...register("category")} />
        {errors.category && (
          <p role="alert" className="text-sm text-destructive">
            {errors.category.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="rule-field">Cuando llega un mensaje donde…</Label>
        <Select
          value={field}
          onValueChange={(next) => setValue("field", next as ConditionField)}
        >
          <SelectTrigger id="rule-field" className="h-8 w-full">
            <SelectValue>{(v: unknown) => FIELD_LABELS[v as ConditionField]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sender">el remitente es exactamente…</SelectItem>
            <SelectItem value="is_group">es un mensaje de grupo…</SelectItem>
            <SelectItem value="text">el texto contiene…</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {field === "sender" && (
        <div className="space-y-2">
          <Label htmlFor="rule-sender">JID del remitente</Label>
          <Input
            id="rule-sender"
            placeholder="573243744739@s.whatsapp.net"
            {...register("senderValue")}
          />
          {errors.senderValue && (
            <p role="alert" className="text-sm text-destructive">
              {errors.senderValue.message}
            </p>
          )}
        </div>
      )}

      {field === "is_group" && (
        <div className="space-y-2">
          <Label htmlFor="rule-is-group">Valor</Label>
          <Select
            value={isGroupValue}
            onValueChange={(next) => setValue("isGroupValue", next as "true" | "false")}
          >
            <SelectTrigger id="rule-is-group" className="h-8 w-full">
              <SelectValue>{(v: unknown) => IS_GROUP_LABELS[v as "true" | "false"]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Sí, es un grupo</SelectItem>
              <SelectItem value="false">No, es un chat individual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {field === "text" && (
        <div className="space-y-2">
          <Label htmlFor="rule-text">Texto a buscar</Label>
          <Input id="rule-text" placeholder="cotización" {...register("textValue")} />
          {errors.textValue && (
            <p role="alert" className="text-sm text-destructive">
              {errors.textValue.message}
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="rule-reply">Responder con</Label>
        <textarea
          id="rule-reply"
          rows={3}
          maxLength={4096}
          placeholder="Hola {{ push_name }}, procesando tu solicitud…"
          {...register("replyText")}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
        />
        {errors.replyText && (
          <p role="alert" className="text-sm text-destructive">
            {errors.replyText.message}
          </p>
        )}
      </div>

      <DialogFooter className="pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? pendingLabel : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}

interface RuleFormDialogProps {
  onCreate: (input: CreateRuleInput) => void;
  isCreating: boolean;
}

export function RuleFormDialog({ onCreate, isCreating }: RuleFormDialogProps) {
  const [open, setOpen] = useState(false);

  function handleSubmit(input: CreateRuleInput) {
    onCreate(input);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nueva regla
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva regla de auto-respuesta</DialogTitle>
          <DialogDescription>
            Cuando llegue un mensaje que cumpla la condición, se responde automáticamente con el
            texto indicado. Podés usar <code>{"{{ sender }}"}</code>, <code>{"{{ push_name }}"}</code>{" "}
            y <code>{"{{ text }}"}</code> en la respuesta.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <RuleFormFields
            defaultValues={EMPTY_VALUES}
            submitLabel="Crear regla"
            pendingLabel="Creando…"
            isPending={isCreating}
            onSubmit={handleSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface EditRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues: SimpleRuleFormValues;
  onSave: (input: CreateRuleInput) => void;
  isSaving: boolean;
}

export function EditRuleDialog({ open, onOpenChange, defaultValues, onSave, isSaving }: EditRuleDialogProps) {
  function handleSubmit(input: CreateRuleInput) {
    onSave(input);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar regla</DialogTitle>
          <DialogDescription>
            Podés usar <code>{"{{ sender }}"}</code>, <code>{"{{ push_name }}"}</code> y{" "}
            <code>{"{{ text }}"}</code> en la respuesta.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <RuleFormFields
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
