import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchQuoteLines,
  addQuoteLineAction,
  updateQuoteLineAction,
  deleteQuoteLineAction,
  reorderQuoteLinesAction,
  addFromProductAction,
} from "@/lib/actions/quote";
import type { CreateQuoteLineInput, UpdateQuoteLineInput } from "@/lib/schemas/quote";

// --- Liste des lignes d'un devis ---

export function useQuoteLines(quoteId: string | undefined) {
  return useQuery({
    queryKey: ["quote-lines", quoteId],
    queryFn: () => fetchQuoteLines(quoteId!),
    enabled: !!quoteId,
  });
}

// --- Ajout d'une ligne ---

export function useAddQuoteLine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ quoteId, input }: { quoteId: string; input: CreateQuoteLineInput }) =>
      addQuoteLineAction(quoteId, input),
    onSuccess: (_data, { quoteId }) => {
      // Invalider les lignes ET le devis (les totaux changent)
      queryClient.invalidateQueries({ queryKey: ["quote-lines", quoteId] });
      queryClient.invalidateQueries({ queryKey: ["quotes", quoteId] });
      toast.success("Ligne ajoutée");
    },
    onError: () => {
      toast.error("Erreur lors de l'ajout de la ligne");
    },
  });
}

// --- Mise a jour d'une ligne ---

export function useUpdateQuoteLine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      quoteId,
      lineId,
      input,
    }: {
      quoteId: string;
      lineId: string;
      input: UpdateQuoteLineInput;
    }) => updateQuoteLineAction(quoteId, lineId, input),
    onSuccess: (_data, { quoteId }) => {
      // Invalider les lignes ET le devis (les totaux changent)
      queryClient.invalidateQueries({ queryKey: ["quote-lines", quoteId] });
      queryClient.invalidateQueries({ queryKey: ["quotes", quoteId] });
      toast.success("Ligne mise à jour");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour de la ligne");
    },
  });
}

// --- Suppression d'une ligne ---

export function useDeleteQuoteLine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ quoteId, lineId }: { quoteId: string; lineId: string }) =>
      deleteQuoteLineAction(quoteId, lineId),
    onSuccess: (_data, { quoteId }) => {
      // Invalider les lignes ET le devis (les totaux changent)
      queryClient.invalidateQueries({ queryKey: ["quote-lines", quoteId] });
      queryClient.invalidateQueries({ queryKey: ["quotes", quoteId] });
      toast.success("Ligne supprimée");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression de la ligne");
    },
  });
}

// --- Ajout depuis un produit ---

export function useAddFromProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      quoteId,
      productId,
      quantity,
    }: {
      quoteId: string;
      productId: string;
      quantity: number;
    }) => addFromProductAction(quoteId, productId, quantity),
    onSuccess: (_data, { quoteId }) => {
      // Invalider les lignes ET le devis (les totaux changent)
      queryClient.invalidateQueries({ queryKey: ["quote-lines", quoteId] });
      queryClient.invalidateQueries({ queryKey: ["quotes", quoteId] });
      toast.success("Produit ajouté au devis");
    },
    onError: () => {
      toast.error("Erreur lors de l'ajout du produit");
    },
  });
}

// --- Reordonnancement des lignes ---

export function useReorderQuoteLines() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ quoteId, lineIds }: { quoteId: string; lineIds: string[] }) =>
      reorderQuoteLinesAction(quoteId, lineIds),
    onSuccess: (_data, { quoteId }) => {
      queryClient.invalidateQueries({ queryKey: ["quote-lines", quoteId] });
    },
    onError: () => {
      toast.error("Erreur lors du réordonnancement");
    },
  });
}
