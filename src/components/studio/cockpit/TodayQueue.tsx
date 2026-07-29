"use client";

import { CalendarRange } from "lucide-react";
import { formatShortDate } from "@/lib/utils/contentLabels";
import type { BoardPiece } from "@/types/database";
import { CockpitSection } from "./CockpitSection";

/** À produire cette semaine (par scheduled_date). */
export function TodayQueue({ items }: { items: BoardPiece[] }) {
  return (
    <CockpitSection
      title="À produire cette semaine"
      icon={CalendarRange}
      items={items}
      emptyLabel="Rien de planifié cette semaine."
      renderMeta={(p) =>
        p.scheduled_date ? <span>📅 {formatShortDate(p.scheduled_date)}</span> : null
      }
    />
  );
}
