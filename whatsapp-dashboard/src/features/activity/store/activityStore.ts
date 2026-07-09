import { create } from "zustand";
import type { ConnectorEvent } from "@/shared/types/connector.types";

const MAX_EVENTS = 200;

interface ActivityState {
  events: ConnectorEvent[];
  push: (event: ConnectorEvent) => void;
  clear: () => void;
}

/** In-memory ring buffer of the most recent connector socket events, for the live activity feed. */
export const useActivityStore = create<ActivityState>((set) => ({
  events: [],
  push: (event) =>
    set((state) => ({
      events: [event, ...state.events].slice(0, MAX_EVENTS),
    })),
  clear: () => set({ events: [] }),
}));
