import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchScript, upsertScriptAction } from "@/lib/actions/content";
import type { UpsertContentScriptInput } from "@/lib/schemas/content";

// --- Script d'un contenu ---

export function useContentScript(contentPieceId: string | undefined) {
  return useQuery({
    queryKey: ["content-script", contentPieceId],
    queryFn: () => fetchScript(contentPieceId!),
    enabled: !!contentPieceId,
  });
}

// --- Upsert ---

export function useUpsertScript() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertContentScriptInput) => upsertScriptAction(input),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ["content-script", input.content_piece_id] });
      toast.success("Script enregistré");
    },
    onError: () => toast.error("Erreur lors de l'enregistrement du script"),
  });
}
