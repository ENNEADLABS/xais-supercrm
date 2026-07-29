"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchPaymentsByInvoice,
  createPaymentAction,
  deletePaymentAction,
} from "@/lib/actions/payment";
import type { CreatePaymentInput } from "@/lib/schemas/payment";

// --- Liste des paiements d'une facture ---

export function usePaymentsByInvoice(invoiceId: string) {
  return useQuery({
    queryKey: ["payments", invoiceId],
    queryFn: () => fetchPaymentsByInvoice(invoiceId),
    enabled: !!invoiceId,
  });
}

// --- Creation d'un paiement ---

export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePaymentInput) => createPaymentAction(input),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ["payments", input.invoice_id] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoices", input.invoice_id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Paiement enregistré");
    },
    onError: () => {
      toast.error("Erreur lors de l'enregistrement du paiement");
    },
  });
}

// --- Suppression d'un paiement ---

export function useDeletePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ paymentId, invoiceId }: { paymentId: string; invoiceId: string }) =>
      deletePaymentAction(paymentId, invoiceId),
    onSuccess: (_data, { invoiceId }) => {
      queryClient.invalidateQueries({ queryKey: ["payments", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoices", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Paiement supprimé");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression du paiement");
    },
  });
}
