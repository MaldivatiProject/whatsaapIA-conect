"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { useAuthStore } from "@/features/auth/store/authStore";
import { apiClient } from "@/shared/lib/api/apiClient";

export function LoginForm() {
  const router = useRouter();
  const setApiKey = useAuthStore((state) => state.setApiKey);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmed = value.trim();
    if (trimmed.length < 16) {
      setError("La API key debe tener al menos 16 caracteres.");
      return;
    }

    setIsVerifying(true);
    setApiKey(trimmed);
    try {
      await apiClient.get("/sessions");
      router.push("/");
    } catch {
      useAuthStore.getState().clear();
      setError("No se pudo autenticar con esa API key contra whatsapp-connector.");
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <div
          aria-hidden="true"
          className="mb-1 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"
        >
          <MessageCircle className="h-5 w-5" />
        </div>
        <h1 className="sr-only">Helpdesk</h1>
        <CardTitle aria-hidden="true" className="font-heading text-lg font-bold tracking-tight">
          Helpdesk
        </CardTitle>
        <CardDescription>
          Ingresá la API key (formato <code>secret</code> del owner) configurada en
          whatsapp-connector.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} noValidate>
        <CardContent className="space-y-2">
          <Label htmlFor="apiKey">API key</Label>
          <Input
            id="apiKey"
            type="password"
            autoComplete="off"
            required
            aria-required="true"
            aria-invalid={error ? "true" : "false"}
            aria-describedby={error ? "apiKey-error" : undefined}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="secret del owner"
          />
          {error && (
            <p id="apiKey-error" role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isVerifying}>
            {isVerifying ? "Verificando…" : "Ingresar"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
