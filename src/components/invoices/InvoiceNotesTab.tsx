"use client";

import { Loader2 } from "lucide-react";

import { NoteList } from "@/components/crm";
import { useNotes, useCreateNote, useDeleteNote } from "@/lib/hooks/useNotes";

interface InvoiceNotesTabProps {
  invoiceId: string;
}

/**
 * Onglet Notes : affiche et g\u00e8re les notes de la facture.
 */
export function InvoiceNotesTab({ invoiceId }: InvoiceNotesTabProps) {
  const { data: notes, isLoading } = useNotes("invoice", invoiceId);
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
          entity_type: "invoice",
          entity_id: invoiceId,
          content,
        })
      }
      onDelete={(noteId) =>
        deleteNote.mutate({
          noteId,
          entityType: "invoice",
          entityId: invoiceId,
        })
      }
    />
  );
}
