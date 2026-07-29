import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchApiKeys, generateApiKeyAction, revokeApiKeyAction } from "@/lib/actions/apiKey";

// --- Liste des cles API ---

export function useApiKeys() {
  return useQuery({
    queryKey: ["apiKeys"],
    queryFn: () => fetchApiKeys(),
  });
}

// --- Generation d'une cle ---

export function useGenerateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (label: string) => generateApiKeyAction({ label }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apiKeys"] });
    },
    onError: () => {
      toast.error("Erreur lors de la génération de la clé");
    },
  });
}

// --- Revocation ---

export function useRevokeApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (apiKeyId: string) => revokeApiKeyAction(apiKeyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apiKeys"] });
      toast.success("Clé révoquée");
    },
    onError: () => {
      toast.error("Erreur lors de la révocation");
    },
  });
}
