"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { useCreateContentPiece } from "@/lib/hooks/useContentPieces";
import { createContentPieceSchema } from "@/lib/schemas/content";
import {
  CONTENT_FORMAT_OPTIONS,
  CONTENT_STATUS_LABELS,
  CONTENT_STATUS_ORDER,
  PRIORITY_OPTIONS,
} from "@/lib/utils/contentLabels";
import type { ContentStatus } from "@/types/database";
import type { z } from "zod";

type PieceFormValues = z.input<typeof createContentPieceSchema>;

interface ContentPieceCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultStatus?: ContentStatus;
}

const selectClass = "w-full rounded-md border bg-background px-3 py-2 text-sm";

/**
 * Dialog de creation rapide d'un contenu depuis le board (statut preselectionne).
 */
export function ContentPieceCreateDialog({
  open,
  onOpenChange,
  defaultStatus,
}: ContentPieceCreateDialogProps) {
  const createPiece = useCreateContentPiece();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PieceFormValues>({
    resolver: zodResolver(createContentPieceSchema),
    defaultValues: {
      title: "",
      format: "youtube_long",
      status: defaultStatus ?? "idea",
      priority: "medium",
    },
  });

  // Synchronise le statut preselectionne a l'ouverture.
  useEffect(() => {
    if (open)
      reset({
        title: "",
        format: "youtube_long",
        status: defaultStatus ?? "idea",
        priority: "medium",
      });
  }, [open, defaultStatus, reset]);

  async function onSubmit(data: PieceFormValues) {
    await createPiece.mutateAsync({
      ...data,
      status: data.status ?? "idea",
      priority: data.priority ?? "medium",
    });
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouveau contenu</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="piece-title">Titre *</Label>
            <Input id="piece-title" {...register("title")} placeholder="Ex: Épisode 12 — Scaling" />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="piece-format">Format *</Label>
              <select id="piece-format" {...register("format")} className={selectClass}>
                {CONTENT_FORMAT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="piece-status">Statut</Label>
              <select id="piece-status" {...register("status")} className={selectClass}>
                {CONTENT_STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {CONTENT_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="piece-priority">Priorité</Label>
            <select id="piece-priority" {...register("priority")} className={selectClass}>
              {PRIORITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
