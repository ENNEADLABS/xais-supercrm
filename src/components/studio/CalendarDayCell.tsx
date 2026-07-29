"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { CONTENT_FORMAT_LABELS } from "@/lib/utils/contentLabels";
import type { CalendarEntry } from "@/lib/services/contentCalendarService";

interface CalendarDayCellProps {
  day: number;
  dateISO: string;
  todayISO: string;
  entries: CalendarEntry[];
}

/**
 * Cellule d'un jour dans la grille du calendrier editorial.
 */
export function CalendarDayCell({ day, dateISO, todayISO, entries }: CalendarDayCellProps) {
  const isToday = dateISO === todayISO;

  return (
    <div className="min-h-24 space-y-1 border-b border-r p-1.5">
      <span
        className={cn(
          "inline-flex size-6 items-center justify-center rounded-full text-xs",
          isToday && "bg-primary font-medium text-primary-foreground",
        )}
      >
        {day}
      </span>
      {entries.map((entry) => {
        const isOverdue =
          dateISO < todayISO && entry.status !== "published" && entry.status !== "archived";
        return (
          <Link
            key={`${entry.kind}-${entry.id}`}
            href={`/studio/content/${entry.content_piece_id}`}
            title={`${entry.title} · ${CONTENT_FORMAT_LABELS[entry.format]}`}
            className={cn(
              "block truncate rounded px-1.5 py-0.5 text-[11px] hover:opacity-80",
              entry.kind === "piece"
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground",
              isOverdue && "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
            )}
          >
            {entry.kind === "deliverable" ? "↳ " : ""}
            {entry.title}
          </Link>
        );
      })}
    </div>
  );
}
