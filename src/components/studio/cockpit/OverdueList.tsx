"use client";

import { AlertTriangle } from "lucide-react";
import { formatShortDate } from "@/lib/utils/contentLabels";
import type { BoardPiece } from "@/types/database";
import { CockpitSection } from "./CockpitSection";

/** Contenus en retard : date de publication dépassée, non terminés. */
export function OverdueList({ items }: { items: BoardPiece[] }) {
  return (
    <CockpitSection
      title="En retard"
      icon={AlertTriangle}
      items={items}
      emptyLabel="Aucun retard. 🎉"
      renderMeta={(p) =>
        p.scheduled_date ? (
          <span className="font-medium text-red-600">📅 {formatShortDate(p.scheduled_date)}</span>
        ) : null
      }
    />
  );
}
