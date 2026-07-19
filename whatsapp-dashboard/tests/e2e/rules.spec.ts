import { test, expect, type Page } from "@playwright/test";

const CONNECTOR_ORIGIN = "http://localhost:3000";

const rule1 = {
  id: "rule-1",
  tenant_id: "t1",
  name: "Auto-respuesta soporte",
  description: null,
  category: "soporte",
  session_id: null,
  priority: 100,
  enabled: true,
  stop_on_match: false,
  version: 1,
  conditions: [{ field: "text", operator: "contains", value: "cotización" }],
  actions: [{ type: "send_text", params: { text: "Hola {{ push_name }}, ya te cotizamos." } }],
  created_at: "2026-07-01T00:00:00.000Z",
  deleted_at: null,
};

const rule2 = {
  id: "rule-2",
  tenant_id: "t1",
  name: "Traslado con script",
  description: null,
  category: "traslado_tienda",
  session_id: null,
  priority: 50,
  enabled: true,
  stop_on_match: false,
  version: 1,
  conditions: [{ field: "sender", operator: "equals", value: "573001112233@s.whatsapp.net" }],
  actions: [
    {
      type: "run_script",
      params: { script: 'def handle(message):\n    return {"reply_text": "ok"}', ack_text: "Procesando..." },
    },
  ],
  created_at: "2026-07-01T00:00:00.000Z",
  deleted_at: null,
};

async function mockLogin(page: Page) {
  await page.route(`${CONNECTOR_ORIGIN}/sessions`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) }),
  );
}

/** Serves an in-memory rules list from the mocked whatsaap-backend API, applying
 * PATCH updates so the UI's optimistic refetch reflects what was actually saved. */
async function mockRulesApi(page: Page) {
  let rules = [rule1, rule2];
  const patchRequests: Array<{ id: string; body: Record<string, unknown> }> = [];
  const deletedIds: string[] = [];

  await page.route("**/rules-api/api/v1/rules", (route) => {
    if (route.request().method() !== "GET") return route.continue();
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(rules) });
  });

  await page.route("**/rules-api/api/v1/rules/*", (route) => {
    const request = route.request();
    const id = request.url().split("/").pop() ?? "";

    // This mock hard-removes on DELETE (see below) rather than modeling the
    // backend's soft-delete, so there's never anything to list as deleted.
    if (request.method() === "GET" && id === "deleted") {
      return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    }
    if (request.method() === "PATCH") {
      const body = request.postDataJSON() as Record<string, unknown>;
      patchRequests.push({ id, body });
      rules = rules.map((rule) => (rule.id === id ? { ...rule, ...body } : rule));
      const updated = rules.find((rule) => rule.id === id);
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(updated) });
    }
    if (request.method() === "DELETE") {
      deletedIds.push(id);
      rules = rules.filter((rule) => rule.id !== id);
      return route.fulfill({ status: 204 });
    }
    return route.continue();
  });

  return { patchRequests, deletedIds };
}

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/api key/i).fill("a-valid-looking-secret-key");
  await page.getByRole("button", { name: /ingresar/i }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 10_000 });
}

test.describe("rules — inline row detail", () => {
  test("expands into the table instead of a modal, edits and saves inline", async ({ page }) => {
    const { patchRequests } = await mockRulesApi(page);
    await mockLogin(page);
    await login(page);

    await page.goto("/rules");
    await expect(page.getByText("Auto-respuesta soporte")).toBeVisible();

    // No pencil/edit icon button in the actions column anymore.
    await expect(page.getByRole("button", { name: /^editar regla/i })).toHaveCount(0);

    const detailPanel = page.locator('tr[data-state="selected"]');

    // "Ver detalle" lives in the row's "Acciones" (⋮) menu, not a standalone button.
    async function toggleDetail(ruleName: string) {
      await page.getByRole("button", { name: new RegExp(`acciones para ${ruleName}`, "i") }).click();
      await page.getByRole("menuitem", { name: /ver detalle/i }).click();
    }

    await expect(detailPanel).toHaveCount(0);
    await toggleDetail("Auto-respuesta soporte");
    await expect(detailPanel.getByText("Hola {{ push_name }}, ya te cotizamos.", { exact: true })).toBeVisible();

    // Expanding a different row collapses the first one (accordion behavior).
    await toggleDetail("Traslado con script");
    await expect(detailPanel.getByText("Script Python")).toBeVisible();
    await expect(detailPanel.locator("pre", { hasText: "def handle(message)" })).toBeVisible();

    // Choosing "Ver detalle" again on the same row collapses it.
    await toggleDetail("Traslado con script");
    await expect(detailPanel).toHaveCount(0);

    // Edit flow: expand, edit, cancel discards without saving.
    await toggleDetail("Auto-respuesta soporte");
    await detailPanel.getByRole("button", { name: "Editar" }).click();
    const nameInput = detailPanel.getByLabel("Nombre", { exact: true });
    await expect(nameInput).toHaveValue("Auto-respuesta soporte");

    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(nameInput).toHaveCount(0);
    await expect(detailPanel.getByText("Hola {{ push_name }}, ya te cotizamos.", { exact: true })).toBeVisible();

    // Edit flow: expand, edit, save persists via PATCH and updates the row.
    await detailPanel.getByRole("button", { name: "Editar" }).click();
    await detailPanel.getByLabel("Nombre", { exact: true }).fill("Auto-respuesta soporte (editado)");
    await page.getByRole("button", { name: "Guardar cambios" }).click();

    await expect(page.getByText("Auto-respuesta soporte (editado)")).toBeVisible();
    expect(patchRequests).toHaveLength(1);
    expect(patchRequests[0]).toMatchObject({ id: "rule-1", body: { name: "Auto-respuesta soporte (editado)" } });
  });

  test("row actions menu toggles enabled state and deletes", async ({ page }) => {
    const { patchRequests, deletedIds } = await mockRulesApi(page);
    await mockLogin(page);
    await login(page);

    await page.goto("/rules");
    await expect(page.getByText("Auto-respuesta soporte")).toBeVisible();

    await page.getByRole("button", { name: /acciones para auto-respuesta soporte/i }).click();
    await page.getByRole("menuitem", { name: /desactivar/i }).click();
    await expect(page.getByText("Inactiva")).toBeVisible();
    expect(patchRequests).toContainEqual({ id: "rule-1", body: { enabled: false } });

    await page.getByRole("button", { name: /acciones para auto-respuesta soporte/i }).click();
    await page.getByRole("menuitem", { name: /eliminar/i }).click();
    // Deleting goes through the themed ConfirmDialog, not a native window.confirm().
    await page.getByRole("alertdialog").getByRole("button", { name: "Eliminar" }).click();
    await expect(page.getByText("Auto-respuesta soporte")).toHaveCount(0);
    expect(deletedIds).toContain("rule-1");
  });
});
