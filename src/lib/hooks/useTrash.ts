import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchTrashedItems, restoreItemAction, permanentDeleteAction } from "@/lib/actions/trash";
import type { SoftDeletableTable } from "@/lib/supabase/softDelete";

export function useTrashItems(entityType?: SoftDeletableTable) {
  return useQuery({
    queryKey: ["trash", entityType ?? "all"],
    queryFn: () => fetchTrashedItems(entityType),
  });
}

export function useRestoreItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entityType, id }: { entityType: SoftDeletableTable; id: string }) =>
      restoreItemAction(entityType, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      toast.success("Élément restauré");
    },
    onError: () => {
      toast.error("Erreur lors de la restauration");
    },
  });
}

export function usePermanentDelete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entityType, id }: { entityType: SoftDeletableTable; id: string }) =>
      permanentDeleteAction(entityType, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      toast.success("Élément supprimé définitivement");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression définitive");
    },
  });
}
