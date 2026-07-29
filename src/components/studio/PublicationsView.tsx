"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Loader2, Megaphone, AlertTriangle, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePublications } from "@/lib/hooks/useContentCalendar";
import {
  CONTENT_FORMAT_LABELS,
  DELIVERABLE_STATUS_LABELS,
  PUBLICATION_CHANNEL_LABELS,
  PUBLICATION_CHANNEL_OPTIONS,
  formatShortDate,
} from "@/lib/utils/contentLabels";
import type { PublicationEntry } from "@/lib/services/contentCalendarService";

const NO_CHANNEL = "__none";
const NO_WEEK = "__noweek";

function mondayOf(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

function isOverdue(e: PublicationEntry, today: string): boolean {
  return (
    e.scheduled_date != null &&
    e.scheduled_date < today &&
    e.status !== "published" &&
    e.status !== "cancelled"
  );
}

/**
 * Vue Publications (simple) : livrables groupés par canal puis par semaine,
 * avec statut, signal de retard et lien vers le contenu parent.
 */
export function PublicationsView() {
  const { data, isLoading } = usePublications();

  const grouped = useMemo(() => {
    const byChannel = new Map<string, PublicationEntry[]>();
    for (const e of data ?? []) {
      const key = e.channel ?? NO_CHANNEL;
      (byChannel.get(key) ?? byChannel.set(key, []).get(key)!).push(e);
    }
    const order = [...PUBLICATION_CHANNEL_OPTIONS.map((o) => o.value as string), NO_CHANNEL];
    return order.filter((c) => byChannel.has(c)).map((c) => [c, byChannel.get(c)!] as const);
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Publications</h1>

      {grouped.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Aucun livrable. Ajoutez des livrables depuis la fiche d&apos;un contenu.
        </p>
      ) : (
        grouped.map(([channel, entries]) => {
          const weeks = new Map<string, PublicationEntry[]>();
          for (const e of entries) {
            const wk = e.scheduled_date ? mondayOf(e.scheduled_date) : NO_WEEK;
            (weeks.get(wk) ?? weeks.set(wk, []).get(wk)!).push(e);
          }
          const weekKeys = [...weeks.keys()].sort();

          return (
            <Card key={channel}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Megaphone className="size-4" />
                  {channel === NO_CHANNEL
                    ? "Canal non défini"
                    : PUBLICATION_CHANNEL_LABELS[
                        channel as keyof typeof PUBLICATION_CHANNEL_LABELS
                      ]}
                  <Badge variant="secondary" className="ml-auto">
                    {entries.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {weekKeys.map((wk) => (
                  <div key={wk} className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">
                      {wk === NO_WEEK ? "Non planifié" : `Semaine du ${formatShortDate(wk)}`}
                    </p>
                    <ul className="divide-y rounded-md border">
                      {weeks.get(wk)!.map((e) => (
                        <li key={e.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                          <Link
                            href={`/studio/content/${e.content_piece_id}`}
                            className="min-w-0 flex-1 truncate font-medium hover:underline"
                          >
                            {e.title}
                          </Link>
                          <span className="hidden text-xs text-muted-foreground sm:inline">
                            {CONTENT_FORMAT_LABELS[e.format]}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {DELIVERABLE_STATUS_LABELS[e.status]}
                          </Badge>
                          {isOverdue(e, today) && (
                            <Badge variant="destructive" className="gap-1 text-[10px]">
                              <AlertTriangle className="size-3" />
                              Retard
                            </Badge>
                          )}
                          {e.published_url && (
                            <a href={e.published_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="size-3.5 text-muted-foreground" />
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
