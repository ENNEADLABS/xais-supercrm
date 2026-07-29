import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchContacts,
  fetchContact,
  createContactAction,
  updateContactAction,
  archiveContactAction,
  linkContactCompanyAction,
  unlinkContactCompanyAction,
  findDuplicatesAction,
  mergeContactsAction,
} from "@/lib/actions/contact";
import type {
  CreateContactInput,
  UpdateContactInput,
  ContactSearchInput,
  DuplicateCheckInput,
  MergeContactsInput,
} from "@/lib/schemas/contact";

// --- Liste paginee des contacts ---

export function useContacts(params?: ContactSearchInput) {
  return useQuery({
    queryKey: ["contacts", params],
    queryFn: () => fetchContacts(params),
  });
}

// --- Detail d'un contact ---

export function useContact(id: string | undefined) {
  return useQuery({
    queryKey: ["contacts", id],
    queryFn: () => fetchContact(id!),
    enabled: !!id,
  });
}

// --- Creation ---

export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateContactInput) => createContactAction(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact créé");
    },
    onError: () => {
      toast.error("Erreur lors de la création du contact");
    },
  });
}

// --- Mise a jour ---

export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contactId, input }: { contactId: string; input: UpdateContactInput }) =>
      updateContactAction(contactId, input),
    onSuccess: (_data, { contactId }) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contacts", contactId] });
      toast.success("Contact mis à jour");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour du contact");
    },
  });
}

// --- Archivage ---

export function useArchiveContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contactId: string) => archiveContactAction(contactId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact archivé");
    },
    onError: () => {
      toast.error("Erreur lors de l'archivage du contact");
    },
  });
}

// --- Liaison contact <-> societe ---

export function useLinkContactCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      contactId,
      companyId,
      role,
    }: {
      contactId: string;
      companyId: string;
      role?: string;
    }) => linkContactCompanyAction(contactId, companyId, role),
    onSuccess: (_data, { contactId, companyId }) => {
      queryClient.invalidateQueries({ queryKey: ["contacts", contactId] });
      queryClient.invalidateQueries({ queryKey: ["companies", companyId] });
      toast.success("Contact lié à la société");
    },
    onError: () => {
      toast.error("Erreur lors de la liaison");
    },
  });
}

export function useUnlinkContactCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contactId, companyId }: { contactId: string; companyId: string }) =>
      unlinkContactCompanyAction(contactId, companyId),
    onSuccess: (_data, { contactId, companyId }) => {
      queryClient.invalidateQueries({ queryKey: ["contacts", contactId] });
      queryClient.invalidateQueries({ queryKey: ["companies", companyId] });
      toast.success("Liaison supprimée");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression de la liaison");
    },
  });
}

// --- Detection de doublons ---

export function useFindDuplicates(input: DuplicateCheckInput | null) {
  return useQuery({
    queryKey: ["contacts", "duplicates", input],
    queryFn: () => findDuplicatesAction(input!),
    enabled: !!input && input.first_name.length > 0 && input.last_name.length > 0,
    staleTime: 30_000,
  });
}

// --- Fusion de contacts ---

export function useMergeContacts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: MergeContactsInput) => mergeContactsAction(input),
    onSuccess: (_data, { winner_id }) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contacts", winner_id] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Contacts fusionnés");
    },
    onError: () => {
      toast.error("Erreur lors de la fusion des contacts");
    },
  });
}
