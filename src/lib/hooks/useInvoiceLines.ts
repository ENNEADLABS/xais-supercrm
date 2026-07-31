import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchInvoiceLines,
  addInvoiceLineAction,
  addInvoiceLineFromProductAction,
  updateInvoiceLineAction,
  deleteInvoiceLineAction,
  reorderInvoiceLinesAction,
} from "@/lib/actions/invoice";
import type { CreateInvoiceLineInput, UpdateInvoiceLineInput } from "@/lib/schemas/invoice";

// --- Liste des lignes d'une facture ---

export function useInvoiceLines(invoiceId: string | undefined) {
  return useQuery({
    queryKey: ["invoice-lines", invoiceId],
    queryFn: () => fetchInvoiceLines(invoiceId!),
    enabled: !!invoiceId,
  });
}

// --- Ajout d'une ligne ---

export function useAddInvoiceLine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ invoiceId, input }: { invoiceId: string; input: CreateInvoiceLineInput }) =>
      addInvoiceLineAction(invoiceId, input),
    onSuccess: (_data, { invoiceId }) => {
      // Invalider les lignes ET la facture (les totaux changent)
      queryClient.invalidateQueries({ queryKey: ["invoice-lines", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["invoices", invoiceId] });
      toast.success("Ligne ajoutée");
    },
    onError: () => {
      toast.error("Erreur lors de l'ajout de la ligne");
    },
  });
}

// --- Ajout depuis un produit du catalogue ---

export function useAddInvoiceLineFromProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      invoiceId,
      productId,
      quantity,
    }: {
      invoiceId: string;
      productId: string;
      quantity: number;
    }) => addInvoiceLineFromProductAction(invoiceId, productId, quantity),
    onSuccess: (_data, { invoiceId }) => {
      queryClient.invalidateQueries({ queryKey: ["invoice-lines", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["invoices", invoiceId] });
      toast.success("Produit ajouté à la facture");
    },
    onError: () => {
      toast.error("Erreur lors de l'ajout du produit");
    },
  });
}

// --- Mise a jour d'une ligne ---

export function useUpdateInvoiceLine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      invoiceId,
      lineId,
      input,
    }: {
      invoiceId: string;
      lineId: string;
      input: UpdateInvoiceLineInput;
    }) => updateInvoiceLineAction(invoiceId, lineId, input),
    onSuccess: (_data, { invoiceId }) => {
      // Invalider les lignes ET la facture (les totaux changent)
      queryClient.invalidateQueries({ queryKey: ["invoice-lines", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["invoices", invoiceId] });
      toast.success("Ligne mise à jour");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour de la ligne");
    },
  });
}

// --- Suppression d'une ligne ---

export function useDeleteInvoiceLine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ invoiceId, lineId }: { invoiceId: string; lineId: string }) =>
      deleteInvoiceLineAction(invoiceId, lineId),
    onSuccess: (_data, { invoiceId }) => {
      // Invalider les lignes ET la facture (les totaux changent)
      queryClient.invalidateQueries({ queryKey: ["invoice-lines", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["invoices", invoiceId] });
      toast.success("Ligne supprimée");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression de la ligne");
    },
  });
}

// --- Reordonnancement des lignes ---

export function useReorderInvoiceLines() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ invoiceId, lineIds }: { invoiceId: string; lineIds: string[] }) =>
      reorderInvoiceLinesAction(invoiceId, lineIds),
    onSuccess: (_data, { invoiceId }) => {
      queryClient.invalidateQueries({ queryKey: ["invoice-lines", invoiceId] });
    },
    onError: () => {
      toast.error("Erreur lors du réordonnancement");
    },
  });
}
