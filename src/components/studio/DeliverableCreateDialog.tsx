"use client";

import { useState } from "react";
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
import { useCreateDeliverable } from "@/lib/hooks/useDeliverables";
import { CONTENT_FORMAT_OPTIONS, PUBLICATION_CHANNEL_OPTIONS } from "@/lib/utils/contentLabels";
import type { ContentFormat, PublicationChannel } from "@/types/database";

interface DeliverableCreateDialogProps {
  contentPieceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Dialog de creation d'un livrable derive d'un contenu.
 */
export function DeliverableCreateDialog({
  contentPieceId,
  open,
  onOpenChange,
}: DeliverableCreateDialogProps) {
  const createDeliverable = useCreateDeliverable();
  const [title, setTitle] = useState("");
  const [format, setFormat] = useState<ContentFormat>("youtube_short");
  const [channel, setChannel] = useState<PublicationChannel | "">("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await createDeliverable.mutateAsync({
      content_piece_id: contentPieceId,
      title,
      format,
      channel: channel || undefined,
      status: "planned",
    });
    setTitle("");
    setFormat("youtube_short");
    setChannel("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouveau livrable</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="deliverable-title">Titre</Label>
            <Input
              id="deliverable-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: 3 Shorts, post Skool…"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deliverable-format">Format</Label>
            <select
              id="deliverable-format"
              value={format}
              onChange={(e) => setFormat(e.target.value as ContentFormat)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              {CONTENT_FORMAT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="deliverable-channel">Canal de publication</Label>
            <select
              id="deliverable-channel"
              value={channel}
              onChange={(e) => setChannel(e.target.value as PublicationChannel | "")}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">— Non défini —</option>
              {PUBLICATION_CHANNEL_OPTIONS.map((o) => (
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
            <Button type="submit" disabled={!title.trim() || createDeliverable.isPending}>
              {createDeliverable.isPending ? "Ajout..." : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
