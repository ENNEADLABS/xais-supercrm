import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchConnectedAccounts,
  disconnectAccountAction,
  triggerSyncAction,
} from "@/lib/actions/email";

// --- Liste des comptes connectes ---

export function useConnectedAccounts() {
  return useQuery({
    queryKey: ["connected-accounts"],
    queryFn: () => fetchConnectedAccounts(),
  });
}

// --- Deconnecter un compte ---

export function useDisconnectAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (accountId: string) => disconnectAccountAction(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connected-accounts"] });
      toast.success("Compte deconnecte");
    },
    onError: () => {
      toast.error("Erreur lors de la deconnexion du compte");
    },
  });
}

// --- Declencher une synchronisation ---

export function useTriggerSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (accountId: string) => triggerSyncAction(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emails"] });
      queryClient.invalidateQueries({ queryKey: ["email-counts"] });
      queryClient.invalidateQueries({ queryKey: ["connected-accounts"] });
      toast.success("Synchronisation lancee");
    },
    onError: () => {
      toast.error("Erreur lors de la synchronisation");
    },
  });
}
