import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchQuotes,
  fetchQuote,
  createQuoteAction,
  updateQuoteAction,
  deleteQuoteAction,
  validateQuoteAction,
  sendQuoteAction,
  signQuoteAction,
  refuseQuoteAction,
  cancelQuoteAction,
} from "@/lib/actions/quote";
import type { CreateQuoteInput, UpdateQuoteInput, QuoteSearchInput } from "@/lib/schemas/quote";

// --- Liste des devis ---

export function useQuotes(params?: QuoteSearchInput) {
  return useQuery({
    queryKey: ["quotes", params],
    queryFn: () => fetchQuotes(params),
  });
}

// --- Detail d'un devis ---

export function useQuote(id: string | undefined) {
  return useQuery({
    queryKey: ["quotes", id],
    queryFn: () => fetchQuote(id!),
    enabled: !!id,
  });
}

// --- Creation ---

export function useCreateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateQuoteInput) => createQuoteAction(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Devis créé");
    },
    onError: () => {
      toast.error("Erreur lors de la création du devis");
    },
  });
}

// --- Mise a jour ---

export function useUpdateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ quoteId, input }: { quoteId: string; input: UpdateQuoteInput }) =>
      updateQuoteAction(quoteId, input),
    onSuccess: (_data, { quoteId }) => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["quotes", quoteId] });
      toast.success("Devis mis à jour");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour du devis");
    },
  });
}

// --- Suppression ---

export function useDeleteQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (quoteId: string) => deleteQuoteAction(quoteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Devis supprimé");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression du devis");
    },
  });
}

// ==========================================
// Hooks cycle de vie du devis
// ==========================================

// --- Validation (draft -> validated) ---

export function useValidateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (quoteId: string) => validateQuoteAction(quoteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Devis validé — référence attribuée");
    },
    onError: () => {
      toast.error("Erreur lors de la validation du devis");
    },
  });
}

// --- Envoi (validated -> sent) ---

export function useSendQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (quoteId: string) => sendQuoteAction(quoteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Devis envoyé");
    },
    onError: () => {
      toast.error("Erreur lors de l'envoi du devis");
    },
  });
}

// --- Signature (sent -> signed) ---

export function useSignQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (quoteId: string) => signQuoteAction(quoteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Devis signé");
    },
    onError: () => {
      toast.error("Erreur lors de la signature du devis");
    },
  });
}

// --- Refus (sent -> refused) ---

export function useRefuseQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ quoteId, reason }: { quoteId: string; reason?: string }) =>
      refuseQuoteAction(quoteId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Devis refusé");
    },
    onError: () => {
      toast.error("Erreur lors du refus du devis");
    },
  });
}

// --- Annulation (-> cancelled) ---

export function useCancelQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (quoteId: string) => cancelQuoteAction(quoteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Devis annulé");
    },
    onError: () => {
      toast.error("Erreur lors de l'annulation du devis");
    },
  });
}
