"use client";

import { cn } from "@/lib/utils";

interface ProgressBarProps {
  stepIndex: number;
  totalSteps: number;
}

const STEP_LABELS = ["Bienvenue", "Société", "Commercial", "Terminé"];

export function ProgressBar({ stepIndex, totalSteps }: ProgressBarProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-muted-foreground">
        {STEP_LABELS.map((label, i) => (
          <span key={label} className={cn(i <= stepIndex && "font-medium text-foreground")}>
            {label}
          </span>
        ))}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
        />
      </div>
    </div>
  );
}
