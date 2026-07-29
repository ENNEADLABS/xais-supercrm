import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchDocuments,
  fetchAllDocuments,
  uploadDocumentAction,
  renameDocumentAction,
  deleteDocumentAction,
  getSignedUrlAction,
} from "@/lib/actions/document";
import type { EntityType } from "@/types/database";

// --- Documents d'une entite ---

export function useDocuments(entityType?: EntityType, entityId?: string) {
  return useQuery({
    queryKey: ["documents", entityType, entityId],
    queryFn: () => fetchDocuments(entityType, entityId),
    enabled: !entityType || !!entityId,
  });
}

// --- Tous les documents (page /documents) ---

export function useAllDocuments(params?: { search?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ["documents", "all", params],
    queryFn: () => fetchAllDocuments(params),
  });
}

// --- Upload ---

export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: FormData) => uploadDocumentAction(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document uploadé");
    },
    onError: () => {
      toast.error("Erreur lors de l'upload du document");
    },
  });
}

// --- Renommer ---

export function useRenameDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ documentId, name }: { documentId: string; name: string }) =>
      renameDocumentAction(documentId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document renommé");
    },
    onError: () => {
      toast.error("Erreur lors du renommage du document");
    },
  });
}

// --- Suppression ---

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (documentId: string) => deleteDocumentAction(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document supprimé");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression du document");
    },
  });
}

// --- URL signee (expire a 1h, staleTime a 50min) ---

export function useDocumentUrl(documentId: string) {
  return useQuery({
    queryKey: ["document-url", documentId],
    queryFn: () => getSignedUrlAction(documentId),
    enabled: !!documentId,
    staleTime: 50 * 60 * 1000, // 50 minutes (URLs expirent a 1h)
  });
}
