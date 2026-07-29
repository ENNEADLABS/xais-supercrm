"use client";

import { useState } from "react";
import { Check, Send, X, FileText, Ban, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  useValidateQuote,
  useSendQuote,
  useSignQuote,
  useRefuseQuote,
  useCancelQuote,
  useDeleteQuote,
} from "@/lib/hooks/useQuotes";
import { InvoiceFromQuoteDialog } from "@/components/invoices/InvoiceFromQuoteDialog";
import type { QuoteStatus } from "@/types/database";

interface QuoteStatusActionsProps {
  quoteId: string;
  status: QuoteStatus;
  /** Nom du devis (pour le dialog de conversion) */
  quoteName?: string;
  /** Montant TTC (pour le dialog de conversion) */
  totalTtc?: number;
  onAction?: () => void;
}

/**
 * Boutons d'action contextuels selon le statut du devis.
 */
export function QuoteStatusActions({
  quoteId,
  status,
  quoteName,
  totalTtc,
  onAction,
}: QuoteStatusActionsProps) {
  const [refuseOpen, setRefuseOpen] = useState(false);
  const [refuseReason, setRefuseReason] = useState("");
  const [convertOpen, setConvertOpen] = useState(false);

  const validateMutation = useValidateQuote();
  const sendMutation = useSendQuote();
  const signMutation = useSignQuote();
  const refuseMutation = useRefuseQuote();
  const cancelMutation = useCancelQuote();
  const deleteMutation = useDeleteQuote();

  /** Exécuter une mutation puis notifier le parent */
  function handleAction(action: () => void) {
    action();
    onAction?.();
  }

  function handleRefuse() {
    refuseMutation.mutate({ quoteId, reason: refuseReason || undefined });
    setRefuseOpen(false);
    setRefuseReason("");
    onAction?.();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Actions par statut */}
      {status === "draft" && (
        <>
          <Button
            size="sm"
            onClick={() => handleAction(() => validateMutation.mutate(quoteId))}
            disabled={validateMutation.isPending}
          >
            <Check className="size-4" />
            Valider
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleAction(() => deleteMutation.mutate(quoteId))}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="size-4" />
            Supprimer
          </Button>
        </>
      )}

      {status === "validated" && (
        <Button
          size="sm"
          onClick={() => handleAction(() => sendMutation.mutate(quoteId))}
          disabled={sendMutation.isPending}
        >
          <Send className="size-4" />
          Envoyer
        </Button>
      )}

      {status === "sent" && (
        <>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => handleAction(() => signMutation.mutate(quoteId))}
            disabled={signMutation.isPending}
          >
            <Check className="size-4" />
            Marquer sign&eacute;
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setRefuseOpen(true)}>
            <X className="size-4" />
            Marquer refus&eacute;
          </Button>
        </>
      )}

      {status === "signed" && (
        <>
          <Button size="sm" onClick={() => setConvertOpen(true)}>
            <FileText className="size-4" />
            Convertir en facture
          </Button>
          <InvoiceFromQuoteDialog
            quoteId={quoteId}
            quoteName={quoteName ?? "Devis"}
            totalTtc={totalTtc ?? 0}
            open={convertOpen}
            onOpenChange={setConvertOpen}
          />
        </>
      )}

      {/* Bouton annuler (sauf invoiced) */}
      {status !== "invoiced" && status !== "cancelled" && status !== "draft" && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAction(() => cancelMutation.mutate(quoteId))}
          disabled={cancelMutation.isPending}
        >
          <Ban className="size-4" />
          Annuler
        </Button>
      )}

      {/* Dialog de refus */}
      <Dialog open={refuseOpen} onOpenChange={setRefuseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motif de refus</DialogTitle>
          </DialogHeader>
          <Textarea
            value={refuseReason}
            onChange={(e) => setRefuseReason(e.target.value)}
            placeholder="Raison du refus (optionnel)..."
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefuseOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleRefuse}>
              Confirmer le refus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
