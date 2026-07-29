"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext, requireMember } from "./helpers";
import * as documentService from "@/lib/services/documentService";
import { uploadDocumentSchema, renameDocumentSchema } from "@/lib/schemas/document";
import type { EntityType } from "@/types/database";

// --- Liste des documents d'une entite ---

export async function fetchDocuments(entityType?: EntityType, entityId?: string) {
  const { organizationId } = await getAuthContext();
  return documentService.getDocuments(organizationId, entityType, entityId);
}

// --- Liste paginee pour la page /documents ---

export async function fetchAllDocuments(params?: {
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const { organizationId } = await getAuthContext();
  return documentService.getDocumentsByOrg(organizationId, params);
}

// --- Upload d'un document ---

export async function uploadDocumentAction(formData: FormData) {
  const { userId, organizationId } = await requireMember();

  const file = formData.get("file") as File | null;
  if (!file) throw new Error("Aucun fichier fourni");

  // Extraire les metadonnees du FormData
  const rawMetadata = {
    name: (formData.get("name") as string) || file.name,
    entity_type: (formData.get("entity_type") as string) || undefined,
    entity_id: (formData.get("entity_id") as string) || undefined,
  };

  const validated = uploadDocumentSchema.parse(rawMetadata);
  const document = await documentService.uploadDocument(organizationId, userId, file, validated);

  if (validated.entity_type && validated.entity_id) {
    revalidatePath(`/${validated.entity_type}s/${validated.entity_id}`);
  }
  revalidatePath("/documents");

  return document;
}

// --- Renommer un document ---

export async function renameDocumentAction(documentId: string, name: string) {
  const { organizationId } = await requireMember();
  const validated = renameDocumentSchema.parse({ name });
  const document = await documentService.renameDocument(organizationId, documentId, validated.name);
  revalidatePath("/documents");
  return document;
}

// --- Suppression d'un document ---

export async function deleteDocumentAction(documentId: string) {
  const { organizationId } = await requireMember();
  await documentService.deleteDocument(organizationId, documentId);
  revalidatePath("/documents");
}

// --- URL signee ---

export async function getSignedUrlAction(documentId: string) {
  const { organizationId } = await getAuthContext();
  return documentService.getSignedUrl(organizationId, documentId);
}
