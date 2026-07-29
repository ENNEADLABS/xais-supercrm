"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useConvertIdea } from "@/lib/hooks/useContentPieces";
import { useContentTemplates, useCreatePieceFromTemplate } from "@/lib/hooks/useContentTemplates";
import { CONTENT_FORMAT_OPTIONS } from "@/lib/utils/contentLabels";
import type { ContentFormat, ContentIdea } from "@/types/database";

interface ConvertIdeaDialogProps {
  idea: ContentIdea | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Dialog de conversion d'une idee en content piece (choix du format).
 * Redirige vers la fiche du contenu cree.
 */
export function ConvertIdeaDialog({ idea, open, onOpenChange }: ConvertIdeaDialogProps) {
  const router = useRouter();
  const convertIdea = useConvertIdea();
  const createFromTemplate = useCreatePieceFromTemplate();
  const { data: templates } = useContentTemplates();
  const [format, setFormat] = useState<ContentFormat>("youtube_long");
  const [templateId, setTemplateId] = useState("");

  const activeTemplates = (templates ?? []).filter((t) => t.is_active);
  const isPending = convertIdea.isPending || createFromTemplate.isPending;

  // Synchronise les valeurs pre-selectionnees quand on ouvre le dialog.
  useEffect(() => {
    if (open) {
      setFormat(idea?.planned_format ?? "youtube_long");
      setTemplateId("");
    }
  }, [open, idea]);

  async function handleConvert() {
    if (!idea) return;
    // Depuis un template : piece pre-remplie (script + checklist + livrables).
    const piece = templateId
      ? await createFromTemplate.mutateAsync({
          template_id: templateId,
          title: idea.title,
          scheduled_date: idea.desired_publish_date ?? null,
        })
      : await convertIdea.mutateAsync({ idea_id: idea.id, format });
    onOpenChange(false);
    if (piece?.id) router.push(`/studio/content/${piece.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convertir en contenu</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            L&apos;idée <span className="font-medium text-foreground">{idea?.title}</span> deviendra
            un contenu dans le board éditorial.
          </p>
          <div className="space-y-2">
            <Label htmlFor="convert-format">Format</Label>
            <select
              id="convert-format"
              value={format}
              onChange={(e) => setFormat(e.target.value as ContentFormat)}
              disabled={!!templateId}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-50"
            >
              {CONTENT_FORMAT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {activeTemplates.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="convert-template">Depuis un template (optionnel)</Label>
              <select
                id="convert-template"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">— Sans template (format simple) —</option>
                {activeTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleConvert} disabled={isPending}>
            {isPending ? "Conversion..." : "Convertir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
