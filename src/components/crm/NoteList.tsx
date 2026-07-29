"use client";

import { useState } from "react";
import { MessageSquare, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { Note } from "@/types/database";

import { formatRelativeDate } from "./utils/format-date";

interface NoteListProps {
  notes: Note[];
  onAdd: (content: string) => void;
  onDelete?: (noteId: string) => void;
}

/**
 * Liste de notes avec formulaire d'ajout.
 * Affiche chaque note dans une Card avec date relative et auteur.
 */
export function NoteList({ notes, onAdd, onDelete }: NoteListProps) {
  const [content, setContent] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setContent("");
  }

  return (
    <div className="space-y-4">
      {/* Formulaire d'ajout */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Ajouter une note..."
          rows={3}
        />
        <Button type="submit" size="sm" disabled={!content.trim()}>
          <MessageSquare className="mr-1.5 size-4" />
          Ajouter une note
        </Button>
      </form>

      {/* Liste des notes */}
      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune note.</p>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <Card key={note.id} className="p-3">
              <p className="whitespace-pre-wrap text-sm">{note.content}</p>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {formatRelativeDate(note.created_at)} &middot; {note.author_id.slice(0, 8)}
                </span>
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(note.id)}
                    className="text-destructive hover:text-destructive/80"
                    aria-label="Supprimer la note"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
