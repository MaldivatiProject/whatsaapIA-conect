"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { EMPTY_RULE_FORM_VALUES, RuleFormFields } from "@/features/rules/components/RuleFormFields";
import type { CreateRuleInput } from "@/features/rules/types/rule.types";

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
          <Button className="gap-2 rounded-md">
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
            defaultValues={EMPTY_RULE_FORM_VALUES}
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
