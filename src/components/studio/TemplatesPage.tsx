"use client";

import Link from "next/link";
import { LayoutTemplate, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/crm/EmptyState";
import { useContentTemplates, useDeleteTemplate } from "@/lib/hooks/useContentTemplates";
import { CONTENT_FORMAT_LABELS, PRIORITY_LABELS } from "@/lib/utils/contentLabels";
import type { ContentTemplate } from "@/types/database";

function TemplateCard({ template }: { template: ContentTemplate }) {
  const deleteTemplate = useDeleteTemplate();
  const checklistCount = (template.checklist_items as string[] | null)?.length ?? 0;
  const deliverableCount = (template.deliverable_specs as unknown[] | null)?.length ?? 0;

  return (
    <Card className={template.is_active ? undefined : "opacity-60"}>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium leading-tight">{template.name}</h3>
          {!template.is_active && (
            <Badge variant="outline" className="shrink-0 text-xs">
              Inactif
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <Badge variant="secondary">{CONTENT_FORMAT_LABELS[template.format]}</Badge>
          <Badge variant="outline">{PRIORITY_LABELS[template.default_priority]}</Badge>
          <span className="text-muted-foreground">
            {checklistCount} étapes · {deliverableCount} livrables
          </span>
        </div>
        {template.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{template.description}</p>
        )}
        <div className="flex items-center justify-end gap-1 pt-1">
          <Button
            variant="ghost"
            size="sm"
            render={<Link href={`/studio/templates/${template.id}`} />}
          >
            <Pencil className="size-4" />
            Éditer
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-destructive"
            onClick={() => deleteTemplate.mutate(template.id)}
            aria-label="Supprimer le template"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Liste des templates de contenu (actifs + inactifs) avec CRUD.
 */
export function TemplatesPage() {
  const { data, isLoading } = useContentTemplates();
  const templates = data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Templates</h1>
        <Button render={<Link href="/studio/templates/new" />}>
          <Plus className="size-4" />
          Nouveau template
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <EmptyState
          icon={LayoutTemplate}
          title="Aucun template"
          description="Créez un gabarit réutilisable (script, checklist, livrables) pour produire un contenu sans repartir de zéro."
          action={{ label: "Nouveau template", href: "/studio/templates/new" }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {templates.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      )}
    </div>
  );
}
