import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useSessions } from "./useSessions";

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

describe("useSessions", () => {
  it("loads the sessions list from the connector API", async () => {
    const { result } = renderHook(() => useSessions(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.sessions).toEqual([
      expect.objectContaining({ id: "mi-sesion", status: "qr_ready" }),
    ]);
  });

  it("creates a session and refetches the list", async () => {
    const { result } = renderHook(() => useSessions(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    result.current.createSession("otra-sesion");

    await waitFor(() => expect(result.current.isCreating).toBe(false));
  });
});
