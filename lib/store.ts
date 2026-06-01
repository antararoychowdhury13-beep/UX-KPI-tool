// Global client state (Zustand). Skeleton only — slices are added per feature in Milestone 1+.
import { create } from "zustand";

interface AppState {
  /** Currently selected project id in the dashboard flow. */
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeProjectId: null,
  setActiveProjectId: (id) => set({ activeProjectId: id }),
}));
