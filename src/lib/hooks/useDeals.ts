import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchDeals,
  fetchDealsByStage,
  fetchDeal,
  createDealAction,
  updateDealAction,
  moveDealAction,
  closeDealAction,
  reopenDealAction,
  linkDealContactAction,
  unlinkDealContactAction,
} from "@/lib/actions/deal";
import type { CreateDealInput, UpdateDealInput, DealSearchInput } from "@/lib/schemas/deal";

// --- Liste paginee des deals ---

export function useDeals(params?: DealSearchInput) {
  return useQuery({
    queryKey: ["deals", params],
    queryFn: () => fetchDeals(params),
  });
}

// --- Deals groupes par stage (kanban) ---

export function useDealsByStage() {
  return useQuery({
    queryKey: ["deals", "by-stage"],
    queryFn: () => fetchDealsByStage(),
  });
}

// --- Detail d'un deal ---

export function useDeal(id: string | undefined) {
  return useQuery({
    queryKey: ["deals", id],
    queryFn: () => fetchDeal(id!),
    enabled: !!id,
  });
}

// --- Creation ---

export function useCreateDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateDealInput) => createDealAction(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast.success("Deal créé");
    },
    onError: () => {
      toast.error("Erreur lors de la création du deal");
    },
  });
}

// --- Mise a jour ---

export function useUpdateDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ dealId, input }: { dealId: string; input: UpdateDealInput }) =>
      updateDealAction(dealId, input),
    onSuccess: (_data, { dealId }) => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["deals", dealId] });
      toast.success("Deal mis à jour");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour du deal");
    },
  });
}

// --- Deplacement de stage (kanban) avec optimistic update ---

export function useMoveDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      dealId,
      stage,
      position,
    }: {
      dealId: string;
      stage: string;
      position: number;
    }) => moveDealAction(dealId, stage, position),
    onMutate: async ({ dealId, stage, position }) => {
      // Annuler les requetes en cours pour eviter les ecrasements
      await queryClient.cancelQueries({ queryKey: ["deals", "by-stage"] });
      const previous = queryClient.getQueryData<Record<string, unknown[]>>(["deals", "by-stage"]);

      // Mise a jour optimiste du cache
      queryClient.setQueryData<Record<string, unknown[]>>(["deals", "by-stage"], (old) => {
        if (!old) return old;

        const updated = { ...old };
        // Copier les tableaux pour eviter les mutations
        for (const key of Object.keys(updated)) {
          updated[key] = [...updated[key]];
        }

        // Trouver et retirer le deal de son stage actuel
        let movedDeal: unknown | undefined;
        for (const key of Object.keys(updated)) {
          const index = updated[key].findIndex((d) => (d as Record<string, unknown>).id === dealId);
          if (index !== -1) {
            movedDeal = updated[key].splice(index, 1)[0];
            break;
          }
        }

        if (!movedDeal) return old;

        // Mettre a jour le stage et la position du deal
        const updatedDeal = { ...(movedDeal as Record<string, unknown>), stage, position };

        // Inserer dans le nouveau stage a la bonne position
        if (!updated[stage]) updated[stage] = [];
        updated[stage].splice(position, 0, updatedDeal);

        return updated;
      });

      return { previous };
    },
    onError: (_err, _vars, context) => {
      // Rollback en cas d'erreur
      if (context?.previous) {
        queryClient.setQueryData(["deals", "by-stage"], context.previous);
      }
      toast.error("Erreur lors du déplacement");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
  });
}

// --- Fermeture (won/lost) ---

export function useCloseDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      dealId,
      dealStatus,
      lostReason,
    }: {
      dealId: string;
      dealStatus: "won" | "lost";
      lostReason?: string;
    }) => closeDealAction(dealId, dealStatus, lostReason),
    onSuccess: (_data, { dealStatus }) => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast.success(dealStatus === "won" ? "Deal gagné" : "Deal perdu");
    },
    onError: () => {
      toast.error("Erreur lors de la fermeture du deal");
    },
  });
}

// --- Reouverture ---

export function useReopenDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ dealId, stage }: { dealId: string; stage: string }) =>
      reopenDealAction(dealId, stage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast.success("Deal réouvert");
    },
    onError: () => {
      toast.error("Erreur lors de la réouverture du deal");
    },
  });
}

// --- Liaison deal <-> contact ---

export function useLinkDealContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      dealId,
      contactId,
      role,
    }: {
      dealId: string;
      contactId: string;
      role?: string;
    }) => linkDealContactAction(dealId, contactId, role),
    onSuccess: (_data, { dealId }) => {
      queryClient.invalidateQueries({ queryKey: ["deals", dealId] });
      toast.success("Contact lié au deal");
    },
    onError: () => {
      toast.error("Erreur lors de la liaison");
    },
  });
}

export function useUnlinkDealContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ dealId, contactId }: { dealId: string; contactId: string }) =>
      unlinkDealContactAction(dealId, contactId),
    onSuccess: (_data, { dealId }) => {
      queryClient.invalidateQueries({ queryKey: ["deals", dealId] });
      toast.success("Liaison supprimée");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression de la liaison");
    },
  });
}
