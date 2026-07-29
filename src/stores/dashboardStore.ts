import { create } from "zustand";

// Presets de periode
export const PERIOD_PRESETS = [
  { id: "7d", label: "7 jours", days: 7 },
  { id: "30d", label: "30 jours", days: 30 },
  { id: "90d", label: "90 jours", days: 90 },
  { id: "12m", label: "12 mois", days: 365 },
  { id: "ytd", label: "Année", days: 0 }, // calcule dynamiquement
] as const;

export type PeriodPresetId = (typeof PERIOD_PRESETS)[number]["id"];

interface DashboardStore {
  periodId: PeriodPresetId;
  setPeriod: (id: PeriodPresetId) => void;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  periodId: "30d",
  setPeriod: (periodId) => set({ periodId }),
}));
