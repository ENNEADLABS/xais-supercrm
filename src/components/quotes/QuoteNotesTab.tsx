"use client";

import { Loader2 } from "lucide-react";

import { NoteList } from "@/components/crm";
import { useNotes, useCreateNote, useDeleteNote } from "@/lib/hooks/useNotes";

interface QuoteNotesTabProps {
  quoteId: string;
}

/**
 * Onglet Notes : affiche et gère les notes du devis.
 */
export function QuoteNotesTab({ quoteId }: QuoteNotesTabProps) {
  const { data: notes, isLoading } = useNotes("quote", quoteId);
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
          entity_type: "quote",
          entity_id: quoteId,
          content,
        })
      }
      onDelete={(noteId) =>
        deleteNote.mutate({
          noteId,
          entityType: "quote",
          entityId: quoteId,
        })
      }
    />
  );
}
