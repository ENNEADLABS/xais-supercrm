"use client";

import { useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  useContentChecklist,
  useCreateChecklistItem,
  useUpdateChecklistItem,
  useDeleteChecklistItem,
} from "@/lib/hooks/useContentChecklist";

interface ChecklistPanelProps {
  contentPieceId: string;
}

/**
 * Checklist de production d'un contenu (cocher, ajouter, supprimer).
 */
export function ChecklistPanel({ contentPieceId }: ChecklistPanelProps) {
  const { data: items, isLoading } = useContentChecklist(contentPieceId);
  const createItem = useCreateChecklistItem();
  const updateItem = useUpdateChecklistItem();
  const deleteItem = useDeleteChecklistItem();
  const [label, setLabel] = useState("");

  const list = items ?? [];
  const doneCount = list.filter((i) => i.is_done).length;
  const pct = list.length > 0 ? Math.round((doneCount / list.length) * 100) : 0;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    await createItem.mutateAsync({ content_piece_id: contentPieceId, label });
    setLabel("");
  }

  return (
    <div className="space-y-3">
      {list.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {doneCount}/{list.length} terminé{doneCount > 1 ? "s" : ""}
            </span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : (
        list.length > 0 && (
          <ul className="divide-y rounded-lg border bg-card">
            {list.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                <button
                  type="button"
                  onClick={() =>
                    updateItem.mutate({
                      itemId: item.id,
                      contentPieceId,
                      input: { is_done: !item.is_done },
                    })
                  }
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded border",
                    item.is_done && "border-primary bg-primary text-primary-foreground",
                  )}
                  aria-label={item.is_done ? "Décocher" : "Cocher"}
                >
                  {item.is_done && <Check className="size-3" />}
                </button>
                <span
                  className={cn(
                    "flex-1 text-sm",
                    item.is_done && "text-muted-foreground line-through",
                  )}
                >
                  {item.label}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteItem.mutate({ itemId: item.id, contentPieceId })}
                  aria-label="Supprimer l'élément"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )
      )}

      <form onSubmit={handleAdd} className="flex gap-2">
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Ajouter un élément…"
        />
        <Button type="submit" size="icon" disabled={!label.trim() || createItem.isPending}>
          <Plus className="size-4" />
        </Button>
      </form>
    </div>
  );
}
