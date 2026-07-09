"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { SessionSelect } from "@/entities/session/ui/SessionSelect";
import { useSendMessage } from "@/features/messages/hooks/useSendMessage";
import { JID_PATTERN, JID_FORMAT_HINT } from "@/features/messages/lib/jid";

export function SendMessageForm() {
  const { mutate, isPending } = useSendMessage();
  const [sessionId, setSessionId] = useState("");
  const [to, setTo] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!sessionId) {
      setError("Elegí una sesión.");
      return;
    }
    if (!JID_PATTERN.test(to.trim())) {
      setError(`El destino debe tener el formato ${JID_FORMAT_HINT}.`);
      return;
    }
    if (!text.trim()) {
      setError("El mensaje no puede estar vacío.");
      return;
    }

    mutate(
      { sessionId, to: to.trim(), text: text.trim() },
      { onSuccess: () => setText("") },
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      <SessionSelect id="send-text-session" value={sessionId} onChange={setSessionId} required />

      <div className="space-y-2">
        <Label htmlFor="send-text-to">Destino (JID)</Label>
        <Input
          id="send-text-to"
          required
          aria-required="true"
          placeholder="5491122334455@s.whatsapp.net"
          value={to}
          onChange={(event) => setTo(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="send-text-body">Mensaje</Label>
        <textarea
          id="send-text-body"
          required
          aria-required="true"
          maxLength={4096}
          rows={4}
          value={text}
          onChange={(event) => setText(event.target.value)}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Enviando…" : "Enviar mensaje"}
      </Button>
    </form>
  );
}
