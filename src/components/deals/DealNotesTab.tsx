"use client";

import { Loader2 } from "lucide-react";

import { NoteList } from "@/components/crm";
import { useNotes, useCreateNote, useDeleteNote } from "@/lib/hooks/useNotes";

interface DealNotesTabProps {
  dealId: string;
}

/**
 * Onglet Notes : affiche et gère les notes du deal.
 */
export function DealNotesTab({ dealId }: DealNotesTabProps) {
  const { data: notes, isLoading } = useNotes("deal", dealId);
  const createNote = useCreateNote();
  const deleteNote = useDeleteNote();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <NoteList
      notes={notes ?? []}
      onAdd={(content) =>
        createNote.mutate({
          entity_type: "deal",
          entity_id: dealId,
          content,
        })
      }
      onDelete={(noteId) =>
        deleteNote.mutate({
          noteId,
          entityType: "deal",
          entityId: dealId,
        })
      }
    />
  );
}
