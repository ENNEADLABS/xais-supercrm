import { create } from "zustand";

interface SidebarStore {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  toggle: () => void;
  openMobile: () => void;
  closeMobile: () => void;
}

export const useSidebarStore = create<SidebarStore>((set) => ({
  isCollapsed: false,
  isMobileOpen: false,
  toggle: () =>
    set((state) => {
      const next = !state.isCollapsed;
      // Persister en localStorage
      try {
        localStorage.setItem("sidebar-collapsed", JSON.stringify(next));
      } catch {
        // SSR ou localStorage indisponible
      }
      return { isCollapsed: next };
    }),
  openMobile: () => set({ isMobileOpen: true }),
  closeMobile: () => set({ isMobileOpen: false }),
}));

// Initialiser depuis localStorage cote client
if (typeof window !== "undefined") {
  try {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored !== null) {
      useSidebarStore.setState({ isCollapsed: JSON.parse(stored) });
    }
  } catch {
    // Ignore
  }
}
