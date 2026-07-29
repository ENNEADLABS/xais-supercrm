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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useContentTemplates, useCreatePieceFromTemplate } from "@/lib/hooks/useContentTemplates";

interface CreateFromTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTitle?: string;
}

const selectClass = "w-full rounded-md border bg-background px-3 py-2 text-sm";

/**
 * Dialog : créer un contenu pré-rempli depuis un template (script + checklist +
 * livrables). Redirige vers la fiche du contenu créé.
 */
export function CreateFromTemplateDialog({
  open,
  onOpenChange,
  defaultTitle,
}: CreateFromTemplateDialogProps) {
  const router = useRouter();
  const { data: templates } = useContentTemplates();
  const createPiece = useCreatePieceFromTemplate();
  const [templateId, setTemplateId] = useState("");
  const [title, setTitle] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");

  const active = (templates ?? []).filter((t) => t.is_active);

  // Réinitialise les champs à l'ouverture (pré-sélectionne le 1er template actif).
  const firstActiveId = active[0]?.id ?? "";
  useEffect(() => {
    if (open) {
      setTitle(defaultTitle ?? "");
      setTemplateId(firstActiveId);
      setScheduledDate("");
    }
  }, [open, defaultTitle, firstActiveId]);

  async function handleCreate() {
    if (!templateId || !title.trim()) return;
    const piece = await createPiece.mutateAsync({
      template_id: templateId,
      title: title.trim(),
      scheduled_date: scheduledDate || null,
    });
    onOpenChange(false);
    if (piece?.id) router.push(`/studio/content/${piece.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouveau contenu depuis un template</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {active.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun template actif. Créez-en un depuis l&apos;onglet Templates.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="cft-template">Template</Label>
                <select
                  id="cft-template"
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  className={selectClass}
                >
                  {active.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cft-title">Titre du contenu</Label>
                <Input
                  id="cft-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Comment automatiser son CRM"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cft-date">Date de publication (optionnel)</Label>
                <Input
                  id="cft-date"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleCreate}
            disabled={createPiece.isPending || !templateId || !title.trim()}
          >
            {createPiece.isPending ? "Création..." : "Créer le contenu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
