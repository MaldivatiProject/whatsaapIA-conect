import { apiClient } from "@/shared/lib/api/apiClient";
import type { Session, SessionQr } from "@/shared/types/connector.types";

export const sessionsApi = {
  async list(): Promise<Session[]> {
    const { data } = await apiClient.get<Session[]>("/sessions");
    return data;
  },

  async create(sessionId: string): Promise<{ sessionId: string }> {
    const { data } = await apiClient.post<{ sessionId: string }>("/sessions", { sessionId });
    return data;
  },

  async getQr(sessionId: string): Promise<SessionQr> {
    const { data } = await apiClient.get<SessionQr>(`/sessions/${sessionId}/qr`);
    return data;
  },

  async disconnect(sessionId: string): Promise<void> {
    await apiClient.post(`/sessions/${sessionId}/disconnect`);
  },

  async remove(sessionId: string): Promise<void> {
    await apiClient.delete(`/sessions/${sessionId}`);
  },
};
