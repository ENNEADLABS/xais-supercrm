import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchContentIdeas,
  fetchContentIdea,
  createContentIdeaAction,
  updateContentIdeaAction,
  deleteContentIdeaAction,
} from "@/lib/actions/content";
import type {
  CreateContentIdeaInput,
  UpdateContentIdeaInput,
  ContentIdeaSearchInput,
} from "@/lib/schemas/content";

// --- Liste paginee ---

export function useContentIdeas(params?: ContentIdeaSearchInput) {
  return useQuery({
    queryKey: ["content-ideas", params],
    queryFn: () => fetchContentIdeas(params),
  });
}

// --- Detail ---

export function useContentIdea(id: string | undefined) {
  return useQuery({
    queryKey: ["content-ideas", id],
    queryFn: () => fetchContentIdea(id!),
    enabled: !!id,
  });
}

// --- Creation ---

export function useCreateContentIdea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateContentIdeaInput) => createContentIdeaAction(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-ideas"] });
      toast.success("Idée créée");
    },
    onError: () => toast.error("Erreur lors de la création de l'idée"),
  });
}

// --- Mise a jour ---

export function useUpdateContentIdea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ideaId, input }: { ideaId: string; input: UpdateContentIdeaInput }) =>
      updateContentIdeaAction(ideaId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-ideas"] });
      toast.success("Idée mise à jour");
    },
    onError: () => toast.error("Erreur lors de la mise à jour de l'idée"),
  });
}

// --- Suppression ---

export function useDeleteContentIdea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ideaId: string) => deleteContentIdeaAction(ideaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-ideas"] });
      toast.success("Idée supprimée");
    },
    onError: () => toast.error("Erreur lors de la suppression de l'idée"),
  });
}
