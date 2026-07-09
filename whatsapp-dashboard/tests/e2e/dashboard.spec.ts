import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const CONNECTOR_ORIGIN = "http://localhost:3000";

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
