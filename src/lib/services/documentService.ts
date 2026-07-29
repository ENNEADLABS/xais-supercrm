import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { EntityType, Document } from "@/types/database";
import type { UploadDocumentInput } from "@/lib/schemas/document";
import { FILE_CONSTRAINTS } from "@/lib/schemas/document";
import { escapeLike } from "@/lib/utils/format";
import * as activityService from "./activityService";

// --- Liste des documents d'une entite ---

export async function getDocuments(
  organizationId: string,
  entityType?: EntityType,
  entityId?: string,
) {
  const supabase = await createServerSupabaseClient();

  let query = supabase.from("documents").select("*").eq("organization_id", organizationId);

  if (entityType && entityId) {
    query = query.eq("entity_type", entityType).eq("entity_id", entityId);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) throw error;
  return (data as Document[]) ?? [];
}

// --- Liste paginee pour la page /documents ---

interface GetDocumentsByOrgParams {
  search?: string;
  limit?: number;
  offset?: number;
}

export async function getDocumentsByOrg(organizationId: string, params?: GetDocumentsByOrgParams) {
  const supabase = await createServerSupabaseClient();
  const limit = params?.limit ?? 50;
  const offset = params?.offset ?? 0;

  let query = supabase
    .from("documents")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId);

  if (params?.search) {
    query = query.ilike("name", `%${escapeLike(params.search)}%`);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { documents: (data as Document[]) ?? [], total: count ?? 0 };
}

// --- Document par ID ---

export async function getDocument(organizationId: string, documentId: string) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", documentId);

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Document not found");
  return data[0] as Document;
}

// --- Upload d'un document ---

export async function uploadDocument(
  organizationId: string,
  userId: string,
  file: File,
  metadata: UploadDocumentInput,
) {
  // Validation taille et type MIME
  if (file.size > FILE_CONSTRAINTS.maxSize) {
    throw new Error(`Fichier trop volumineux (max ${FILE_CONSTRAINTS.maxSize / 1024 / 1024} Mo)`);
  }

  const allowedTypes: readonly string[] = FILE_CONSTRAINTS.allowedMimeTypes;
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Type de fichier non autorise : ${file.type}`);
  }

  // Generer le chemin de stockage
  const entityFolder = metadata.entity_type ?? "general";
  const entityIdFolder = metadata.entity_id ?? "unlinked";
  const uniqueId = crypto.randomUUID();
  const storagePath = `${organizationId}/${entityFolder}/${entityIdFolder}/${uniqueId}-${file.name}`;

  const supabase = await createServerSupabaseClient();

  // Upload vers Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) throw uploadError;

  // Inserer les metadonnees en base
  const { data, error: insertError } = await supabase
    .from("documents")
    .insert({
      organization_id: organizationId,
      name: metadata.name,
      storage_path: storagePath,
      mime_type: file.type,
      size_bytes: file.size,
      entity_type: metadata.entity_type ?? null,
      entity_id: metadata.entity_id ?? null,
      uploaded_by: userId,
    })
    .select("*");

  if (insertError) {
    // Nettoyage du fichier uploade en cas d'erreur d'insertion
    await supabase.storage.from("documents").remove([storagePath]);
    throw insertError;
  }

  if (!data || data.length === 0) throw new Error("Document creation failed");
  const document = data[0] as Document;

  // Log d'activite si rattache a une entite
  if (metadata.entity_type && metadata.entity_id) {
    await activityService.log(organizationId, {
      entityType: metadata.entity_type as EntityType,
      entityId: metadata.entity_id,
      action: "document_uploaded",
      actorId: userId,
      metadata: { document_id: document.id, name: metadata.name },
    });
  }

  return document;
}

// --- Renommer un document ---

export async function renameDocument(organizationId: string, documentId: string, name: string) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("documents")
    .update({ name })
    .eq("organization_id", organizationId)
    .eq("id", documentId)
    .select("*");

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Document not found");
  return data[0] as Document;
}

// --- Suppression d'un document ---

export async function deleteDocument(organizationId: string, documentId: string) {
  const supabase = await createServerSupabaseClient();

  // Recuperer le document pour le storage_path et le log
  const doc = await getDocument(organizationId, documentId);

  // Supprimer du Storage
  const { error: storageError } = await supabase.storage
    .from("documents")
    .remove([doc.storage_path]);

  if (storageError) throw storageError;

  // Supprimer de la table
  const { error: deleteError } = await supabase
    .from("documents")
    .delete()
    .eq("organization_id", organizationId)
    .eq("id", documentId);

  if (deleteError) throw deleteError;

  // Log d'activite si rattache a une entite
  if (doc.entity_type && doc.entity_id) {
    await activityService.log(organizationId, {
      entityType: doc.entity_type as EntityType,
      entityId: doc.entity_id,
      action: "document_deleted",
      metadata: { document_id: documentId, name: doc.name },
    });
  }
}

// --- URL signee pour telecharger un document ---

export async function getSignedUrl(organizationId: string, documentId: string, expiresIn = 3600) {
  const supabase = await createServerSupabaseClient();
  const doc = await getDocument(organizationId, documentId);

  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(doc.storage_path, expiresIn);

  if (error) throw error;
  if (!data?.signedUrl) throw new Error("Failed to create signed URL");

  return data.signedUrl;
}
