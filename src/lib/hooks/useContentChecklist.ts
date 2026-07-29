import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchChecklist,
  createChecklistItemAction,
  updateChecklistItemAction,
  deleteChecklistItemAction,
} from "@/lib/actions/content";
import type { CreateChecklistItemInput, UpdateChecklistItemInput } from "@/lib/schemas/content";

// --- Checklist d'un contenu ---

export function useContentChecklist(contentPieceId: string | undefined) {
  return useQuery({
    queryKey: ["content-checklist", contentPieceId],
    queryFn: () => fetchChecklist(contentPieceId!),
    enabled: !!contentPieceId,
  });
}

// --- Creation ---

export function useCreateChecklistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateChecklistItemInput) => createChecklistItemAction(input),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ["content-checklist", input.content_piece_id] });
    },
    onError: () => toast.error("Erreur lors de l'ajout de l'élément"),
  });
}

// --- Mise a jour (coche, label, ordre) ---

export function useUpdateChecklistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      contentPieceId,
      input,
    }: {
      itemId: string;
      contentPieceId: string;
      input: UpdateChecklistItemInput;
    }) => updateChecklistItemAction(itemId, contentPieceId, input),
    onSuccess: (_data, { contentPieceId }) => {
      queryClient.invalidateQueries({ queryKey: ["content-checklist", contentPieceId] });
    },
    onError: () => toast.error("Erreur lors de la mise à jour de l'élément"),
  });
}

// --- Suppression ---

export function useDeleteChecklistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, contentPieceId }: { itemId: string; contentPieceId: string }) =>
      deleteChecklistItemAction(itemId, contentPieceId),
    onSuccess: (_data, { contentPieceId }) => {
      queryClient.invalidateQueries({ queryKey: ["content-checklist", contentPieceId] });
    },
    onError: () => toast.error("Erreur lors de la suppression de l'élément"),
  });
}
