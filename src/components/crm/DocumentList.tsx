"use client";

import { useCallback, useState } from "react";
import { Download, Eye, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useDocuments,
  useUploadDocument,
  useRenameDocument,
  useDeleteDocument,
} from "@/lib/hooks/useDocuments";
import { getSignedUrlAction } from "@/lib/actions/document";
import type { EntityType, Document } from "@/types/database";

import { FileIcon } from "./FileIcon";
import { FileDropzone } from "./FileDropzone";
import { DocumentPreviewModal } from "./DocumentPreviewModal";

interface DocumentListProps {
  entityType?: EntityType;
  entityId?: string;
}

/** Formate la taille d'un fichier en octets/Ko/Mo */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

/**
 * Liste de documents avec upload, apercu, renommage et suppression.
 */
export function DocumentList({ entityType, entityId }: DocumentListProps) {
  const { data: documents } = useDocuments(entityType, entityId);
  const uploadMutation = useUploadDocument();
  const renameMutation = useRenameDocument();
  const deleteMutation = useDeleteDocument();

  // Etat de la modale d'apercu
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Etat du renommage inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleUpload = useCallback(
    (files: File[]) => {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("name", file.name);
        if (entityType) formData.append("entity_type", entityType);
        if (entityId) formData.append("entity_id", entityId);
        uploadMutation.mutate(formData);
      }
    },
    [entityType, entityId, uploadMutation],
  );

  const handlePreview = useCallback(async (doc: Document) => {
    setPreviewDoc(doc);
    setPreviewUrl(null);
    const url = await getSignedUrlAction(doc.id);
    setPreviewUrl(url);
  }, []);

  const handleDownload = useCallback(async (docId: string) => {
    const url = await getSignedUrlAction(docId);
    window.open(url, "_blank");
  }, []);

  const handleRenameSubmit = useCallback(
    (documentId: string) => {
      if (editingName.trim()) {
        renameMutation.mutate({ documentId, name: editingName.trim() });
      }
      setEditingId(null);
    },
    [editingName, renameMutation],
  );

  const handleDelete = useCallback(
    (documentId: string) => {
      if (window.confirm("Supprimer ce document ?")) {
        deleteMutation.mutate(documentId);
      }
    },
    [deleteMutation],
  );

  return (
    <div className="space-y-4">
      <FileDropzone onFilesSelected={handleUpload} isUploading={uploadMutation.isPending} />

      {(!documents || documents.length === 0) && (
        <p className="py-6 text-center text-sm text-muted-foreground">Aucun document</p>
      )}

      <div className="space-y-1">
        {documents?.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/50"
          >
            <FileIcon mimeType={doc.mime_type} className="size-5 shrink-0 text-muted-foreground" />

            {/* Nom : mode edition ou affichage */}
            <div className="min-w-0 flex-1">
              {editingId === doc.id ? (
                <Input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => handleRenameSubmit(doc.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRenameSubmit(doc.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="h-7 text-sm"
                  autoFocus
                />
              ) : (
                <p className="truncate text-sm font-medium">{doc.name}</p>
              )}
            </div>

            {/* Taille */}
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatFileSize(doc.size_bytes)}
            </span>

            {/* Date */}
            <span className="shrink-0 text-xs text-muted-foreground">
              {new Date(doc.created_at).toLocaleDateString("fr-FR")}
            </span>

            {/* Actions */}
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => handlePreview(doc)}
                aria-label="Apercu"
              >
                <Eye className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => handleDownload(doc.id)}
                aria-label="Telecharger"
              >
                <Download className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => {
                  setEditingId(doc.id);
                  setEditingName(doc.name);
                }}
                aria-label="Renommer"
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => handleDelete(doc.id)}
                aria-label="Supprimer"
              >
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Modale d'apercu */}
      <DocumentPreviewModal
        url={previewUrl}
        mimeType={previewDoc?.mime_type ?? ""}
        name={previewDoc?.name ?? ""}
        open={!!previewDoc}
        onOpenChange={(open) => {
          if (!open) setPreviewDoc(null);
        }}
      />
    </div>
  );
}
