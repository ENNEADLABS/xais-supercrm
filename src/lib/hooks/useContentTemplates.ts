import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchTemplates,
  fetchTemplate,
  createTemplateAction,
  updateTemplateAction,
  deleteTemplateAction,
  createPieceFromTemplateAction,
} from "@/lib/actions/content";
import type {
  CreateTemplateInput,
  UpdateTemplateInput,
  ApplyTemplateInput,
} from "@/lib/schemas/content";

// --- Liste ---

export function useContentTemplates() {
  return useQuery({
    queryKey: ["content-templates"],
    queryFn: () => fetchTemplates(),
  });
}

// --- Detail ---

export function useContentTemplate(id: string | undefined) {
  return useQuery({
    queryKey: ["content-templates", id],
    queryFn: () => fetchTemplate(id!),
    enabled: !!id,
  });
}

// --- Creation ---

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTemplateInput) => createTemplateAction(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-templates"] });
      toast.success("Template créé");
    },
    onError: () => toast.error("Erreur lors de la création du template"),
  });
}

// --- Mise a jour ---

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ templateId, input }: { templateId: string; input: UpdateTemplateInput }) =>
      updateTemplateAction(templateId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-templates"] });
      toast.success("Template mis à jour");
    },
    onError: () => toast.error("Erreur lors de la mise à jour du template"),
  });
}

// --- Suppression (soft-delete, admin) ---

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) => deleteTemplateAction(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-templates"] });
      toast.success("Template supprimé");
    },
    onError: () => toast.error("Erreur lors de la suppression du template"),
  });
}

// --- Application d'un template -> nouvelle piece ---

export function useCreatePieceFromTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ApplyTemplateInput) => createPieceFromTemplateAction(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-pieces"] });
      toast.success("Contenu créé depuis le template");
    },
    onError: () => toast.error("Erreur lors de la création depuis le template"),
  });
}
