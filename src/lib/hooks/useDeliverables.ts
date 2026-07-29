import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchDeliverables,
  createDeliverableAction,
  updateDeliverableAction,
  deleteDeliverableAction,
} from "@/lib/actions/content";
import type { CreateDeliverableInput, UpdateDeliverableInput } from "@/lib/schemas/content";

// --- Livrables d'un contenu ---

export function useDeliverables(contentPieceId: string | undefined) {
  return useQuery({
    queryKey: ["deliverables", contentPieceId],
    queryFn: () => fetchDeliverables(contentPieceId!),
    enabled: !!contentPieceId,
  });
}

// --- Creation ---

export function useCreateDeliverable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDeliverableInput) => createDeliverableAction(input),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ["deliverables", input.content_piece_id] });
      toast.success("Livrable créé");
    },
    onError: () => toast.error("Erreur lors de la création du livrable"),
  });
}

// --- Mise a jour ---

export function useUpdateDeliverable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      deliverableId,
      contentPieceId,
      input,
    }: {
      deliverableId: string;
      contentPieceId: string;
      input: UpdateDeliverableInput;
    }) => updateDeliverableAction(deliverableId, contentPieceId, input),
    onSuccess: (_data, { contentPieceId }) => {
      queryClient.invalidateQueries({ queryKey: ["deliverables", contentPieceId] });
      toast.success("Livrable mis à jour");
    },
    onError: () => toast.error("Erreur lors de la mise à jour du livrable"),
  });
}

// --- Suppression ---

export function useDeleteDeliverable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      deliverableId,
      contentPieceId,
    }: {
      deliverableId: string;
      contentPieceId: string;
    }) => deleteDeliverableAction(deliverableId, contentPieceId),
    onSuccess: (_data, { contentPieceId }) => {
      queryClient.invalidateQueries({ queryKey: ["deliverables", contentPieceId] });
      toast.success("Livrable supprimé");
    },
    onError: () => toast.error("Erreur lors de la suppression du livrable"),
  });
}
