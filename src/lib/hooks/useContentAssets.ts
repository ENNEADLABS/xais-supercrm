import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchAssets,
  createAssetAction,
  updateAssetAction,
  deleteAssetAction,
} from "@/lib/actions/content";
import type { CreateContentAssetInput, UpdateContentAssetInput } from "@/lib/schemas/content";

// --- Assets d'un contenu ---

export function useContentAssets(contentPieceId: string | undefined) {
  return useQuery({
    queryKey: ["content-assets", contentPieceId],
    queryFn: () => fetchAssets(contentPieceId!),
    enabled: !!contentPieceId,
  });
}

// --- Creation ---

export function useCreateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateContentAssetInput) => createAssetAction(input),
    onSuccess: (_data, input) => {
      if (input.content_piece_id) {
        queryClient.invalidateQueries({ queryKey: ["content-assets", input.content_piece_id] });
      }
      toast.success("Asset ajouté");
    },
    onError: () => toast.error("Erreur lors de l'ajout de l'asset"),
  });
}

// --- Mise a jour ---

export function useUpdateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      assetId,
      contentPieceId,
      input,
    }: {
      assetId: string;
      contentPieceId: string;
      input: UpdateContentAssetInput;
    }) => updateAssetAction(assetId, contentPieceId, input),
    onSuccess: (_data, { contentPieceId }) => {
      queryClient.invalidateQueries({ queryKey: ["content-assets", contentPieceId] });
      toast.success("Asset mis à jour");
    },
    onError: () => toast.error("Erreur lors de la mise à jour de l'asset"),
  });
}

// --- Suppression ---

export function useDeleteAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assetId, contentPieceId }: { assetId: string; contentPieceId: string }) =>
      deleteAssetAction(assetId, contentPieceId),
    onSuccess: (_data, { contentPieceId }) => {
      queryClient.invalidateQueries({ queryKey: ["content-assets", contentPieceId] });
      toast.success("Asset supprimé");
    },
    onError: () => toast.error("Erreur lors de la suppression de l'asset"),
  });
}
