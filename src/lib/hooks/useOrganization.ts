import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchOrganization, updateOrganizationAction } from "@/lib/actions/settings";
import type { UpdateOrganizationInput } from "@/lib/schemas/settings";

// --- Organisation courante ---

export function useOrganization() {
  return useQuery({
    queryKey: ["organization"],
    queryFn: () => fetchOrganization(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// --- Mise a jour de l'organisation ---

export function useUpdateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateOrganizationInput) => updateOrganizationAction(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization"] });
      toast.success("Organisation mise à jour");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour de l'organisation");
    },
  });
}
