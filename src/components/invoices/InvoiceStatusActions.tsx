"use client";

import { useState } from "react";
import { Check, Send, Ban, Trash2, CreditCard, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  useValidateInvoice,
  useSendInvoice,
  useMarkOverdue,
  useCancelInvoice,
  useDeleteInvoice,
} from "@/lib/hooks/useInvoices";
import type { InvoiceStatus } from "@/types/database";

import { InvoicePaymentDialog } from "./InvoicePaymentDialog";

interface InvoiceStatusActionsProps {
  invoiceId: string;
  status: InvoiceStatus;
  totalTtc: number;
  paidAmount: number;
  onAction?: () => void;
}

/**
 * Boutons d'action contextuels selon le statut de la facture.
 */
export function InvoiceStatusActions({
  invoiceId,
  status,
  totalTtc,
  paidAmount,
  onAction,
}: InvoiceStatusActionsProps) {
  const [paymentOpen, setPaymentOpen] = useState(false);

  const validateMutation = useValidateInvoice();
  const sendMutation = useSendInvoice();
  const markOverdueMutation = useMarkOverdue();
  const cancelMutation = useCancelInvoice();
  const deleteMutation = useDeleteInvoice();

  /** Ex\u00e9cuter une mutation puis notifier le parent */
  function handleAction(action: () => void) {
    action();
    onAction?.();
  }

  // Pas d'actions pour les factures pay\u00e9es ou annul\u00e9es
  if (status === "paid" || status === "cancelled") {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Draft : Valider + Supprimer */}
      {status === "draft" && (
        <>
          <Button
            size="sm"
            onClick={() => handleAction(() => validateMutation.mutate(invoiceId))}
            disabled={validateMutation.isPending}
          >
            <Check className="size-4" />
            Valider
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleAction(() => deleteMutation.mutate(invoiceId))}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="size-4" />
            Supprimer
          </Button>
        </>
      )}

      {/* Valid\u00e9e : Envoyer */}
      {status === "validated" && (
        <Button
          size="sm"
          onClick={() => handleAction(() => sendMutation.mutate(invoiceId))}
          disabled={sendMutation.isPending}
        >
          <Send className="size-4" />
          Envoyer
        </Button>
      )}

      {/* Envoy\u00e9e / Partielle / En retard : Enregistrer paiement */}
      {(status === "sent" || status === "partial" || status === "overdue") && (
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={() => setPaymentOpen(true)}
        >
          <CreditCard className="size-4" />
          Enregistrer paiement
        </Button>
      )}

      {/* Envoy\u00e9e / Partielle : Marquer en retard */}
      {(status === "sent" || status === "partial") && (
        <Button
          size="sm"
          variant="outline"
          className="text-orange-600 hover:text-orange-700"
          onClick={() => handleAction(() => markOverdueMutation.mutate(invoiceId))}
          disabled={markOverdueMutation.isPending}
        >
          <AlertTriangle className="size-4" />
          Marquer en retard
        </Button>
      )}

      {/* Annuler (sauf draft, paid, cancelled) */}
      {status !== "draft" && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAction(() => cancelMutation.mutate(invoiceId))}
          disabled={cancelMutation.isPending}
        >
          <Ban className="size-4" />
          Annuler
        </Button>
      )}

      {/* Dialog de paiement */}
      <InvoicePaymentDialog
        invoiceId={invoiceId}
        totalTtc={totalTtc}
        paidAmount={paidAmount}
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
      />
    </div>
  );
}
