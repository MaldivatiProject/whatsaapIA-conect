import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const CONNECTOR_ORIGIN = "http://localhost:3000";

const overviewPayload = {
  generated_at: "2026-07-13T12:00:00.000Z",
  range: {
    from: "2026-07-06T12:00:00.000Z",
    to: "2026-07-13T12:00:00.000Z",
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
      last_activity_at: "2026-07-13T12:00:00.000Z",
    },
  ],
  recent_messages: [
    {
      id: "execution-1",
      created_at: "2026-07-13T12:00:00.000Z",
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

async function mockConnector(page: import("@playwright/test").Page) {
  await page.route(`${CONNECTOR_ORIGIN}/sessions`, async (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "mi-sesion",
            status: "qr_ready",
            createdAt: "2026-07-08T21:27:54.257Z",
            updatedAt: "2026-07-08T22:46:27.065Z",
          },
        ]),
      });
    }
    return route.continue();
  });

  await page.route(`${CONNECTOR_ORIGIN}/sessions/mi-sesion/qr`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        qrCode: "2@fakepayload-for-e2e",
        expiresAt: new Date(Date.now() + 90_000).toISOString(),
      }),
    }),
  );

  await page.route(`${CONNECTOR_ORIGIN}/health`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "ok",
        info: {
          memory_heap: { status: "up" },
          whatsapp_sessions: { status: "up", activeSessions: 1 },
        },
      }),
    }),
  );

  await page.route("**/rules-api/api/v1/overview**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(overviewPayload),
    }),
  );
}

test.describe("whatsapp-dashboard", () => {
  test("redirects unauthenticated visitors to /login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: /whatsapp-dashboard/i })).toBeVisible();
  });

  test("login → overview → sessions → view QR (mocked backend)", async ({ page }) => {
    await mockConnector(page);

    await page.goto("/login");
    await page.getByLabel(/api key/i).fill("a-valid-looking-secret-key");
    await page.getByRole("button", { name: /ingresar/i }).click();

    await expect(page).toHaveURL(/\/$/, { timeout: 10_000 });
    await expect(page.getByText("ok")).toBeVisible();

    await page.getByRole("navigation").getByRole("link", { name: "Sesiones" }).click();
    await expect(page).toHaveURL(/\/sessions$/);
    await expect(page.getByText("mi-sesion")).toBeVisible();
    await expect(page.getByText("Esperando QR")).toBeVisible();
    await expect(page.getByText("qr_ready")).toHaveCount(0);

    await page.getByRole("button", { name: /acciones para mi-sesion/i }).click();
    await page.getByText("Ver QR", { exact: true }).click();

    const qrImage = page.getByAltText(/código qr para vincular la sesión mi-sesion/i);
    await expect(qrImage).toBeVisible();
    await expect(qrImage).toHaveAttribute("src", /^data:image/);
    await expect(page.getByText(/expira en \d+s/i)).toBeVisible();
  });

  test("rejects an invalid session id in the create-session dialog", async ({ page }) => {
    await mockConnector(page);
    await page.goto("/login");
    await page.getByLabel(/api key/i).fill("a-valid-looking-secret-key");
    await page.getByRole("button", { name: /ingresar/i }).click();
    await expect(page).toHaveURL(/\/$/, { timeout: 10_000 });

    await page.getByRole("navigation").getByRole("link", { name: "Sesiones" }).click();
    await page.getByRole("button", { name: /nueva sesión/i }).click();
    await page.getByLabel(/id de sesión/i).fill("no valido con espacios");
    await page.getByRole("button", { name: /^crear$/i }).click();

    await expect(page.getByRole("alert")).toContainText(/letras, números/i);
  });

  test("login page has no automatically detectable accessibility violations", async ({ page }) => {
    await page.goto("/login");
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  for (const path of ["/", "/sessions", "/messages", "/activity"]) {
    test(`${path} has no automatically detectable accessibility violations`, async ({ page }) => {
      await mockConnector(page);
      await page.goto("/login");
      await page.getByLabel(/api key/i).fill("a-valid-looking-secret-key");
      await page.getByRole("button", { name: /ingresar/i }).click();
      await expect(page).toHaveURL(/\/$/, { timeout: 10_000 });

      await page.goto(path);
      await page.waitForLoadState("networkidle");

      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
    });
  }
});
