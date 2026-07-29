import type { PeriodPresetId } from "@/stores/dashboardStore";

export interface PeriodRange {
  startDate: string; // ISO date string
  endDate: string;
  prevStartDate: string;
  prevEndDate: string;
  granularity: "day" | "week" | "month";
}

/** Calcule les dates de debut/fin et periode precedente pour un preset */
export function computePeriodRange(periodId: PeriodPresetId): PeriodRange {
  const now = new Date();
  const endDate = now.toISOString();
  let startDate: Date;
  let prevStartDate: Date;
  let prevEndDate: Date;
  let granularity: PeriodRange["granularity"];

  if (periodId === "ytd") {
    startDate = new Date(now.getFullYear(), 0, 1);
    prevStartDate = new Date(now.getFullYear() - 1, 0, 1);
    prevEndDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    granularity = "month";
  } else {
    const daysMap: Record<string, number> = {
      "7d": 7,
      "30d": 30,
      "90d": 90,
      "12m": 365,
    };
    const days = daysMap[periodId] ?? 30;

    startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);

    prevEndDate = new Date(startDate);
    prevStartDate = new Date(prevEndDate);
    prevStartDate.setDate(prevStartDate.getDate() - days);

    granularity = days <= 30 ? "day" : days <= 90 ? "week" : "month";
  }

  return {
    startDate: startDate.toISOString(),
    endDate,
    prevStartDate: prevStartDate.toISOString(),
    prevEndDate: prevEndDate.toISOString(),
    granularity,
  };
}

/** Formate une date en cle de groupe selon la granularite */
export function toGroupKey(dateStr: string, granularity: PeriodRange["granularity"]): string {
  const d = new Date(dateStr);
  switch (granularity) {
    case "day":
      return d.toISOString().slice(0, 10); // "2026-03-28"
    case "week": {
      // Lundi de la semaine ISO
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d);
      monday.setDate(diff);
      return monday.toISOString().slice(0, 10);
    }
    case "month":
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
}

/** Genere toutes les cles de groupe entre deux dates */
export function generateGroupKeys(
  startDate: string,
  endDate: string,
  granularity: PeriodRange["granularity"],
): string[] {
  const keys: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  const current = new Date(start);
  while (current <= end) {
    const key = toGroupKey(current.toISOString(), granularity);
    if (!keys.includes(key)) keys.push(key);

    switch (granularity) {
      case "day":
        current.setDate(current.getDate() + 1);
        break;
      case "week":
        current.setDate(current.getDate() + 7);
        break;
      case "month":
        current.setMonth(current.getMonth() + 1);
        break;
    }
  }
  return keys;
}

/** Calcule la variation en pourcentage entre deux valeurs */
export function computeVariation(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/** Formate une cle de groupe en label lisible */
export function formatGroupLabel(key: string, granularity: PeriodRange["granularity"]): string {
  if (granularity === "month") {
    const [year, month] = key.split("-");
    const months = [
      "Jan",
      "Fév",
      "Mar",
      "Avr",
      "Mai",
      "Jun",
      "Jul",
      "Aoû",
      "Sep",
      "Oct",
      "Nov",
      "Déc",
    ];
    return `${months[parseInt(month) - 1]} ${year.slice(2)}`;
  }
  if (granularity === "week") {
    const d = new Date(key);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  }
  // day
  const d = new Date(key);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}
