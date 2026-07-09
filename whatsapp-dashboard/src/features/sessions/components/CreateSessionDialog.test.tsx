import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateSessionDialog } from "./CreateSessionDialog";

describe("CreateSessionDialog", () => {
  it("rejects an invalid session id (spaces) without calling onCreate", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(<CreateSessionDialog onCreate={onCreate} isCreating={false} />);

    await user.click(screen.getByRole("button", { name: /nueva sesión/i }));
    await user.type(screen.getByLabelText(/id de sesión/i), "mi sesion invalida");
    await user.click(screen.getByRole("button", { name: /^crear$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/letras, números/i);
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("submits a valid session id and closes the dialog", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(<CreateSessionDialog onCreate={onCreate} isCreating={false} />);

    await user.click(screen.getByRole("button", { name: /nueva sesión/i }));
    await user.type(screen.getByLabelText(/id de sesión/i), "mi-sesion-2");
    await user.click(screen.getByRole("button", { name: /^crear$/i }));

    expect(onCreate).toHaveBeenCalledWith("mi-sesion-2");
  });
});
