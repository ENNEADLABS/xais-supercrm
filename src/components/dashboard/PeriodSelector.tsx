"use client";

import { cn } from "@/lib/utils";
import { PERIOD_PRESETS, useDashboardStore } from "@/stores/dashboardStore";

export function PeriodSelector() {
  const { periodId, setPeriod } = useDashboardStore();

  return (
    <div className="flex gap-1 rounded-lg bg-muted p-1">
      {PERIOD_PRESETS.map((preset) => (
        <button
          key={preset.id}
          onClick={() => setPeriod(preset.id)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            periodId === preset.id
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
