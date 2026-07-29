"use client";

import { useState } from "react";
import { CreditCard, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePaymentsByInvoice, useDeletePayment } from "@/lib/hooks/usePayments";
import { formatCurrency } from "@/lib/utils/format";
import { PAYMENT_METHOD_SHORT, type PaymentMethod } from "@/lib/utils/payment-labels";
import { InvoicePaymentDialog } from "./InvoicePaymentDialog";

interface InvoicePaymentsTabProps {
  invoiceId: string;
  totalTtc: number;
  paidAmount: number;
  status: string;
}

export function InvoicePaymentsTab({
  invoiceId,
  totalTtc,
  paidAmount,
  status,
}: InvoicePaymentsTabProps) {
  const { data: payments, isLoading } = usePaymentsByInvoice(invoiceId);
  const deletePayment = useDeletePayment();
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const remaining = totalTtc - paidAmount;
  const canAddPayment = ["sent", "partial", "overdue"].includes(status);
  const progressPercent = totalTtc > 0 ? Math.min(100, (paidAmount / totalTtc) * 100) : 0;

  function handleDelete() {
    if (!deleteId) return;
    deletePayment.mutate(
      { paymentId: deleteId, invoiceId },
      { onSettled: () => setDeleteId(null) },
    );
  }

  return (
    <div className="space-y-4">
      {/* Barre de progression */}
      <div className="space-y-2 rounded-lg border p-4">
        <div className="flex items-center justify-between text-sm">
          <span>
            Payé : {formatCurrency(paidAmount)} / {formatCurrency(totalTtc)}
          </span>
          <span className="text-muted-foreground">Reste : {formatCurrency(remaining)}</span>
        </div>
        <div className="h-2 rounded-full bg-muted">
          <div
            className="h-2 rounded-full bg-primary transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Bouton ajouter */}
      {canAddPayment && (
        <Button size="sm" onClick={() => setPaymentDialogOpen(true)}>
          <Plus className="mr-1 size-4" />
          Enregistrer un paiement
        </Button>
      )}

      {/* Liste des paiements */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : !payments || payments.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-muted-foreground">
          <CreditCard className="mb-2 size-8" />
          <p className="text-sm">Aucun paiement enregistré</p>
        </div>
      ) : (
        <div className="space-y-2">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{formatCurrency(payment.amount)}</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                    {PAYMENT_METHOD_SHORT[payment.payment_method as PaymentMethod] ??
                      payment.payment_method}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{new Date(payment.payment_date).toLocaleDateString("fr-FR")}</span>
                  {payment.reference && <span>· Réf: {payment.reference}</span>}
                </div>
                {payment.notes && <p className="text-xs text-muted-foreground">{payment.notes}</p>}
              </div>

              {canAddPayment && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-destructive hover:text-destructive"
                  onClick={() => setDeleteId(payment.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Dialog creation paiement */}
      <InvoicePaymentDialog
        invoiceId={invoiceId}
        totalTtc={totalTtc}
        paidAmount={paidAmount}
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
      />

      {/* Confirmation suppression */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(isOpen: boolean) => !isOpen && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce paiement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le montant payé de la facture sera recalculé automatiquement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePayment.isPending && <Loader2 className="mr-1 size-4 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
