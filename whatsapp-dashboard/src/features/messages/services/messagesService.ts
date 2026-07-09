import { apiClient } from "@/shared/lib/api/apiClient";
import type {
  SendMediaRequest,
  SendMessageRequest,
  SendMessageResponse,
} from "@/shared/types/connector.types";

export const messagesService = {
  async sendText(request: SendMessageRequest): Promise<SendMessageResponse> {
    const { data } = await apiClient.post<SendMessageResponse>("/messages/send", request);
    return data;
  },

  async sendMedia(request: SendMediaRequest): Promise<SendMessageResponse> {
    const { data } = await apiClient.post<SendMessageResponse>("/messages/send-media", request);
    return data;
  },
};
