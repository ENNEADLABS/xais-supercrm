import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchNotes,
  createNoteAction,
  updateNoteAction,
  deleteNoteAction,
} from "@/lib/actions/note";
import type { CreateNoteInput } from "@/lib/schemas/note";
import type { EntityType } from "@/types/database";

// --- Liste des notes d'une entite ---

export function useNotes(entityType: EntityType, entityId: string) {
  return useQuery({
    queryKey: ["notes", entityType, entityId],
    queryFn: () => fetchNotes(entityType, entityId),
    enabled: !!entityId,
  });
}

// --- Creation ---

export function useCreateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateNoteInput) => createNoteAction(input),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({
        queryKey: ["notes", input.entity_type, input.entity_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["activities", input.entity_type, input.entity_id],
      });
      toast.success("Note créée");
    },
    onError: () => {
      toast.error("Erreur lors de la création de la note");
    },
  });
}

// --- Mise a jour ---

export function useUpdateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ noteId, content }: { noteId: string; content: string }) =>
      updateNoteAction(noteId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast.success("Note mise à jour");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour de la note");
    },
  });
}

// --- Suppression ---

export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ noteId }: { noteId: string; entityType: EntityType; entityId: string }) =>
      deleteNoteAction(noteId),
    onSuccess: (_data, { entityType, entityId }) => {
      queryClient.invalidateQueries({
        queryKey: ["notes", entityType, entityId],
      });
      queryClient.invalidateQueries({
        queryKey: ["activities", entityType, entityId],
      });
      toast.success("Note supprimée");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression de la note");
    },
  });
}
