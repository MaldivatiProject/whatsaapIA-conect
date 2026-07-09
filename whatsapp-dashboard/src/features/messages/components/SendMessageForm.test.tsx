import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SendMessageForm } from "./SendMessageForm";
import { renderWithProviders } from "../../../../tests/utils/renderWithProviders";

describe("SendMessageForm", () => {
  it("requires a session, a valid JID and non-empty text before submitting", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SendMessageForm />);

    await user.click(screen.getByRole("combobox", { name: /sesión/i }));
    await user.click(await screen.findByRole("option", { name: /mi-sesion/i }));
    await user.type(screen.getByLabelText(/destino/i), "not-a-jid");
    await user.type(screen.getByLabelText(/mensaje/i), "Hola");
    await user.click(screen.getByRole("button", { name: /enviar mensaje/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/s\.whatsapp\.net/i);
  });

  it("accepts a @lid destination (unresolved LID contact)", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SendMessageForm />);

    await user.click(screen.getByRole("combobox", { name: /sesión/i }));
    await user.click(await screen.findByRole("option", { name: /mi-sesion/i }));
    await user.type(screen.getByLabelText(/destino/i), "99132626702366@lid");
    await user.type(screen.getByLabelText(/mensaje/i), "Hola");
    await user.click(screen.getByRole("button", { name: /enviar mensaje/i }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("submits and clears the text field on success", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SendMessageForm />);

    await user.click(screen.getByRole("combobox", { name: /sesión/i }));
    await user.click(await screen.findByRole("option", { name: /mi-sesion/i }));
    await user.type(screen.getByLabelText(/destino/i), "5491122334455@s.whatsapp.net");
    await user.type(screen.getByLabelText(/mensaje/i), "Hola desde el test");
    await user.click(screen.getByRole("button", { name: /enviar mensaje/i }));

    const textarea = screen.getByLabelText(/mensaje/i) as HTMLTextAreaElement;
    await screen.findByDisplayValue("");
    expect(textarea.value).toBe("");
  });
});
