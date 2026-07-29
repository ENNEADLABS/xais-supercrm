"use client";

import Link from "next/link";
import { Draggable } from "@hello-pangea/dnd";
import { CalendarDays, ListChecks, Lock, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CONTENT_FORMAT_LABELS, PRIORITY_LABELS, formatShortDate } from "@/lib/utils/contentLabels";
import { boardSignals } from "@/lib/services/contentSignalsService";
import type { BoardPiece } from "@/types/database";

interface ContentCardProps {
  piece: BoardPiece;
  index: number;
}

const PRIORITY_BADGE: Record<BoardPiece["priority"], string> = {
  low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  urgent: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

/**
 * Carte d'un contenu dans le kanban editorial, wrappee dans un Draggable.
 */
export function ContentCard({ piece, index }: ContentCardProps) {
  const isOverdue =
    piece.scheduled_date != null &&
    piece.status !== "published" &&
    piece.status !== "archived" &&
    new Date(piece.scheduled_date) < new Date();

  const checklistPct =
    piece.checklist_total > 0
      ? Math.round((piece.checklist_done / piece.checklist_total) * 100)
      : null;

  // Signaux dérivables des champs de la pièce (overdue affiché inline ci-dessous).
  const signals = boardSignals(piece, new Date());

  return (
    <Draggable draggableId={piece.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className="mb-2"
        >
          <Card
            className={cn(
              "transition-shadow hover:shadow-md",
              snapshot.isDragging && "shadow-lg ring-2 ring-primary/20",
            )}
          >
            <CardContent className="space-y-1.5 p-3">
              <Link
                href={`/studio/content/${piece.id}`}
                className="line-clamp-2 text-sm font-medium hover:underline"
              >
                {piece.title}
              </Link>

              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary" className="text-xs">
                  {CONTENT_FORMAT_LABELS[piece.format]}
                </Badge>
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-medium",
                    PRIORITY_BADGE[piece.priority],
                  )}
                >
                  {PRIORITY_LABELS[piece.priority]}
                </span>
                {piece.is_blocked && (
                  <Badge
                    variant="destructive"
                    className="gap-1 text-[10px]"
                    title={piece.blocked_reason ?? undefined}
                  >
                    <Lock className="size-3" />
                    Bloqué
                  </Badge>
                )}
              </div>

              {signals.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {signals.map((s) => (
                    <span
                      key={s.type}
                      className="flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                    >
                      <AlertTriangle className="size-3" />
                      {s.label}
                    </span>
                  ))}
                </div>
              )}

              {checklistPct !== null && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <ListChecks className="size-3" />
                      {piece.checklist_done}/{piece.checklist_total}
                    </span>
                    <span>{checklistPct}%</span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${checklistPct}%` }}
                    />
                  </div>
                </div>
              )}

              {piece.scheduled_date && (
                <div
                  className={cn(
                    "flex items-center gap-1 text-xs",
                    isOverdue ? "text-red-600" : "text-muted-foreground",
                  )}
                >
                  <CalendarDays className="size-3" />
                  <span>{formatShortDate(piece.scheduled_date)}</span>
                  {isOverdue && <span className="font-medium">· en retard</span>}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </Draggable>
  );
}
