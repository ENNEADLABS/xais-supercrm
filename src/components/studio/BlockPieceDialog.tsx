"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useBlockPiece } from "@/lib/hooks/useContentPieces";

interface BlockPieceDialogProps {
  pieceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Dialog : marquer un contenu comme bloqué avec une raison (blocage manuel).
 */
export function BlockPieceDialog({ pieceId, open, onOpenChange }: BlockPieceDialogProps) {
  const block = useBlockPiece();
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  async function handleBlock() {
    await block.mutateAsync({
      pieceId,
      input: { is_blocked: true, blocked_reason: reason || null },
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Marquer comme bloqué</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="block-reason">Raison du blocage (optionnel)</Label>
          <Textarea
            id="block-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Ex: Attente validation miniature par le client"
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button variant="destructive" onClick={handleBlock} disabled={block.isPending}>
            {block.isPending ? "Blocage..." : "Bloquer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
