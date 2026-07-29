import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchTags,
  createTagAction,
  deleteTagAction,
  assignTagAction,
  removeTagAction,
} from "@/lib/actions/tag";
import type { EntityType } from "@/types/database";

// --- Liste des tags ---

export function useTags(entityType?: EntityType) {
  return useQuery({
    queryKey: ["tags", entityType],
    queryFn: () => fetchTags(entityType),
  });
}

// --- Creation ---

export function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { name: string; color: string; entity_type: EntityType }) =>
      createTagAction(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      toast.success("Tag créé");
    },
    onError: () => {
      toast.error("Erreur lors de la création du tag");
    },
  });
}

// --- Suppression ---

export function useDeleteTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tagId: string) => deleteTagAction(tagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      toast.success("Tag supprimé");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression du tag");
    },
  });
}

// --- Assignation ---

export function useAssignTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      entityId,
      tagId,
      type,
    }: {
      entityId: string;
      tagId: string;
      type: "contact" | "company";
    }) => assignTagAction(entityId, tagId, type),
    onSuccess: (_data, { type, entityId }) => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      queryClient.invalidateQueries({
        queryKey: [type === "contact" ? "contacts" : "companies", entityId],
      });
      toast.success("Tag assigné");
    },
    onError: () => {
      toast.error("Erreur lors de l'assignation du tag");
    },
  });
}

// --- Retrait ---

export function useRemoveTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      entityId,
      tagId,
      type,
    }: {
      entityId: string;
      tagId: string;
      type: "contact" | "company";
    }) => removeTagAction(entityId, tagId, type),
    onSuccess: (_data, { type, entityId }) => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      queryClient.invalidateQueries({
        queryKey: [type === "contact" ? "contacts" : "companies", entityId],
      });
      toast.success("Tag retiré");
    },
    onError: () => {
      toast.error("Erreur lors du retrait du tag");
    },
  });
}
