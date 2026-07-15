import { http, HttpResponse } from "msw";
import type { Session } from "@/shared/types/connector.types";

const BASE = "http://localhost:3000";
const now = new Date("2026-07-13T12:00:00.000Z");

const mockOverview = {
  generated_at: now.toISOString(),
  range: {
    from: "2026-07-06T12:00:00.000Z",
    to: now.toISOString(),
    bucket: "day",
  },
  totals: {
    processed_messages: 42,
    matched_messages: 36,
    unmatched_messages: 6,
    replies_sent_or_queued: 33,
    failed_replies: 2,
    pending_replies: 3,
    completed_messages: 37,
    unique_conversations: 18,
    active_sessions: 1,
    business_messages: 12,
    match_rate: 85.7,
    reply_rate: 78.6,
    failure_rate: 4.8,
  },
  comparison: {
    processed_messages: { current: 42, previous: 30, change: 12, change_percent: 40 },
    matched_messages: { current: 36, previous: 25, change: 11, change_percent: 44 },
    replies_sent_or_queued: { current: 33, previous: 21, change: 12, change_percent: 57.1 },
    failed_replies: { current: 2, previous: 3, change: -1, change_percent: -33.3 },
  },
  timeseries: Array.from({ length: 7 }).map((_, index) => ({
    bucket_start: new Date(Date.UTC(2026, 6, 7 + index, 12)).toISOString(),
    processed_messages: 4 + index,
    matched_messages: 3 + index,
    replies_sent_or_queued: 2 + index,
    failed_replies: index === 4 ? 1 : 0,
    completed_messages: 3 + index,
    pending_replies: index % 3 === 0 ? 1 : 0,
  })),
  statuses: [
    { status: "COMPLETED", messages: 37, replies_sent_or_queued: 33, percentage: 88.1 },
    { status: "ACTIONS_PENDING", messages: 3, replies_sent_or_queued: 0, percentage: 7.1 },
    { status: "FAILED", messages: 2, replies_sent_or_queued: 0, percentage: 4.8 },
  ],
  categories: [
    {
      category: "traslado_tienda",
      messages: 24,
      matched_messages: 24,
      replies_sent_or_queued: 22,
      failed_replies: 1,
      percentage: 57.1,
    },
  ],
  rules: [
    {
      rule_id: "rule-1",
      rule_name: "Traslados",
      category: "traslado_tienda",
      matches: 24,
      replies_sent_or_queued: 22,
      failed_replies: 1,
    },
  ],
  sessions: [
    {
      session_id: "mi-sesion",
      messages: 42,
      matched_messages: 36,
      replies_sent_or_queued: 33,
      failed_replies: 2,
      last_activity_at: now.toISOString(),
    },
  ],
  recent_messages: [
    {
      id: "execution-1",
      created_at: now.toISOString(),
      session_id: "mi-sesion",
      conversation_id: "573001112233@s.whatsapp.net",
      message_id: "message-1",
      status: "COMPLETED",
      message_type: "conversation",
      is_group: false,
      sender: "573001112233@s.whatsapp.net",
      raw_sender: "573001112233@s.whatsapp.net",
      matched_categories: ["traslado_tienda"],
      replies_sent_or_queued: 1,
    },
  ],
};

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

  http.get("/rules-api/api/v1/overview", () => HttpResponse.json(mockOverview)),
];
