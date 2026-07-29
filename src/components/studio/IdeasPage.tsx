"use client";

import { useState } from "react";
import Link from "next/link";
import { Lightbulb, Plus, ArrowRightCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/crm/EmptyState";
import { useContentIdeas, useDeleteContentIdea } from "@/lib/hooks/useContentIdeas";
import { CONTENT_FORMAT_LABELS, PRIORITY_LABELS, formatShortDate } from "@/lib/utils/contentLabels";
import { ConvertIdeaDialog } from "./ConvertIdeaDialog";
import type { ContentIdea } from "@/types/database";

/**
 * Liste des idees de contenu avec creation et conversion en contenu.
 */
export function IdeasPage() {
  const { data, isLoading } = useContentIdeas();
  const deleteIdea = useDeleteContentIdea();
  const [convertTarget, setConvertTarget] = useState<ContentIdea | null>(null);

  const ideas = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Idées</h1>
        <Button render={<Link href="/studio/ideas/new" />}>
          <Plus className="size-4" />
          Nouvelle idée
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : ideas.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title="Aucune idée"
          description="Capturez vos idées de contenu, puis convertissez-les en contenus à produire."
          action={{ label: "Nouvelle idée", href: "/studio/ideas/new" }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {ideas.map((idea) => (
            <Card key={idea.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium leading-tight">{idea.title}</h3>
                  {idea.status === "archived" && (
                    <Badge variant="outline" className="shrink-0 text-xs">
                      Archivée
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  {idea.planned_format && (
                    <Badge variant="secondary">{CONTENT_FORMAT_LABELS[idea.planned_format]}</Badge>
                  )}
                  <Badge variant="outline">{PRIORITY_LABELS[idea.priority]}</Badge>
                  {idea.desired_publish_date && (
                    <span className="text-muted-foreground">
                      📅 {formatShortDate(idea.desired_publish_date)}
                    </span>
                  )}
                </div>

                {idea.angle && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">{idea.angle}</p>
                )}

                <div className="flex items-center justify-end gap-1 pt-1">
                  {idea.status !== "archived" && (
                    <Button variant="ghost" size="sm" onClick={() => setConvertTarget(idea)}>
                      <ArrowRightCircle className="size-4" />
                      Convertir
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteIdea.mutate(idea.id)}
                    aria-label="Supprimer l'idée"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConvertIdeaDialog
        idea={convertTarget}
        open={!!convertTarget}
        onOpenChange={(open) => !open && setConvertTarget(null)}
      />
    </div>
  );
}
