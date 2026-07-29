import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchInvoices,
  fetchInvoice,
  createInvoiceAction,
  updateInvoiceAction,
  deleteInvoiceAction,
  validateInvoiceAction,
  sendInvoiceAction,
  markOverdueAction,
  cancelInvoiceAction,
  convertQuoteToInvoiceAction,
} from "@/lib/actions/invoice";
import type {
  CreateInvoiceInput,
  UpdateInvoiceInput,
  InvoiceSearchInput,
} from "@/lib/schemas/invoice";

// --- Liste des factures ---

export function useInvoices(params?: InvoiceSearchInput) {
  return useQuery({
    queryKey: ["invoices", params],
    queryFn: () => fetchInvoices(params),
  });
}

// --- Detail d'une facture ---

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: ["invoices", id],
    queryFn: () => fetchInvoice(id!),
    enabled: !!id,
  });
}

// --- Creation ---

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateInvoiceInput) => createInvoiceAction(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Facture créée");
    },
    onError: () => {
      toast.error("Erreur lors de la création de la facture");
    },
  });
}

// --- Mise a jour ---

export function useUpdateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ invoiceId, input }: { invoiceId: string; input: UpdateInvoiceInput }) =>
      updateInvoiceAction(invoiceId, input),
    onSuccess: (_data, { invoiceId }) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoices", invoiceId] });
      toast.success("Facture mise à jour");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour de la facture");
    },
  });
}

// --- Suppression ---

export function useDeleteInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invoiceId: string) => deleteInvoiceAction(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Facture supprimée");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression de la facture");
    },
  });
}

// ==========================================
// Hooks cycle de vie de la facture
// ==========================================

// --- Validation (draft -> validated, numero sequentiel attribue) ---

export function useValidateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invoiceId: string) => validateInvoiceAction(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Facture validée — référence attribuée");
    },
    onError: () => {
      toast.error("Erreur lors de la validation de la facture");
    },
  });
}

// --- Envoi (validated -> sent) ---

export function useSendInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invoiceId: string) => sendInvoiceAction(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Facture envoyée");
    },
    onError: () => {
      toast.error("Erreur lors de l'envoi de la facture");
    },
  });
}

// --- Marquage en retard ---

export function useMarkOverdue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invoiceId: string) => markOverdueAction(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Facture marquée en retard");
    },
    onError: () => {
      toast.error("Erreur lors du marquage en retard");
    },
  });
}

// --- Annulation ---

export function useCancelInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invoiceId: string) => cancelInvoiceAction(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Facture annulée");
    },
    onError: () => {
      toast.error("Erreur lors de l'annulation de la facture");
    },
  });
}

// ==========================================
// Conversion devis -> facture
// ==========================================

export function useConvertQuoteToInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (quoteId: string) => convertQuoteToInvoiceAction(quoteId),
    onSuccess: () => {
      // Invalider les deux caches (la facture creee + le devis passe en "invoiced")
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Devis converti en facture");
    },
    onError: () => {
      toast.error("Erreur lors de la conversion du devis en facture");
    },
  });
}
