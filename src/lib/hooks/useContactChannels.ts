import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchContactChannels,
  addContactChannelAction,
  removeContactChannelAction,
} from "@/lib/actions/contactChannel";
import type { ContactChannelInput } from "@/lib/schemas/contact";

// --- Liste des canaux d'un contact ---

export function useContactChannels(contactId: string) {
  return useQuery({
    queryKey: ["contacts", contactId, "channels"],
    queryFn: () => fetchContactChannels(contactId),
    enabled: !!contactId,
  });
}

// --- Ajout d'un canal ---

export function useAddContactChannel(contactId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ContactChannelInput) => addContactChannelAction(contactId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", contactId, "channels"] });
      toast.success("Canal ajouté");
    },
    onError: () => {
      toast.error("Erreur lors de l'ajout");
    },
  });
}

// --- Suppression d'un canal ---

export function useRemoveContactChannel(contactId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (channelId: string) => removeContactChannelAction(contactId, channelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", contactId, "channels"] });
      toast.success("Canal supprimé");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
    },
  });
}
