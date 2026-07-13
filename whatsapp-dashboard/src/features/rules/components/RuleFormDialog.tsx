"use client";

import { useState, type ChangeEvent } from "react";
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

const CLIENT_SIDE_MAX_SCRIPT_BYTES = 65_536;

const formSchema = z
  .object({
    name: z.string().min(1, "Requerido").max(160),
    category: z.string().max(80),
    priority: z.number().int("Debe ser un número entero").min(0).max(100_000),
    field: z.enum(["sender", "is_group", "text"]),
    senderValue: z.string(),
    isGroupValue: z.enum(["true", "false"]),
    textValue: z.string(),
    actionType: z.enum(["send_text", "run_script"]),
    replyText: z.string().max(4096),
    scriptSource: z.string(),
    scriptFileName: z.string(),
    ackText: z.string().max(4096),
  })
  .refine((v) => v.field !== "sender" || v.senderValue.trim().length > 0, {
    message: "Ingresá el JID del remitente",
    path: ["senderValue"],
  })
  .refine((v) => v.field !== "text" || v.textValue.trim().length > 0, {
    message: "Ingresá el texto a buscar",
    path: ["textValue"],
  })
  .refine((v) => v.actionType !== "send_text" || v.replyText.trim().length > 0, {
    message: "Requerido",
    path: ["replyText"],
  })
  .refine((v) => v.actionType !== "run_script" || v.scriptSource.trim().length > 0, {
    message: "Pegá o subí el código del script",
    path: ["scriptSource"],
  })
  .refine(
    (v) => new TextEncoder().encode(v.scriptSource).length <= CLIENT_SIDE_MAX_SCRIPT_BYTES,
    { message: "El script es demasiado grande (máx. 64 KB).", path: ["scriptSource"] },
  );

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

const ACTION_TYPE_LABELS: Record<"send_text" | "run_script", string> = {
  send_text: "Responder con un texto",
  run_script: "Ejecutar un script Python",
};

const EMPTY_VALUES: SimpleRuleFormValues = {
  name: "",
  category: "general",
  priority: 100,
  field: "sender",
  senderValue: "",
  isGroupValue: "true",
  textValue: "",
  actionType: "send_text",
  replyText: "",
  scriptSource: "",
  scriptFileName: "",
  ackText: "",
};

const DEFAULT_ACK_TEXT_PLACEHOLDER =
  "Recibimos tu solicitud, la estamos procesando. Te avisamos apenas termine.";

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
  const actionType = useWatch({ control, name: "actionType" });
  const scriptFileName = useWatch({ control, name: "scriptFileName" });
  const [scriptFileError, setScriptFileError] = useState<string | null>(null);

  function submit(values: FormValues) {
    onSubmit(buildCreateRuleInput(values));
  }

  async function handleScriptFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setScriptFileError(null);
    if (!file) return;

    const text = await file.text();
    if (new Blob([text]).size > CLIENT_SIDE_MAX_SCRIPT_BYTES) {
      setScriptFileError("El script es demasiado grande (máx. 64 KB).");
      event.target.value = "";
      return;
    }
    setValue("scriptSource", text, { shouldValidate: true });
    setValue("scriptFileName", file.name, { shouldValidate: true });
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
        <Label htmlFor="rule-priority">Orden de ejecución</Label>
        <Input
          id="rule-priority"
          type="number"
          step={1}
          min={0}
          max={100_000}
          {...register("priority", { valueAsNumber: true })}
        />
        <p className="text-xs text-muted-foreground">
          Cuando varias reglas coinciden con un mensaje, se evalúan de menor a mayor número. Por
          defecto 100.
        </p>
        {errors.priority && (
          <p role="alert" className="text-sm text-destructive">
            {errors.priority.message}
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
        <Label htmlFor="rule-action-type">Acción</Label>
        <Select
          value={actionType}
          onValueChange={(next) => setValue("actionType", next as "send_text" | "run_script")}
        >
          <SelectTrigger id="rule-action-type" className="h-8 w-full">
            <SelectValue>
              {(v: unknown) => ACTION_TYPE_LABELS[v as "send_text" | "run_script"]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="send_text">Responder con un texto</SelectItem>
            <SelectItem value="run_script">Ejecutar un script Python</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {actionType === "send_text" && (
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
      )}

      {actionType === "run_script" && (
        <div className="space-y-2">
          <Label htmlFor="rule-script">Script Python (define def handle(message):)</Label>
          <textarea
            id="rule-script"
            rows={16}
            spellCheck={false}
            placeholder={"def handle(message):\n    ...\n    return {\"reply_text\": \"...\"}"}
            {...register("scriptSource")}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-xs shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          />
          <div className="flex items-center gap-2">
            <Input
              id="rule-script-file"
              type="file"
              accept=".py"
              onChange={handleScriptFileChange}
              className="max-w-xs"
            />
            <p className="text-xs text-muted-foreground">o cargar desde un archivo .py</p>
          </div>
          {scriptFileName && (
            <p className="text-sm text-muted-foreground">Archivo cargado: {scriptFileName}</p>
          )}
          {scriptFileError && (
            <p role="alert" className="text-sm text-destructive">
              {scriptFileError}
            </p>
          )}
          {errors.scriptSource && (
            <p role="alert" className="text-sm text-destructive">
              {errors.scriptSource.message}
            </p>
          )}

          <div className="space-y-2 pt-2">
            <Label htmlFor="rule-ack-text">Mensaje inmediato (antes de correr el script)</Label>
            <textarea
              id="rule-ack-text"
              rows={2}
              maxLength={4096}
              placeholder={DEFAULT_ACK_TEXT_PLACEHOLDER}
              {...register("ackText")}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            />
            <p className="text-xs text-muted-foreground">
              Se envía apenas coincide la regla, sin esperar a que el script termine — así el
              usuario sabe que su solicitud ya está en curso. Dejalo vacío para usar el mensaje
              por defecto, o escribí <code>off</code> para no enviar ningún aviso. Podés usar{" "}
              <code>{"{{ category }}"}</code>, <code>{"{{ correo }}"}</code> (detectado
              automáticamente en el texto si hay un email),{" "}
              <code>{"{{ push_name }}"}</code> y <code>{"{{ text }}"}</code>.
            </p>
            {errors.ackText && (
              <p role="alert" className="text-sm text-destructive">
                {errors.ackText.message}
              </p>
            )}
          </div>
        </div>
      )}

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
      <DialogContent className="sm:max-w-xl">
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
      <DialogContent className="sm:max-w-xl">
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
