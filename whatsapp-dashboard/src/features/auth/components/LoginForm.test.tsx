import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { LoginForm } from "./LoginForm";
import { useAuthStore } from "@/features/auth/store/authStore";
import { server } from "../../../../tests/mocks/server";
import { render } from "@testing-library/react";

describe("LoginForm", () => {
  it("rejects a key shorter than 16 characters without calling the API", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/api key/i), "short");
    await user.click(screen.getByRole("button", { name: /ingresar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/al menos 16 caracteres/i);
    expect(useAuthStore.getState().apiKey).toBeNull();
  });

  it("stores the key and clears it again if the connector rejects it (401)", async () => {
    server.use(http.get("http://localhost:3000/sessions", () => new HttpResponse(null, { status: 401 })));
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/api key/i), "a-valid-looking-secret-key");
    await user.click(screen.getByRole("button", { name: /ingresar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/no se pudo autenticar/i);
    expect(useAuthStore.getState().apiKey).toBeNull();
  });

  it("stores the key on success", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/api key/i), "a-valid-looking-secret-key");
    await user.click(screen.getByRole("button", { name: /ingresar/i }));

    await screen.findByRole("button", { name: /ingresar/i }); // wait for pending state to resolve
    expect(useAuthStore.getState().apiKey).toBe("a-valid-looking-secret-key");
  });
});
