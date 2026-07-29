"use client";

import { cn } from "@/lib/utils";
import { useDeliverables } from "@/lib/hooks/useDeliverables";
import {
  CONTENT_FORMAT_LABELS,
  DELIVERABLE_STATUS_LABELS,
  PUBLICATION_CHANNEL_LABELS,
} from "@/lib/utils/contentLabels";
import type { ContentFormat, DeliverableStatus, PublicationChannel } from "@/types/database";

interface RepurposingMatrixProps {
  contentPieceId: string;
}

const STATUS_COLUMNS: DeliverableStatus[] = [
  "planned",
  "draft",
  "ready",
  "scheduled",
  "published",
  "cancelled",
];

/**
 * Matrice de repurposing : livrables d'un contenu croises format x statut.
 */
export function RepurposingMatrix({ contentPieceId }: RepurposingMatrixProps) {
  const { data: deliverables } = useDeliverables(contentPieceId);
  const items = deliverables ?? [];

  if (items.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Aucun livrable à croiser pour le moment.
      </p>
    );
  }

  // Compte par (format, statut) + canaux distincts par format.
  const counts = new Map<string, number>();
  const formats = new Set<ContentFormat>();
  const channelsByFormat = new Map<ContentFormat, Set<PublicationChannel>>();
  for (const d of items) {
    formats.add(d.format);
    const key = `${d.format}|${d.status}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (d.channel) {
      if (!channelsByFormat.has(d.format)) channelsByFormat.set(d.format, new Set());
      channelsByFormat.get(d.format)!.add(d.channel);
    }
  }
  const formatRows = [...formats];

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="px-3 py-2 text-left font-medium">Format</th>
            {STATUS_COLUMNS.map((status) => (
              <th key={status} className="px-3 py-2 text-center font-medium">
                {DELIVERABLE_STATUS_LABELS[status]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {formatRows.map((format) => (
            <tr key={format} className="border-b last:border-0">
              <td className="px-3 py-2 font-medium">
                {CONTENT_FORMAT_LABELS[format]}
                {channelsByFormat.has(format) && (
                  <span className="block text-xs font-normal text-muted-foreground">
                    {[...channelsByFormat.get(format)!]
                      .map((c) => PUBLICATION_CHANNEL_LABELS[c])
                      .join(", ")}
                  </span>
                )}
              </td>
              {STATUS_COLUMNS.map((status) => {
                const count = counts.get(`${format}|${status}`) ?? 0;
                return (
                  <td key={status} className="px-3 py-2 text-center">
                    <span
                      className={cn(
                        "inline-flex size-6 items-center justify-center rounded-full text-xs",
                        count > 0
                          ? "bg-primary/10 font-medium text-primary"
                          : "text-muted-foreground/40",
                      )}
                    >
                      {count > 0 ? count : "–"}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
