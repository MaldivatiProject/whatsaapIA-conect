import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SessionsTable } from "./SessionsTable";
import type { Session } from "@/shared/types/connector.types";

const sessions: Session[] = [
  {
    id: "mi-sesion",
    status: "qr_ready",
    createdAt: "2026-07-08T21:27:54.257Z",
    updatedAt: "2026-07-08T22:46:27.065Z",
  },
];

describe("SessionsTable", () => {
  it("shows an empty state when there are no sessions", () => {
    render(<SessionsTable sessions={[]} onViewQr={vi.fn()} onDisconnect={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText(/no hay sesiones todavía/i)).toBeInTheDocument();
  });

  it("renders the session id and a translated (non-raw) status badge", () => {
    render(<SessionsTable sessions={sessions} onViewQr={vi.fn()} onDisconnect={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("mi-sesion")).toBeInTheDocument();
    expect(screen.getByText("Esperando QR")).toBeInTheDocument();
    expect(screen.queryByText("qr_ready")).not.toBeInTheDocument();
  });

  it("calls onViewQr with the session id when 'Ver QR' is chosen from the row actions", async () => {
    const user = userEvent.setup();
    const onViewQr = vi.fn();
    render(<SessionsTable sessions={sessions} onViewQr={onViewQr} onDisconnect={vi.fn()} onDelete={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /acciones para mi-sesion/i }));
    await user.click(await screen.findByText("Ver QR"));

    expect(onViewQr).toHaveBeenCalledWith("mi-sesion");
  });

  it("calls onDelete with the session id when 'Eliminar' is chosen", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<SessionsTable sessions={sessions} onViewQr={vi.fn()} onDisconnect={vi.fn()} onDelete={onDelete} />);

    await user.click(screen.getByRole("button", { name: /acciones para mi-sesion/i }));
    await user.click(await screen.findByText("Eliminar"));

    expect(onDelete).toHaveBeenCalledWith("mi-sesion");
  });
});
