"use client";

import { Loader2 } from "lucide-react";

import { NoteList } from "@/components/crm";
import { useNotes, useCreateNote, useDeleteNote } from "@/lib/hooks/useNotes";

interface ContactNotesTabProps {
  contactId: string;
}

/**
 * Onglet Notes : affiche et gère les notes du contact.
 */
export function ContactNotesTab({ contactId }: ContactNotesTabProps) {
  const { data: notes, isLoading } = useNotes("contact", contactId);
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
          entity_type: "contact",
          entity_id: contactId,
          content,
        })
      }
      onDelete={(noteId) =>
        deleteNote.mutate({
          noteId,
          entityType: "contact",
          entityId: contactId,
        })
      }
    />
  );
}
