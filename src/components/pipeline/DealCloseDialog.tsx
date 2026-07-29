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
import { Label } from "@/components/ui/label";
import { useCloseDeal } from "@/lib/hooks/useDeals";

interface DealCloseDialogProps {
  dealId: string;
  dealName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Dialog pour fermer un deal en gagne ou perdu.
 * Si perdu, un motif est obligatoire.
 */
export function DealCloseDialog({ dealId, dealName, open, onOpenChange }: DealCloseDialogProps) {
  const [outcome, setOutcome] = useState<"won" | "lost" | null>(null);
  const [lostReason, setLostReason] = useState("");
  const closeDeal = useCloseDeal();

  const handleClose = async () => {
    if (!outcome) return;

    await closeDeal.mutateAsync({
      dealId,
      dealStatus: outcome,
      lostReason: outcome === "lost" ? lostReason : undefined,
    });

    // Reset et fermer
    setOutcome(null);
    setLostReason("");
    onOpenChange(false);
  };

  const canSubmit = outcome === "won" || (outcome === "lost" && lostReason.trim().length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Fermer le deal : {dealName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Choix gagne / perdu */}
          <div className="flex gap-3">
            <Button
              variant={outcome === "won" ? "default" : "outline"}
              className={outcome === "won" ? "bg-green-600 hover:bg-green-700" : ""}
              onClick={() => setOutcome("won")}
            >
              Gagné
            </Button>
            <Button
              variant={outcome === "lost" ? "default" : "outline"}
              className={outcome === "lost" ? "bg-red-600 hover:bg-red-700" : ""}
              onClick={() => setOutcome("lost")}
            >
              Perdu
            </Button>
          </div>

          {/* Motif de perte (obligatoire si perdu) */}
          {outcome === "lost" && (
            <div className="space-y-2">
              <Label htmlFor="lost-reason">Motif de perte (obligatoire)</Label>
              <textarea
                id="lost-reason"
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                rows={3}
                placeholder="Pourquoi ce deal est perdu ?"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleClose} disabled={!canSubmit || closeDeal.isPending}>
            {closeDeal.isPending ? "Fermeture..." : "Confirmer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
