import { type ReactElement } from "react";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/store/authStore";

export function renderWithProviders(ui: ReactElement) {
  useAuthStore.getState().setApiKey("test-api-key-1234567890");

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}
