"use client";

import { useState, type ChangeEvent, type DragEvent, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FileCode, Info, SlidersHorizontal, UploadCloud, type LucideIcon } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { conditionFieldIcon } from "@/features/rules/lib/presentation";
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

export const EMPTY_RULE_FORM_VALUES: SimpleRuleFormValues = {
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

function FormSection({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <div className="space-y-3 rounded-lg border bg-background p-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {title}
      </div>
      {children}
    </div>
  );
}

interface RuleFormFieldsProps {
  defaultValues: SimpleRuleFormValues;
  submitLabel: string;
  pendingLabel: string;
  isPending: boolean;
  onSubmit: (input: CreateRuleInput) => void;
  /** When provided, renders a Cancel button next to submit (used by inline editing). */
  onCancel?: () => void;
}

export function RuleFormFields({
  defaultValues,
  submitLabel,
  pendingLabel,
  isPending,
  onSubmit,
  onCancel,
}: RuleFormFieldsProps) {
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
  const [isDraggingScript, setIsDraggingScript] = useState(false);

  function submit(values: FormValues) {
    onSubmit(buildCreateRuleInput(values));
  }

  async function loadScriptFile(file: File) {
    setScriptFileError(null);
    const text = await file.text();
    if (new Blob([text]).size > CLIENT_SIDE_MAX_SCRIPT_BYTES) {
      setScriptFileError("El script es demasiado grande (máx. 64 KB).");
      return;
    }
    setValue("scriptSource", text, { shouldValidate: true });
    setValue("scriptFileName", file.name, { shouldValidate: true });
  }

  async function handleScriptFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    await loadScriptFile(file);
  }

  async function handleScriptDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDraggingScript(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".py")) {
      setScriptFileError("Solo se aceptan archivos .py");
      return;
    }
    await loadScriptFile(file);
  }

  const ConditionIcon = conditionFieldIcon(field);

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="space-y-3">
      <FormSection icon={SlidersHorizontal} title="Información general">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
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
            {errors.priority && (
              <p role="alert" className="text-sm text-destructive">
                {errors.priority.message}
              </p>
            )}
          </div>
        </div>
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0">
            Cuando varias reglas coinciden con un mensaje, se evalúan de menor a mayor número de
            orden. Por defecto 100.
          </span>
        </p>
      </FormSection>

      <FormSection icon={ConditionIcon} title="Cuándo llega un mensaje donde…">
        <Select value={field} onValueChange={(next) => setValue("field", next as ConditionField)}>
          <SelectTrigger id="rule-field" className="h-8 w-full">
            <SelectValue>{(v: unknown) => FIELD_LABELS[v as ConditionField]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sender">el remitente es exactamente…</SelectItem>
            <SelectItem value="is_group">es un mensaje de grupo…</SelectItem>
            <SelectItem value="text">el texto contiene…</SelectItem>
          </SelectContent>
        </Select>

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
      </FormSection>

      <FormSection icon={actionType === "run_script" ? FileCode : SlidersHorizontal} title="Entonces">
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
              rows={14}
              spellCheck={false}
              placeholder={"def handle(message):\n    ...\n    return {\"reply_text\": \"...\"}"}
              {...register("scriptSource")}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-xs shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            />

            <label
              htmlFor="rule-script-file"
              onDragOver={(event) => {
                event.preventDefault();
                setIsDraggingScript(true);
              }}
              onDragLeave={() => setIsDraggingScript(false)}
              onDrop={handleScriptDrop}
              className={`flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground transition-colors ${
                isDraggingScript ? "border-primary bg-primary/5 text-foreground" : "border-input hover:bg-muted/50"
              }`}
            >
              <UploadCloud className="h-4 w-4 shrink-0" aria-hidden="true" />
              {scriptFileName ? (
                <span className="text-foreground">Archivo cargado: {scriptFileName}</span>
              ) : (
                <span>Arrastrá un archivo .py acá, o hacé click para elegirlo</span>
              )}
              <input
                id="rule-script-file"
                type="file"
                accept=".py"
                onChange={handleScriptFileChange}
                className="sr-only"
              />
            </label>
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
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="min-w-0">
                  Se envía apenas coincide la regla, sin esperar a que el script termine — así el
                  usuario sabe que su solicitud ya está en curso. Dejalo vacío para usar el mensaje
                  por defecto, o escribí <code>off</code> para no enviar ningún aviso. Podés usar{" "}
                  <code>{"{{ category }}"}</code>, <code>{"{{ correo }}"}</code> (detectado
                  automáticamente en el texto si hay un email),{" "}
                  <code>{"{{ push_name }}"}</code> y <code>{"{{ text }}"}</code>.
                </span>
              </p>
              {errors.ackText && (
                <p role="alert" className="text-sm text-destructive">
                  {errors.ackText.message}
                </p>
              )}
            </div>
          </div>
        )}
      </FormSection>

      <div className="flex justify-end gap-2 border-t pt-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={isPending}>
          {isPending ? pendingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}
