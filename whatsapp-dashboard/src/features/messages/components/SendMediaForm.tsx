"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { SessionSelect } from "@/entities/session/ui/SessionSelect";
import { useSendMedia } from "@/features/messages/hooks/useSendMessage";
import { fileToBase64 } from "@/features/messages/lib/fileToBase64";
import { JID_PATTERN, JID_FORMAT_HINT } from "@/features/messages/lib/jid";

const CLIENT_SIDE_MAX_BYTES = 25 * 1024 * 1024;

export function SendMediaForm() {
  const { mutateAsync, isPending } = useSendMedia();
  const [sessionId, setSessionId] = useState("");
  const [to, setTo] = useState("");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!sessionId) return setError("Elegí una sesión.");
    if (!JID_PATTERN.test(to.trim())) {
      return setError(`El destino debe tener el formato ${JID_FORMAT_HINT}.`);
    }
    if (!file) return setError("Elegí un archivo.");
    if (file.size > CLIENT_SIDE_MAX_BYTES) {
      return setError("El archivo es demasiado grande para enviarlo desde el navegador.");
    }

    const data = await fileToBase64(file);
    await mutateAsync({
      sessionId,
      to: to.trim(),
      mimeType: file.type || "application/octet-stream",
      fileName: file.name,
      data,
      caption: caption.trim() || undefined,
    });
    setFile(null);
    setCaption("");
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      <SessionSelect id="send-media-session" value={sessionId} onChange={setSessionId} required />

      <div className="space-y-2">
        <Label htmlFor="send-media-to">Destino (JID)</Label>
        <Input
          id="send-media-to"
          required
          aria-required="true"
          placeholder="5491122334455@s.whatsapp.net"
          value={to}
          onChange={(event) => setTo(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="send-media-file">Archivo</Label>
        <Input
          id="send-media-file"
          type="file"
          required
          aria-required="true"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="send-media-caption">Descripción (opcional)</Label>
        <Input
          id="send-media-caption"
          maxLength={1024}
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Enviando…" : "Enviar archivo"}
      </Button>
    </form>
  );
}
