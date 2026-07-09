import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { QrDialog } from "./QrDialog";
import { renderWithProviders } from "../../../../tests/utils/renderWithProviders";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @next/next/no-img-element, jsx-a11y/alt-text
  default: (props: any) => <img {...props} />,
}));

function renderQrDialog(sessionId: string | null) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithProviders(
    <QueryClientProvider client={queryClient}>
      <QrDialog sessionId={sessionId} onOpenChange={() => {}} />
    </QueryClientProvider>,
  );
}

describe("QrDialog", () => {
  it("fetches the QR and renders it as a data:image", async () => {
    renderQrDialog("mi-sesion");

    const img = await waitFor(() => screen.getByAltText(/código qr para vincular la sesión mi-sesion/i), {
      timeout: 3000,
    });
    expect(img).toHaveAttribute("src", expect.stringMatching(/^data:image/));
  });

  it("shows a countdown until the QR expires", async () => {
    renderQrDialog("mi-sesion");
    await screen.findByText(/expira en \d+s/i, {}, { timeout: 3000 });
  });

  it("renders nothing when there's no sessionId", () => {
    renderQrDialog(null);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
