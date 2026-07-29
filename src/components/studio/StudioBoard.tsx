"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { Loader2, Plus, Lightbulb, CalendarDays, LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBoardPieces, useMoveContentPiece } from "@/lib/hooks/useContentPieces";
import { CONTENT_STATUS_ORDER } from "@/lib/utils/contentLabels";
import { StudioBoardColumn } from "./StudioBoardColumn";
import { ContentPieceCreateDialog } from "./ContentPieceCreateDialog";
import { CreateFromTemplateDialog } from "./CreateFromTemplateDialog";
import type { BoardPiece, ContentStatus } from "@/types/database";

/**
 * Kanban editorial : 9 colonnes de statut, drag & drop avec optimistic update.
 */
export function StudioBoard() {
  const { data: pieces, isLoading } = useBoardPieces();
  const movePiece = useMoveContentPiece();
  const [createOpen, setCreateOpen] = useState(false);
  const [createStatus, setCreateStatus] = useState<ContentStatus | undefined>();
  const [templateOpen, setTemplateOpen] = useState(false);

  // Regroupe la liste plate par statut (colonnes), triee par position.
  const piecesByStatus = useMemo(() => {
    const grouped: Record<ContentStatus, BoardPiece[]> = {
      idea: [],
      research: [],
      script: [],
      recording: [],
      editing: [],
      review: [],
      scheduled: [],
      published: [],
      archived: [],
    };
    for (const piece of pieces ?? []) {
      grouped[piece.status].push(piece);
    }
    for (const status of CONTENT_STATUS_ORDER) {
      grouped[status].sort((a, b) => a.position - b.position);
    }
    return grouped;
  }, [pieces]);

  const onDragEnd = useCallback(
    (result: DropResult) => {
      const { source, destination, draggableId } = result;
      if (!destination) return;
      if (source.droppableId === destination.droppableId && source.index === destination.index) {
        return;
      }
      movePiece.mutate({
        pieceId: draggableId,
        input: {
          status: destination.droppableId as ContentStatus,
          position: destination.index,
        },
      });
    },
    [movePiece],
  );

  const handleAddPiece = useCallback((status: ContentStatus) => {
    setCreateStatus(status);
    setCreateOpen(true);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Studio éditorial</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" render={<Link href="/studio/ideas" />}>
            <Lightbulb className="size-4" />
            Idées
          </Button>
          <Button variant="outline" render={<Link href="/studio/calendar" />}>
            <CalendarDays className="size-4" />
            Calendrier
          </Button>
          <Button variant="outline" render={<Link href="/studio/templates" />}>
            <LayoutTemplate className="size-4" />
            Templates
          </Button>
          <Button variant="outline" onClick={() => setTemplateOpen(true)}>
            <LayoutTemplate className="size-4" />
            Depuis template
          </Button>
          <Button
            onClick={() => {
              setCreateStatus(undefined);
              setCreateOpen(true);
            }}
          >
            <Plus className="size-4" />
            Nouveau contenu
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {CONTENT_STATUS_ORDER.map((status) => (
              <StudioBoardColumn
                key={status}
                status={status}
                pieces={piecesByStatus[status]}
                onAddPiece={handleAddPiece}
              />
            ))}
          </div>
        </DragDropContext>
      )}

      <ContentPieceCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultStatus={createStatus}
      />
      <CreateFromTemplateDialog open={templateOpen} onOpenChange={setTemplateOpen} />
    </div>
  );
}
