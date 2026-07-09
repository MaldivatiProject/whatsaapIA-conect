import { http, HttpResponse } from "msw";
import type { Session } from "@/shared/types/connector.types";

const BASE = "http://localhost:3000";

export const mockSessions: Session[] = [
  {
    id: "mi-sesion",
    status: "qr_ready",
    createdAt: "2026-07-08T21:27:54.257Z",
    updatedAt: "2026-07-08T22:46:27.065Z",
  },
];

export const handlers = [
  http.get(`${BASE}/sessions`, () => HttpResponse.json(mockSessions)),

  http.post(`${BASE}/sessions`, async ({ request }) => {
    const body = (await request.json()) as { sessionId: string };
    return HttpResponse.json({ sessionId: body.sessionId }, { status: 201 });
  }),

  http.get(`${BASE}/sessions/:id/qr`, () =>
    HttpResponse.json({
      qrCode: "2@fakepayload",
      expiresAt: new Date(Date.now() + 90_000).toISOString(),
    }),
  ),

  http.post(`${BASE}/sessions/:id/disconnect`, () => new HttpResponse(null, { status: 204 })),

  http.delete(`${BASE}/sessions/:id`, () => new HttpResponse(null, { status: 204 })),

  http.post(`${BASE}/messages/send`, async ({ request }) => {
    const body = (await request.json()) as { sessionId: string; to: string };
    return HttpResponse.json({
      messageId: "3EB0FAKE",
      sessionId: body.sessionId,
      to: body.to,
      sentAt: new Date().toISOString(),
    });
  }),

  http.post(`${BASE}/messages/send-media`, async ({ request }) => {
    const body = (await request.json()) as { sessionId: string; to: string };
    return HttpResponse.json({
      messageId: "3EB0FAKEMEDIA",
      sessionId: body.sessionId,
      to: body.to,
      sentAt: new Date().toISOString(),
    });
  }),

  http.get(`${BASE}/health`, () =>
    HttpResponse.json({
      status: "ok",
      info: {
        memory_heap: { status: "up" },
        whatsapp_sessions: { status: "up", activeSessions: 1 },
      },
    }),
  ),

  http.get(`${BASE}/metrics`, () => new HttpResponse("# HELP fake_metric\nfake_metric 1\n")),
];
