"use client";

import { Plus } from "lucide-react";
import { Droppable } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CONTENT_STATUS_COLORS, CONTENT_STATUS_LABELS } from "@/lib/utils/contentLabels";
import { ContentCard } from "./ContentCard";
import type { BoardPiece, ContentStatus } from "@/types/database";

interface StudioBoardColumnProps {
  status: ContentStatus;
  pieces: BoardPiece[];
  onAddPiece?: (status: ContentStatus) => void;
}

/**
 * Colonne du kanban editorial : zone droppable d'un statut de contenu.
 */
export function StudioBoardColumn({ status, pieces, onAddPiece }: StudioBoardColumnProps) {
  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg border bg-muted/30">
      <div className="flex items-center justify-between border-b p-3">
        <div className="flex items-center gap-2">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: CONTENT_STATUS_COLORS[status] }}
            aria-hidden="true"
          />
          <span className="text-sm font-semibold">{CONTENT_STATUS_LABELS[status]}</span>
          <span className="rounded-full bg-muted px-1.5 text-xs text-muted-foreground">
            {pieces.length}
          </span>
        </div>
        {onAddPiece && (
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => onAddPiece(status)}
            aria-label={`Ajouter un contenu dans ${CONTENT_STATUS_LABELS[status]}`}
          >
            <Plus className="size-4" />
          </Button>
        )}
      </div>

      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 overflow-y-auto p-2",
              "min-h-[120px]",
              snapshot.isDraggingOver && "bg-primary/5",
            )}
          >
            {pieces.map((piece, index) => (
              <ContentCard key={piece.id} piece={piece} index={index} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
