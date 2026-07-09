"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { messagesService } from "@/features/messages/services/messagesService";
import { ApiError } from "@/shared/lib/api/apiClient";
import type { SendMediaRequest, SendMessageRequest } from "@/shared/types/connector.types";

export function useSendMessage() {
  return useMutation({
    mutationFn: (request: SendMessageRequest) => messagesService.sendText(request),
    onSuccess: () => toast.success("Mensaje enviado"),
    onError: (error: ApiError) => toast.error("No se pudo enviar el mensaje", { description: error.message }),
  });
}

export function useSendMedia() {
  return useMutation({
    mutationFn: (request: SendMediaRequest) => messagesService.sendMedia(request),
    onSuccess: () => toast.success("Multimedia enviada"),
    onError: (error: ApiError) => toast.error("No se pudo enviar el archivo", { description: error.message }),
  });
}
