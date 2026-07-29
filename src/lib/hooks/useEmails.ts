import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchEmails,
  fetchEmail,
  fetchEmailThread,
  fetchEmailCounts,
  markEmailsReadAction,
  moveEmailsAction,
  sendEmailAction,
  replyEmailAction,
} from "@/lib/actions/email";
import type { EmailSearchInput, ComposeEmailInput, ReplyEmailInput } from "@/lib/schemas/email";
import type { EmailFolder } from "@/types/email";

// --- Parametres de recherche simplifies pour les hooks ---

interface EmailSearchParams {
  folder?: EmailFolder;
  search?: string;
  contact_id?: string;
  account_id?: string;
}

// --- Convertit les params hook vers les params action ---

function toSearchInput(params?: EmailSearchParams): EmailSearchInput | undefined {
  if (!params) return undefined;
  return {
    query: params.search ?? "",
    folder: params.folder,
    contact_id: params.contact_id,
    account_id: params.account_id,
    page: 1,
    per_page: 25,
  };
}

// --- Liste des emails (avec filtres dossier / recherche) ---

export function useEmails(params?: EmailSearchParams) {
  return useQuery({
    queryKey: ["emails", params],
    queryFn: () => fetchEmails(toSearchInput(params)),
  });
}

// --- Detail d'un email ---

export function useEmail(id: string | null) {
  return useQuery({
    queryKey: ["emails", id],
    queryFn: () => fetchEmail(id!),
    enabled: !!id,
  });
}

// --- Thread d'emails ---

export function useEmailThread(threadId: string | null) {
  return useQuery({
    queryKey: ["email-threads", threadId],
    queryFn: () => fetchEmailThread(threadId!),
    enabled: !!threadId,
  });
}

// --- Compteurs par dossier (refresh toutes les 30s) ---

export function useEmailCounts() {
  return useQuery({
    queryKey: ["email-counts"],
    queryFn: () => fetchEmailCounts(),
    refetchInterval: 30_000,
  });
}

// --- Emails lies a un contact ---

export function useEntityEmails(entityType: "contact", entityId: string) {
  return useQuery({
    queryKey: ["entity-emails", entityType, entityId],
    queryFn: () => fetchEmails({ query: "", contact_id: entityId, page: 1, per_page: 50 }),
    enabled: !!entityType && !!entityId,
  });
}

// --- Marquer comme lu ---

export function useMarkEmailsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ emailIds, isRead }: { emailIds: string[]; isRead: boolean }) =>
      markEmailsReadAction(emailIds, isRead),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emails"] });
      queryClient.invalidateQueries({ queryKey: ["email-counts"] });
    },
  });
}

// --- Deplacer des emails (archive, trash, inbox) ---

export function useMoveEmails() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ emailIds, folder }: { emailIds: string[]; folder: EmailFolder }) =>
      moveEmailsAction(emailIds, folder),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emails"] });
      queryClient.invalidateQueries({ queryKey: ["email-counts"] });
      toast.success("Email(s) deplace(s)");
    },
    onError: () => {
      toast.error("Erreur lors du deplacement");
    },
  });
}

// --- Envoyer un nouvel email ---

export function useSendEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ComposeEmailInput) => sendEmailAction(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emails"] });
      queryClient.invalidateQueries({ queryKey: ["email-counts"] });
      toast.success("Email envoyé");
    },
    onError: () => {
      toast.error("Erreur lors de l'envoi");
    },
  });
}

// --- Repondre a un email ---

export function useReplyEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ReplyEmailInput) => replyEmailAction(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emails"] });
      queryClient.invalidateQueries({ queryKey: ["email-threads"] });
      toast.success("Réponse envoyée");
    },
    onError: () => {
      toast.error("Erreur lors de l'envoi de la réponse");
    },
  });
}
