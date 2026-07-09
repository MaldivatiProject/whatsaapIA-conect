import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface AuthState {
  apiKey: string | null;
  setApiKey: (apiKey: string) => void;
  clear: () => void;
}

/**
 * apiKey lives in sessionStorage (not localStorage): it grants full owner-scoped
 * access to whatsapp-connector, so it should not outlive the browser tab.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      apiKey: null,
      setApiKey: (apiKey) => set({ apiKey }),
      clear: () => set({ apiKey: null }),
    }),
    {
      name: "whatsapp-dashboard-auth",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? window.sessionStorage
          : (({
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            } as unknown) as Storage),
      ),
    },
  ),
);
