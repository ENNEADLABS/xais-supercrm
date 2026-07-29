"use client";

import { useState } from "react";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useDeliverables,
  useUpdateDeliverable,
  useDeleteDeliverable,
} from "@/lib/hooks/useDeliverables";
import {
  CONTENT_FORMAT_LABELS,
  DELIVERABLE_STATUS_OPTIONS,
  PUBLICATION_CHANNEL_OPTIONS,
} from "@/lib/utils/contentLabels";
import type { DeliverableStatus, PublicationChannel } from "@/types/database";
import { DeliverableCreateDialog } from "./DeliverableCreateDialog";

interface DeliverableListProps {
  contentPieceId: string;
}

const selectClass = "rounded-md border bg-background px-2 py-1 text-xs";

/**
 * Liste des livrables derives d'un contenu, avec creation et changement de statut.
 */
export function DeliverableList({ contentPieceId }: DeliverableListProps) {
  const { data: deliverables, isLoading } = useDeliverables(contentPieceId);
  const updateDeliverable = useUpdateDeliverable();
  const deleteDeliverable = useDeleteDeliverable();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          Nouveau livrable
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : (deliverables ?? []).length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Aucun livrable</p>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {(deliverables ?? []).map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium">{d.title}</span>
                  {d.published_url && (
                    <a href={d.published_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="size-3.5 text-muted-foreground" />
                    </a>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {CONTENT_FORMAT_LABELS[d.format]}
                </span>
              </div>

              <select
                value={d.channel ?? ""}
                onChange={(e) =>
                  updateDeliverable.mutate({
                    deliverableId: d.id,
                    contentPieceId,
                    input: { channel: (e.target.value || null) as PublicationChannel | null },
                  })
                }
                className={selectClass}
                aria-label="Canal de publication"
              >
                <option value="">Canal —</option>
                {PUBLICATION_CHANNEL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>

              <select
                value={d.status}
                onChange={(e) =>
                  updateDeliverable.mutate({
                    deliverableId: d.id,
                    contentPieceId,
                    input: { status: e.target.value as DeliverableStatus },
                  })
                }
                className={selectClass}
              >
                {DELIVERABLE_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>

              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-destructive"
                onClick={() => deleteDeliverable.mutate({ deliverableId: d.id, contentPieceId })}
                aria-label="Supprimer le livrable"
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <DeliverableCreateDialog contentPieceId={contentPieceId} open={open} onOpenChange={setOpen} />
    </div>
  );
}
